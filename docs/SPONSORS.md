# Sponsor integrations

## CRS
`backend/crs.mjs`, `crs-report.mjs`, `evidence.mjs`: official fictional P03 requests, normalized credit-report facts, source/model separation, dated reported balances/limits and error handling. Secrets stay server-side. Credit reports, identity checks and employment screening are distinct. Record a sanctioned sandbox demonstration; do not upload raw responses or credentials.

## CREAO
`backend/pipeline.mjs`, `planning-bank.mjs`: explicit project authorization, separate planning/bank-sharing consent, asynchronous runs, source validation, numeric guards, bounded repair and stale-result suppression. An isolated live test used fictional statement/minimum balances and a demo payment date. Results are proposals, not executed financial actions. Include the agent ID and safe run-share link where required; never the API key.

## Capital One / Nessie
`backend/nessie.mjs`, `bank-report.mjs`: real API calls to fictional checking and credit-card accounts, imported income, spending, budgets and simulated bills. Weekly category totals reconcile with daily bars. Credit limits and payment deadlines are separately authored demo terms, not Nessie fields. Document the bill-read API error. No real customer bank data is connected.

## Anthropic
`backend/bridge.mjs`, `voice.md`, `host-actions.mjs`; `website/app/api/chat/route.ts`: real Claude conversations, contextual coaching, tool use and an isolated website chat. Host code owns arithmetic and execution. Prompt refinement is not model training. Verify the track's exact current requirements with organizers.

## Figma
`design/` contains exported assets/tokens and node references. The dashboard implements the final screens; the website includes interactive design previews. Preserve an honest workflow history. The supplied track asks for Figma Slides, video under three minutes, stage notes up to 200 words/stage, prototype/code links, accessible files and education verification. Do not invent tool usage or timing.

## Remaining submission work
Record the phone flow with a consenting tester; prepare the backup video and pitch; add GitHub to Devpost; verify track selections, agent/run evidence and final requirements; decide whether to make the pitch website accessible to judges. A public repository does not automatically make the site public. Do not publish private chats, contacts, account state or credentials as evidence.

The public CRS request fixture has identity values removed, including fictional SSNs. Supply the official sponsor fixture privately through `CREDITBRO_CRS_PERSONA_FILE` for a live sandbox demonstration.

## Codex / development tooling
Codex was used to implement the messaging backend, deterministic calculators, provider integrations, report renderer, dashboard, failure handling and automated tests, and to prepare the public repository and website. Claude powers conversations at runtime and was also used during design/voice iteration; Figma supplied the design handoffs. This describes actual tool use, not a claim of eligibility for a particular OpenAI/Codex prize track.

## Individual guides
- [CRS](sponsors/CRS.md)
- [CREAO](sponsors/CREAO.md)
- [Capital One / Nessie](sponsors/CAPITAL-ONE.md)
- [Anthropic](sponsors/ANTHROPIC.md)
- [Figma](sponsors/FIGMA.md)
- [Codex](sponsors/CODEX.md)
