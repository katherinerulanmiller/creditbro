# Creditbro

**Your credit coach, one text away.**

Creditbro helps college students understand credit, build better money habits, and work toward goals such as their first apartment. Students ask questions through Messages; a companion dashboard keeps their credit context, spending reports, reminders, and plans together.

[Explore the design](https://www.figma.com/design/SSbeTrYNnD5PR5s5Noafmh?node-id=175-107) · [Figma prototype](https://www.figma.com/proto/SSbeTrYNnD5PR5s5Noafmh?node-id=175-631&starting-point-node-id=175%3A631) · [Setup guide](docs/SETUP.md) · [CRS integration](docs/CRS.md)

## The experience

1. **Start with a text.** Ask a credit question and get a short explanation grounded in the context you choose to share.
2. **Understand your numbers.** Explore credit-report facts and visual weekly or monthly spending reports.
3. **Choose your support.** Confirm a bill reminder or choose a check-in cadence. Preferences alone do not schedule a message.
4. **Work toward a goal.** Explicitly request a project, authorize the information shared for planning, and review proposed next steps.
5. **See the bigger picture.** The companion dashboard organizes Home, Library, and You alongside the text conversation.

This hackathon prototype uses official fictional CRS P03 credit reports and simulated Capital One Nessie banking data. These are separate sources, not a verified identity match or real consumer account connection.

## Sponsor integrations

### CRS — credit context for useful coaching

CRS supplies the fictional credit evidence behind the coach. The backend requests sandbox reports for Equifax, TransUnion, and Experian, then extracts selected score/model and account facts into a dated, source-labeled format. Claude can explain those facts, and authorized CREAO projects can use them as planning context. Reported balances remain distinct from current balances and payment deadlines; scores from different models are not averaged.

**Implementation:** [CRS adapter](backend/crs.mjs), [sandbox authentication](backend/crs-sandbox.mjs), [planning context](backend/pipeline.mjs). Read the [full CRS writeup](docs/CRS.md).

### CREAO — structured project planning

When a student explicitly requests a project and authorizes sharing, Creditbro sends selected facts to CREAO. The backend handles asynchronous runs, validates source references and numeric claims, and suppresses stale results before saving a proposal. Bank-summary sharing requires separate permission. Plans do not execute financial actions.

**Agent:** [Install Creditbro on CREAO](https://agent.creao.ai/install/7c1f7506-2488-4564-8935-f3b1ee54666d?version=355fc713-1625-4c8c-bfd8-3b4d7cd0c113)

```text
CREAO_AGENT_ID=7c1f7506-2488-4564-8935-f3b1ee54666d
```

**Implementation:** [Planning pipeline](backend/pipeline.mjs), [bank-sharing controls](backend/planning-bank.mjs). API keys belong in private runtime settings, never in the repository. The install link is not a completed-run share link.

### Capital One Nessie — spending and budget context

Creditbro makes API calls to fictional checking and credit-card accounts, imports transactions, and calculates spending and budget summaries. Weekly category totals reconcile with daily bars. Credit limits and payment deadlines used in scenarios are separately authored demo terms, not fields supplied by Nessie.

**Implementation:** [Nessie adapter](backend/nessie.mjs), [bank reports](backend/bank-report.mjs), [report layout](backend/report-layout.mjs).

### Anthropic — the conversation

Claude interprets requests and explains credit and money concepts in context. Host code owns arithmetic, permissions, scheduling, persistence, and message delivery. Coaching instructions and examples shape the voice; this is prompt refinement, not model training. The pitch website has a separate, isolated Claude chat.

**Implementation:** [Messaging bridge](backend/bridge.mjs), [coaching voice](backend/voice.md), [host actions](backend/host-actions.mjs), [website chat endpoint](website/app/api/chat/route.ts).

### Figma — product design and visual reports

Figma informed the onboarding, dashboard, and report designs. Exported assets, Figtree typography, and design tokens support the implementation. The website includes interactive previews of supplied screens; previews are distinct from working backend actions.

**Implementation:** [Design assets and tokens](design/), [companion dashboard](backend/dashboard.js), [website previews](website/components/dashboard-preview.tsx).

## How it works

```text
Student's Messages ↔ BlueBubbles ↔ Node.js host ↔ Claude
                                      ├── CRS sandbox credit facts
                                      ├── Nessie simulated banking activity
                                      ├── CREAO authorized project planning
                                      ├── Confirmed reminders and delivery state
                                      └── Private dashboard + Python report images
```

The host controls consent, deterministic calculations, encryption, cancellation, deduplication, and delivery state. The pitch website is a separate React/TypeScript application and cannot send phone messages.

## Repository

| Directory | Contents |
| --- | --- |
| [`backend/`](backend/) | Messaging coach, integrations, scheduler, companion dashboard, report renderer, and tests |
| [`website/`](website/) | Pitch site, interactive Figma previews, and isolated Claude chat |
| [`design/`](design/) | Exported Figma assets, tokens, and node references |
| [`docs/`](docs/) | Setup instructions and CRS integration writeup |

## Try it locally

Requires Node.js 22.13+ and Python 3. From the repository root:

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
npm test
npm run demo
cd website
npm ci
npm run dev
```

The website normally opens at `http://127.0.0.1:5173`. The offline demo creates and revises a fictional apartment plan without provider calls or phone messages. See [setup](docs/SETUP.md) for live chat, the private dashboard, and intentional texting tests.

## Demo boundaries

- BlueBubbles runs on a Mac signed into Messages, using that Mac's Apple messaging identity and a consenting test contact. It is not a dedicated Creditbro SMS number. Provider acceptance is not proof of phone delivery.
- The website's chat cannot access accounts, schedule messages, retrieve CRS reports, or start CREAO projects. Its reminder interaction is a visual simulation.
- Nessie bill retrieval currently has a known issue for the existing demo bill: required date fields are missing. A creation receipt does not establish current bill status; failed refreshes preserve stale known records.
- Credit reports are fictional sandbox data. No real bank/email OAuth, payments, credit applications, employment screening, or investment execution is connected.
- Plans are proposals. The app does not fabricate completed tasks or payment history. Figma phone/OTP screens are designs; the working dashboard uses a local one-time access code.

## Website

[Creditbro pitch website](https://creditbro-college-demo.kmiller13524.chatgpt.site) — owner-private at the time of repository preparation; access must be checked before sharing with judges. A public GitHub repository does not change the site's audience.

Credentials, private chats, contacts, raw credit reports, encryption keys, and runtime state stay outside this repository. Public CRS identity fields are redacted; live sandbox testing requires the sponsor-provided fictional fixture.
