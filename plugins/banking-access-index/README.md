# Banking Access Index — plugin

Adds the Banking Access Index MCP server to Claude Code or Codex. The index records what 19 US
business banking providers publish about applicants who are not US tax residents but own a US LLC,
across 8 countries (India, China, UK, Canada, Pakistan, Nigeria, Turkey, Brazil). Every cell
carries the source URL it came from and the date that URL was read. A country missing from a
provider's prohibited list is reported as `no_published_restriction`, never as acceptance.

The plugin holds no code of its own. It starts the server from
[global-solo/banking-access-index-mcp](https://github.com/global-solo/banking-access-index-mcp)
through `npx`, pinned to a fixed commit, so what runs is the source you can read in that repository.

## Tools

- `check_banking_access` — per-provider published status for one country, with evidence URLs and access dates
- `get_provider` — the full record for one provider across every dimension in the index
- `list_providers` — filter providers by type, non-resident stance, SSN/ITIN handling or country status
- `dataset_info` — scope, verification date, methodology and provenance

## Install

Claude Code:

```
/plugin install banking-access-index --marketplace global-solo/banking-access-index-mcp
```

Codex:

```bash
codex plugin marketplace add global-solo/banking-access-index-mcp
codex plugin add banking-access-index@global-solo
```

Dataset: CC BY 4.0, archived with a DOI ([10.5281/zenodo.21336392](https://doi.org/10.5281/zenodo.21336392)).
Plugin and server code: MIT.
