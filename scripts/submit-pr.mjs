#!/usr/bin/env node
// Runs in Jett's own terminal, where `gh` is authenticated (the agent's sandbox cannot
// reach the macOS keychain, so gh is tokenless there). One command does the whole job.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO = 'global-solo/banking-access-index-mcp';
const LIST = 'punkpeye/awesome-mcp-servers';
const SECTION = 'finance--fintech';

const ENTRY = `- [${REPO}](https://github.com/${REPO}) 🎖️ 📇 ☁️ 🏠 🍎 🪟 🐧 - Which US business banking providers accept non-US-resident founders of US LLCs: 19 providers × 8 countries (IN·CN·UK·CA·PK·NG·TR·BR), every cell carrying its source URL and the date that URL was read. Country cells are tri-state and absence from a prohibited list is never converted into acceptance — \`restrict_kind\` says how a restriction is evidenced (named on a list / deduced from a closed eligibility list / a blanket residency rule naming no country) and \`unknown_kind\` says why a cell is unknown, both carried through rather than flattened into the status. 239 of 268 mined claims survived an adversarial re-verification pass; the rest were discarded. CC BY 4.0, archived with a DOI. \`npx github:${REPO}\``;

const sh = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'], ...opts }).trim();
const step = (n, s) => console.log(`\n\x1b[1m[${n}]\x1b[0m ${s}`);

// ---------------------------------------------------------------- 1. push
step(1, 'Pushing the `prepare` commit');
process.chdir(new URL('..', import.meta.url).pathname);
sh('git', ['push', 'origin', 'main']);
console.log('   pushed:', sh('git', ['rev-parse', '--short', 'HEAD']));

// ---------------------------------------------------------------- 2. prove the install line
step(2, `Verifying \`npx github:${REPO}\` actually installs and starts`);
const probe = mkdtempSync(join(tmpdir(), 'baix-probe-'));
writeFileSync(join(probe, 'package.json'), '{"name":"probe","private":true}');
sh('npm', ['install', `github:${REPO}`, '--no-audit', '--no-fund'], { cwd: probe });
const bin = join(probe, 'node_modules', '.bin', 'banking-access-index-mcp');
const req = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'probe', version: '0' } } });
const out = execFileSync(bin, [], { input: req + '\n', encoding: 'utf8', timeout: 20000 });
if (!out.includes('banking-access-index')) throw new Error('server did not answer initialize:\n' + out.slice(0, 400));
console.log('   OK — handshake answered. prepare-on-git-install works.');

// ---------------------------------------------------------------- 3. fork + insert
step(3, `Forking ${LIST} and inserting the entry alphabetically`);
const work = mkdtempSync(join(tmpdir(), 'amcp-'));
sh('gh', ['repo', 'fork', LIST, '--clone=true', '--remote=false', '--default-branch-only'], { cwd: work });
const dir = join(work, LIST.split('/')[1]);
const branch = 'add-banking-access-index-mcp';
sh('git', ['checkout', '-b', branch], { cwd: dir });

const path = join(dir, 'README.md');
const lines = readFileSync(path, 'utf8').split('\n');
const start = lines.findIndex((l) => l.startsWith('### ') && l.includes(`name="${SECTION}"`));
if (start < 0) throw new Error(`section ${SECTION} not found — the README was restructured, stop and re-screen`);
let end = lines.findIndex((l, i) => i > start && l.startsWith('### '));
if (end < 0) end = lines.length;

if (lines.slice(start, end).some((l) => l.includes(REPO))) throw new Error('entry already present — nothing to do');

// Append at the END of the section, NOT alphabetically. CONTRIBUTING says alphabetical, but
// this section has drifted out of order (it opens Avierovich -> investorphem -> axionquant),
// and the merge behaviour is what governs: PR #14491, the last Finance & Fintech merge,
// appended immediately before the next `###` heading. Following the stated rule here would
// have dropped the entry at position 2 of 463 on a sort key nobody else is using.
let at = end;
while (at > start && lines[at - 1].trim() === '') at--;
console.log(`   section lines ${start + 1}..${end}; appending at line ${at + 1} (end of section)`);
console.log(`   after:  ${lines[at - 1]?.slice(0, 70)}`);
console.log(`   before: ${lines[at]?.slice(0, 70) ?? '(next heading)'}`);
lines.splice(at, 0, ENTRY);
writeFileSync(path, lines.join('\n'));

// ---------------------------------------------------------------- 4. PR
step(4, 'Committing and opening the PR');
sh('git', ['add', 'README.md'], { cwd: dir });
sh('git', ['-c', 'user.name=Jett Fu', '-c', 'user.email=jian.jettfu@gmail.com',
  'commit', '-m', 'Add global-solo/banking-access-index-mcp to Finance & Fintech'], { cwd: dir });
sh('git', ['push', '-u', 'origin', branch], { cwd: dir });

const body = `Adds \`${REPO}\` under **Finance & Fintech**.

**What it serves.** Which US business banking providers accept non-US-resident founders of US LLCs — 19 providers × 8 countries, every cell carrying the source URL it came from and the date that URL was read.

**Why it is not answerable from model weights.** Provider eligibility pages drift, and they are absorbed at training time undated. When this index was built, an adversarial pass re-fetched every source and discarded the claims whose quotes were absent, misread or overreached: 239 of 268 mined claims survived.

**Scope discipline.** Country cells are tri-state and absence from a prohibited list is never converted into acceptance. Two discriminators are carried through the MCP boundary rather than flattened into the status — \`restrict_kind\` (named on a published list / deduced from a closed eligibility list / a blanket residency rule naming no country) and \`unknown_kind\`.

Public GitHub repo, MIT server code, CC BY 4.0 dataset, archived with a DOI (10.5281/zenodo.21336392). Installs with \`npx github:${REPO}\`; no API key, no signup.

Appended at the end of the section, matching the placement of the most recent Finance &amp; Fintech merge (#14491). Happy to move it to a strict alphabetical position instead if you would rather the section be re-sorted.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Kyko37gmyv5Uo8inKJKKQB`;

const url = sh('gh', ['pr', 'create', '--repo', LIST,
  '--title', 'Add banking-access-index-mcp (Finance & Fintech) 🤖🤖🤖',
  '--body', body], { cwd: dir });
console.log(`\n\x1b[32m✓ PR opened:\x1b[0m ${url}\n`);
