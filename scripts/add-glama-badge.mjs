#!/usr/bin/env node
// Step 2 of the listing requirement the awesome-mcp-servers bot posted on PR #14903:
// once the server is listed on Glama, the entry line has to carry its score badge.
// Run this AFTER the Glama listing exists — it verifies the badge URL resolves before
// touching the PR, so a 404 badge never reaches the branch.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = 'global-solo/banking-access-index-mcp';
const BRANCH = 'add-banking-access-index-mcp';
const BADGE = `[![${REPO} MCP server](https://glama.ai/mcp/servers/${REPO}/badges/score.svg)](https://glama.ai/mcp/servers/${REPO})`;

const sh = (c, a, o = {}) => execFileSync(c, a, { encoding: 'utf8', ...o }).trim();

// Refuse to push a badge that does not resolve — a broken image in the entry is worse
// than no entry, and the bot's whole point is that listed servers actually work.
const code = sh('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}',
  `https://glama.ai/mcp/servers/${REPO}/badges/score.svg`]);
if (code !== '200') {
  console.error(`\n✗ badge URL returns ${code}, not 200 — the Glama listing is not live yet.`);
  console.error(`  Submit at https://glama.ai/mcp/servers and re-run once it passes checks.\n`);
  process.exit(1);
}
console.log(`badge URL: 200 OK`);

const me = sh('gh', ['api', 'user', '--jq', '.login']);
const dir = mkdtempSync(join(tmpdir(), 'glama-'));
sh('git', ['clone', '--depth=1', '--branch', BRANCH,
  `https://github.com/${me}/awesome-mcp-servers.git`, dir]);

const path = join(dir, 'README.md');
const lines = readFileSync(path, 'utf8').split('\n');
const i = lines.findIndex((l) => l.startsWith('- [') && l.includes(REPO));
if (i < 0) throw new Error('our entry is not on the branch — has the PR been rebased?');
if (lines[i].includes('glama.ai')) { console.log('badge already present — nothing to do'); process.exit(0); }

// Slot the badge between the repo link and the legend emoji, matching every other entry.
const marker = `](https://github.com/${REPO}) `;
lines[i] = lines[i].replace(marker, `${marker}${BADGE} `);
writeFileSync(path, lines.join('\n'));
console.log(`patched line ${i + 1}`);

sh('git', ['add', 'README.md'], { cwd: dir });
sh('git', ['-c', 'user.name=Jett Fu', '-c', 'user.email=jian.jettfu@gmail.com',
  'commit', '-m', 'Add Glama score badge per listing requirements'], { cwd: dir });
sh('git', ['push', 'origin', BRANCH], { cwd: dir });
console.log(`\n\x1b[32m✓ badge pushed — PR #14903 updated\x1b[0m\n`);
