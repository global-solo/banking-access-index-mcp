# Banking Access Index — MCP server

An MCP server over the **Global Solo Banking Access Index**: what 19 US business banking providers
publish about applicants who are **not US tax residents** but own a US LLC, across 8 countries
(India, China, UK, Canada, Pakistan, Nigeria, Turkey, Brazil).

Every cell carries the source URL it came from and the date that URL was read.

```bash
npx banking-access-index-mcp
```

## Why this exists as a dataset

A model answering "can someone in India open a Mercury account" is drawing on provider marketing
pages absorbed at training time, undated. When the underlying index was built, an adversarial
re-verification pass re-fetched every source and discarded the claims whose quotes were absent,
misread, or overreached: **239 of 268 mined claims survived**. The 29 that did not were not edge
cases. They were provider statements that read as settled until someone opened the page again.

So the thing this server adds is not coverage. It is a **date next to each claim**, and a refusal
to convert silence into a yes.

## The status vocabulary

Country cells are tri-state, plus unknown. The distinction the whole dataset rests on:

| Status | Meaning |
|---|---|
| `explicit_accept` | The provider publishes a statement that covers applicants in this country. |
| `explicit_restrict` | The provider publishes a restriction that covers this country. |
| `no_published_restriction` | The country is absent from the published restriction list, and no acceptance statement was located. **Absence is not an answer.** |
| `unknown` | No published position was located. |

Two discriminators travel alongside, because one label was hiding materially different evidence:

- **`restrict_kind`** — `named_on_prohibited_list` · `absent_from_closed_eligibility_list` ·
  `blanket_rule_no_country_named`. The outcome for the reader is identical across all three. The
  provenance is not, and this dataset is about the provenance.
- **`unknown_kind`** — `no_policy_published` · `mentioned_for_other_purpose` ·
  `absent_from_non_exhaustive_list` · `conflicting_sources`.

Both are carried through the MCP boundary rather than flattened into the status.

## Tools

| Tool | What it returns |
|---|---|
| `check_banking_access` | Per-provider published status for one country, with evidence URLs, access dates, and both discriminators. Optionally narrowed to one provider. |
| `get_provider` | The full record for one provider across every dimension held in the index (entity, residency, rails, receive, card, phone/2FA, FDIC, onboarding, marketplace), each with its own evidence. |
| `list_providers` | Filter by provider type, non-resident stance, SSN/ITIN handling, or by the status carried in a named country. |
| `dataset_info` | Scope, verification date, the methodology prose, evidence tiers, and `dimension_provenance`. |

Every response carries the status glossary, the limits below, and a provenance block.

## Freshness

The server fetches the live dataset from
`https://www.globalsolo.global/data/banking-access-index.json` at startup and falls back to the
snapshot bundled in this package if that fetch doesn't complete. Which one answered is reported in
every response as `provenance.origin`, rather than being hidden behind a single answer.

## Limits

- Each cell reports what a provider **publishes**, not what it does at underwriting. An application
  can be declined on grounds no published page covers.
- A claim can go stale between its access date and now. The date is in the response for that reason.
- Coverage is 19 providers × 8 countries. A provider or country absent here was **not assessed**,
  which is a different thing from assessed-and-negative.
- `dimension_provenance` lists the dimensions added after the adversarial pass. Those are
  single-pass research and do not sit at the same confidence as the core.

## Source, licence, citation

- Dataset page: <https://www.globalsolo.global/data/banking-access-index>
- Archived with a DOI: [10.5281/zenodo.21336392](https://doi.org/10.5281/zenodo.21336392)
- Methodology: <https://www.globalsolo.global/about/methodology>
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — attribute as
  *Global Solo Banking Access Index*.

Server code: MIT. Dataset: CC BY 4.0.
