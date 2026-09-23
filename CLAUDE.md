# banking-access-index-mcp — project configuration

MCP server over the **Global Solo Banking Access Index**: what 19 US business banking providers
publish about applicants who are not US tax residents but own a US LLC, across 8 countries.
**GS's first public repo** (2026-09-22). MIT server code over a CC-BY-4.0 dataset.

**This repo owns the server, not the data.** The dataset's source of truth is
`~/Projects/global-solo/app/src/data/banking-access-index.json`, published at
`https://www.globalsolo.global/data/banking-access-index.json`. Corrections to any claim go
through the GS repo and its `.claude/rules/vendor-claims.md` — never edited here.

## Three things that must not be broken

1. **Never compute a claim count.** The dataset's 239 is the number that survived an adversarial
   re-verification pass (of 268 mined) and is *deliberately* not incremented when later
   single-pass dimensions are added. Counting the JSON yourself publishes a second figure under a
   different rule. Quote `methodology` instead; that string states the number in context.
2. **`restrict_kind` and `unknown_kind` are carried, never flattened into `status`.** The
   methodology is explicit that the reader outcome is identical across the three `restrict_kind`
   values while the provenance is not, and the dataset is about the provenance. Collapsing them
   removes the reason this server exists.
3. **FROZEN voice applies to every user-visible string** — tool titles, descriptions, notes,
   README. Banned: should, must, recommend, consider, ensure, guarantee, will prevent, will avoid,
   will solve, is illegal, is compliant, is fraud, most people, typically, best practice. Absence
   from a prohibited list is never rendered as acceptance. Check:
   `grep -oniE "\b(should|must|recommend|consider|ensure|guarantee|typically|best practice)\b" src/*.ts README.md`

## Commands

```bash
npm run build         # tsc → dist/
npm run typecheck     # tsc --noEmit
node dist/index.js    # run over stdio

node scripts/submit-pr.mjs        # push + verify npx install + fork + open the PR
node scripts/open-pr.mjs          # open the PR alone, via the API (idempotent)
node scripts/add-glama-badge.mjs  # add the Glama badge to the PR; gates on the server page + badge TEXT
node scripts/disclose.mjs         # prepend the affiliation disclosure to our PR body
```

⚠️ **The scripts run in Jett's own terminal, not in the agent sandbox** — they need `gh`, which
cannot reach the macOS keychain from inside the sandbox and reports a working token as invalid.

## Directory listing status

- **PR [#14903](https://github.com/punkpeye/awesome-mcp-servers/pull/14903)** — open, waiting on a
  maintainer. The Glama prerequisite (Dockerfile + start-and-introspect check + score badge in the
  entry) was **cleared 2026-09-23**: listed, rated **C**, badge on line 2574.
- ⚠️ **Never gate on the Glama badge's status code.** That endpoint returns 200 for any path and
  serves a placeholder reading "This MCP server is not listed on Glama" — a status-code check would
  push a badge announcing the thing it was meant to prevent. Gate on the server page (200 vs 404)
  and the badge body text, and run the nonsense-repo negative control after touching it.
- Placement in that README was decided by **merge behaviour** (#14491 appended at the end of
  Finance & Fintech), not by CONTRIBUTING's stated alphabetical rule, which that section has
  drifted out of.
- **npm is deliberately unpublished.** bypass-2FA tokens lose direct publishing 2027-01, so
  `npx github:…` was made to work instead (the `prepare` script). If npm reach is ever wanted, the
  durable path is Trusted Publishing via GitHub Actions OIDC.

## Conventions

TypeScript strict + ESM · conventional commits · `data/banking-access-index.json` is a **snapshot**
refreshed by copying the GS public export, and the server prefers the live URL and reports which
one answered as `provenance.origin`.
