#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadDataset, provenanceFooter } from './data.js';
import type { Provider } from './types.js';

const COUNTRIES = ['india', 'china', 'uk', 'canada', 'pakistan', 'nigeria', 'turkey', 'brazil'] as const;

/**
 * The glossary travels with every answer on purpose. The distinction between
 * "absent from a restriction list" and "accepted" is the single thing this dataset
 * exists to keep separate, and a caller that drops it gets a different answer.
 */
const STATUS_GLOSSARY: Record<string, string> = {
  explicit_accept: 'The provider publishes a statement that covers applicants in this country.',
  explicit_restrict: 'The provider publishes a restriction that covers this country.',
  no_published_restriction:
    'The country is absent from the provider\'s published restriction list, and no acceptance statement was located. Absence is not an answer.',
  unknown: 'No published position was located for this country.',
};

const LIMITS = [
  'Every cell reports what a provider PUBLISHES, not what it does at underwriting. An application can be declined on grounds no published page covers.',
  'Each claim carries the URL and the date it was read. A claim can go stale between that date and now.',
  'Coverage is 19 providers across 8 countries. A provider or country not present here was not assessed, which is different from assessed-and-negative.',
];

function text(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

function summarise(p: Provider) {
  return {
    id: p.id,
    display_name: p.display_name,
    website: p.website,
    provider_type: p.provider_type,
    non_resident_stance: p.non_resident_stance,
    ssn_itin: p.residency?.ssn_itin ?? 'unknown',
    partner_banks: p.partner_banks,
    ...(p.provider_status ? { provider_status: p.provider_status, provider_status_note: p.provider_status_note } : {}),
  };
}

const server = new McpServer({ name: 'banking-access-index', version: '0.1.0' });

server.registerTool(
  'check_banking_access',
  {
    title: 'Check banking access by country',
    description:
      'Look up what each US business banking provider publishes about applicants resident in a given country. Returns the published status per provider with the source URL and access date behind it. A status of no_published_restriction means the country is absent from a published restriction list — it is not an acceptance statement.',
    inputSchema: {
      country: z.enum(COUNTRIES).describe('Country of residence of the founder.'),
      provider: z.string().optional().describe('Optional provider id to narrow to one row, e.g. "mercury".'),
    },
  },
  async ({ country, provider }) => {
    const d = await loadDataset();
    let providers = d.data.providers;
    if (provider) {
      const hit = providers.find((p) => p.id === provider.toLowerCase());
      if (!hit) {
        return text({
          error: `No provider with id "${provider}" in this index.`,
          known_ids: providers.map((p) => p.id),
          note: 'A provider absent from this index was not assessed. That is different from assessed-and-negative.',
        });
      }
      providers = [hit];
    }
    const rows = providers.map((p) => {
      const cell = p.countries?.[country];
      return {
        ...summarise(p),
        country,
        status: cell?.status ?? 'unknown',
        // Carried, not flattened: the methodology states the reader outcome is identical
        // across the three restrict_kinds while the provenance is not, and the dataset is
        // about the provenance. Dropping these collapses its whole point.
        restrict_kind: cell?.restrict_kind,
        unknown_kind: cell?.unknown_kind,
        note: cell?.note,
        evidence: cell?.evidence ?? [],
      };
    });
    const tally: Record<string, number> = {};
    for (const r of rows) tally[r.status] = (tally[r.status] ?? 0) + 1;
    return text({
      country,
      providers_assessed: rows.length,
      status_tally: tally,
      status_glossary: STATUS_GLOSSARY,
      rows,
      limits: LIMITS,
      provenance: provenanceFooter(d),
    });
  }
);

server.registerTool(
  'get_provider',
  {
    title: 'Get one provider record',
    description:
      'Return the full evidence-cited record for one provider across every dimension held in the index (entity, residency, rails, receive, card, phone/2FA, FDIC, onboarding, marketplace) plus its per-country statuses. Each claim carries its source URL and the date that URL was read.',
    inputSchema: { provider: z.string().describe('Provider id, e.g. "mercury", "wise-business", "relay".') },
  },
  async ({ provider }) => {
    const d = await loadDataset();
    const hit = d.data.providers.find((p) => p.id === provider.toLowerCase());
    if (!hit) {
      return text({
        error: `No provider with id "${provider}" in this index.`,
        known_ids: d.data.providers.map((p) => p.id),
      });
    }
    return text({
      provider: hit,
      status_glossary: STATUS_GLOSSARY,
      limits: LIMITS,
      provenance: provenanceFooter(d),
    });
  }
);

server.registerTool(
  'list_providers',
  {
    title: 'List and filter providers',
    description:
      'List the providers in the index, filtered by type, non-resident stance, SSN/ITIN handling, or by the status they carry in one specific country. Returns summary rows; use get_provider for the evidence behind any one of them.',
    inputSchema: {
      provider_type: z.enum(['fintech', 'bank']).optional(),
      non_resident_stance: z.enum(['accepts_non_residents', 'conditional', 'us_persons_only']).optional(),
      ssn_itin: z.enum(['passport_sufficient', 'itin_accepted', 'ssn_required', 'conditional', 'unknown']).optional(),
      country: z.enum(COUNTRIES).optional().describe('Filter by the status carried in this country. Pairs with `status`.'),
      status: z
        .enum(['explicit_accept', 'explicit_restrict', 'no_published_restriction', 'unknown'])
        .optional()
        .describe('Only meaningful together with `country`.'),
    },
  },
  async (args) => {
    const d = await loadDataset();
    let rows = d.data.providers;
    if (args.provider_type) rows = rows.filter((p) => p.provider_type === args.provider_type);
    if (args.non_resident_stance) rows = rows.filter((p) => p.non_resident_stance === args.non_resident_stance);
    if (args.ssn_itin) rows = rows.filter((p) => (p.residency?.ssn_itin ?? 'unknown') === args.ssn_itin);
    if (args.country && args.status) {
      rows = rows.filter((p) => (p.countries?.[args.country as string]?.status ?? 'unknown') === args.status);
    }
    return text({
      filters: args,
      matched: rows.length,
      of_total: d.data.providers.length,
      providers: rows.map((p) => ({
        ...summarise(p),
        ...(args.country
          ? { [`status_${args.country}`]: p.countries?.[args.country]?.status ?? 'unknown' }
          : {}),
      })),
      ...(args.status && !args.country
        ? { warning: '`status` was passed without `country` and had no effect — a status only exists per country.' }
        : {}),
      status_glossary: STATUS_GLOSSARY,
      limits: LIMITS,
      provenance: provenanceFooter(d),
    });
  }
);

server.registerTool(
  'dataset_info',
  {
    title: 'Dataset scope, freshness and limits',
    description:
      'Report what this dataset covers, when it was last verified, how many claims it holds, and where its methodology and DOI archive live. Read this before treating an absent claim as an answer.',
    inputSchema: {},
  },
  async () => {
    const d = await loadDataset();
    return text({
      name: d.data.name,
      description: d.data.description,
      // Derived, and only because it is a plain length. The dataset's claim count is NOT a
      // plain count -- it is the number that survived an adversarial pass, deliberately not
      // incremented for later single-pass dimensions. Recomputing one here would publish a
      // second figure under a different rule, so the methodology prose is quoted instead.
      provider_count: d.data.providers.length,
      methodology: d.data.methodology,
      dimension_provenance: d.data.dimension_provenance,
      evidence_tiers: d.data.evidence_tiers,
      countries_covered: COUNTRIES,
      providers: d.data.providers.map((p) => p.id),
      status_glossary: STATUS_GLOSSARY,
      limits: LIMITS,
      provenance: provenanceFooter(d),
    });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
