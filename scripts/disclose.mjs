#!/usr/bin/env node
// Prepends an affiliation disclosure to our own PR body.
//
// Why: the 2026-08-27 awesome-fintech rejection opened by THANKING us for clearly disclosing
// affiliation — first clause of the reply, and it cost nothing even against a CONTRIBUTING.md
// that bans self-promotion. The practice is vindicated, and PR #14903 went out without it.
// Editing our own PR body is an amendment to our submission, not a second message on the thread.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const UPSTREAM = 'punkpeye/awesome-mcp-servers';
const PR = 14903;
const DISCLOSURE =
  '_Disclosure: I maintain both the server and the dataset behind it. Submitting it here rather than waiting to be found, and happy to be judged on the same bar as anything else in the section._';

const sh = (c, a, o = {}) => execFileSync(c, a, { encoding: 'utf8', ...o }).trim();

const pr = JSON.parse(sh('gh', ['api', `repos/${UPSTREAM}/pulls/${PR}`]));
if (pr.body.includes('Disclosure: I maintain')) {
  console.log('already disclosed — nothing to do');
  process.exit(0);
}
if (pr.state !== 'open') {
  console.log(`PR is ${pr.state}, not editing it`);
  process.exit(0);
}

const payload = join(tmpdir(), 'baix-pr-body.json');
writeFileSync(payload, JSON.stringify({ body: `${DISCLOSURE}\n\n${pr.body}` }));
const res = JSON.parse(
  sh('gh', ['api', '--method', 'PATCH', `repos/${UPSTREAM}/pulls/${PR}`, '--input', payload])
);
console.log(`\n\x1b[32m✓ disclosure added:\x1b[0m ${res.html_url}\n`);
