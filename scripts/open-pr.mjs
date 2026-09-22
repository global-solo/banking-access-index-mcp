#!/usr/bin/env node
// The branch is already pushed to the fork with the right one-line diff; only the PR is
// missing. `gh pr create` run inside a fork clone has to infer head/base and drops into an
// interactive prompt when it cannot, which is where the previous run died. This posts the
// PR through the API instead, naming head and base explicitly, so there is nothing to infer.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const UPSTREAM = 'punkpeye/awesome-mcp-servers';
const REPO = 'global-solo/banking-access-index-mcp';
const BRANCH = 'add-banking-access-index-mcp';

const sh = (c, a, o = {}) => execFileSync(c, a, { encoding: 'utf8', ...o }).trim();

const me = sh('gh', ['api', 'user', '--jq', '.login']);
console.log(`as: ${me}`);

// Refuse to open a duplicate.
const existing = JSON.parse(
  sh('gh', ['api', `repos/${UPSTREAM}/pulls?head=${me}:${BRANCH}&state=all`])
);
if (existing.length) {
  console.log(`\nPR already exists: ${existing[0].html_url} (${existing[0].state})`);
  process.exit(0);
}

const body = `Adds \`${REPO}\` under **Finance & Fintech**.

**What it serves.** Which US business banking providers accept non-US-resident founders of US LLCs — 19 providers × 8 countries (IN·CN·UK·CA·PK·NG·TR·BR), every cell carrying the source URL it came from and the date that URL was read.

**Why it is not answerable from model weights.** Provider eligibility pages drift, and they are absorbed at training time undated. When this index was built, an adversarial pass re-fetched every source and discarded the claims whose quotes were absent, misread or overreached: 239 of 268 mined claims survived.

**Scope discipline.** Country cells are tri-state and absence from a prohibited list is never converted into acceptance. Two discriminators are carried through the MCP boundary rather than flattened into the status — \`restrict_kind\` (named on a published list / deduced from a closed eligibility list / a blanket residency rule naming no country) and \`unknown_kind\` (why a cell is unknown).

Public GitHub repo, MIT server code, CC BY 4.0 dataset, archived with a DOI (10.5281/zenodo.21336392). Installs with \`npx github:${REPO}\` — no API key, no signup.

Appended at the end of the section, matching the placement of the most recent Finance & Fintech merge (#14491). Happy to move it to a strict alphabetical position instead if you would rather the section be re-sorted.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Kyko37gmyv5Uo8inKJKKQB`;

const payload = join(tmpdir(), 'baix-pr.json');
writeFileSync(payload, JSON.stringify({
  title: 'Add banking-access-index-mcp (Finance & Fintech) 🤖🤖🤖',
  head: `${me}:${BRANCH}`,
  base: 'main',
  body,
  maintainer_can_modify: true,
}));

const res = JSON.parse(
  sh('gh', ['api', '--method', 'POST', `repos/${UPSTREAM}/pulls`, '--input', payload])
);
console.log(`\n\x1b[32m✓ PR #${res.number} opened:\x1b[0m ${res.html_url}\n`);
