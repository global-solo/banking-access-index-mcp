export interface Evidence {
  url: string;
  tier: 'T1' | 'T2' | 'T3' | string;
  date: string;
}

export interface Claim {
  summary: string;
  evidence?: Evidence[];
  [k: string]: unknown;
}

export type CountryStatus =
  | 'explicit_accept'
  | 'explicit_restrict'
  | 'no_published_restriction'
  | 'unknown';

/** Why a cell is `unknown`. Four values, because one label was hiding four evidence states. */
export type UnknownKind =
  | 'no_policy_published'
  | 'mentioned_for_other_purpose'
  | 'absent_from_non_exhaustive_list'
  | 'conflicting_sources';

/** How a restriction is evidenced. The reader outcome is identical across all three; the provenance is not. */
export type RestrictKind =
  | 'named_on_prohibited_list'
  | 'absent_from_closed_eligibility_list'
  | 'blanket_rule_no_country_named';

export interface CountryCell {
  status: CountryStatus;
  note?: string;
  evidence?: Evidence[];
  restrict_kind?: RestrictKind;
  unknown_kind?: UnknownKind;
  pboc_register?: unknown;
}

export interface Provider {
  id: string;
  display_name: string;
  website: string;
  provider_type: 'fintech' | 'bank';
  partner_banks?: string;
  non_resident_stance: 'accepts_non_residents' | 'conditional' | 'us_persons_only';
  provider_status?: string;
  provider_status_note?: string;
  entity?: Claim;
  residency?: Claim & { ssn_itin?: string };
  rails?: Claim;
  receive?: Claim;
  card?: Claim;
  phone_2fa?: Claim;
  fdic?: Claim;
  onboarding?: Claim;
  marketplace?: Claim;
  restricted_list_url?: string;
  countries: Record<string, CountryCell>;
  caveats?: unknown;
}

/** Shape of the PUBLIC export at globalsolo.global/data/banking-access-index.json. */
export interface Dataset {
  name: string;
  description?: string;
  license?: string;
  attribution?: string;
  mined_at: string;
  verified_at: string;
  /** Prose. States the 239-of-268 survival figure in context — never recompute a claim count from it. */
  methodology?: string;
  dimension_provenance?: Record<string, unknown>;
  evidence_tiers?: Record<string, string>;
  providers: Provider[];
  evidence_appendix?: unknown[];
}
