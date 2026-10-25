# Creditbro

A text-first credit and money companion for college students. Understand your credit, remember bills, review spending, and plan bigger events such as moving into an apartment.

## Included

- `backend/`: working local messaging coach and private dashboard; deterministic calculators, reminder scheduling, report PNG rendering, CRS, Nessie and CREAO integrations
- `website/`: React/TypeScript pitch site with an interactive design tour and separate server-side Claude chat
- `design/`: exported Figma brand assets, design tokens and node references
- [Sponsor guide](docs/SPONSORS.md): separate notes for CRS, CREAO, Capital One/Nessie, Anthropic, Figma and Codex

The demo uses fictional Nessie banking data and an official fictional CRS P03 sandbox persona. They are separate sources, not a verified identity match. No real bank/email account, payment execution, credit application, employment screening or investment execution is included.

## Quick start

Requires Node.js 22.13+ and Python 3. Install Python packages in a virtual environment where needed.

```sh
python3 -m pip install -r requirements.txt
npm test
npm run demo
cd website
npm ci
npm run dev
```

The website normally runs at http://127.0.0.1:5173. The offline backend demo makes no provider calls and sends no phone messages. It creates an initial apartment plan and updates the same project after a fictional budget change. Set `CREDITBRO_PYTHON` to another Python executable if Pillow is installed there.

## Optional website chat

Create an ignored `website/.dev.vars` with your own server-only settings, then restart the website:

```text
ANTHROPIC_API_KEY=your-own-key
ANTHROPIC_MODEL=your-available-model-id
```

The website asks consent before sending fictional messages to Anthropic. Its chat cannot access the texting worker, financial accounts, reminders or CREAO. No credentials are included.

## Local backend and texting

BlueBubbles requires a Mac signed into Messages and a consenting second test contact. Messages come from the Mac's Apple messaging identity; this is not a dedicated SMS number. The Mac must remain awake. Provider acceptance is not proof of delivery.

Runtime files default to `~/.creditbro`. Override with `CREDITBRO_RUNTIME_DIR`; provider settings default to `~/.creditbro/settings`, override with `CREDITBRO_SETTINGS_DIR`. These files stay outside the repository.

Create private settings yourself:

- Runtime `Anthropic-Setup.txt`: `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL`
- Runtime `BlueBubbles-Setup.txt`: `BLUEBUBBLES_PASSWORD`, `BLUEBUBBLES_TEST_CONTACT`
- Runtime `CREAO-Setup.txt`: `CREAO_API_KEY`, `CREAO_AGENT_ID`
- Settings `Nessie-Setup.txt`: `NESSIE_API_KEY`, optional `NESSIE_ACCOUNT_ID`
- Settings `CRS-Setup.txt`: `CRS_USERNAME`, `CRS_PASSWORD`

Never put credentials or real identity/account numbers into chat. Obtain CRS access and sanctioned fictional test-persona instructions from the sponsor. `backend/examples/crs-official-p03.json` preserves the official request structure with identity values redacted. Obtain the sponsor-provided fictional persona JSON, store it outside Git, and set `CREDITBRO_CRS_PERSONA_FILE` to its absolute path before a live sandbox call. The adapter refuses to send placeholder identity values.

```sh
node backend/bridge.mjs --enable --hold-delivery
```

This starts standby mode: no incoming turns, automatic plans, schedules or phone sends run. Remove `--hold-delivery` only for intentional testing with the approved consenting contact. YES consent activates coaching; STOP cancels pending work. Do not publicly expose the personal BlueBubbles server.

```sh
npm run dashboard
```

The private dashboard runs on localhost:3000, with a one-time access code in the runtime `imessage-state` directory. A fresh clone has no saved conversation or banking state. Start and consent to a test conversation to populate it; the website provides a visual demo without credentials.

## How it works

Messages → BlueBubbles → host tools → Claude. Host code owns arithmetic, consent, encryption, schedules, cancellation, deduplication and delivery state. Nessie supplies fictional account activity. CRS supplies dated fictional credit evidence. Authorized project facts go to CREAO for validated plan proposals. A Python renderer creates PNG reports from calculated totals. The dashboard reads the saved reports, facts and plans. The pitch website is separate and cannot send phone messages.

## Limits

- Nessie bill reads currently fail for the existing one-time demo bill because `recurring_date` and `upcoming_payment_date` are missing. The creation receipt is historical, not proof of current bill status. Failed refreshes preserve stale known records.
- Nessie does not supply card limits or issuer due dates. Manually authored demo terms are labeled separately.
- CRS is sandbox-only; no real bank or email OAuth is connected.
- Plans are proposals. Task completion and payment streaks are not fabricated.
- Figma phone-number/OTP screens are designs; the working private dashboard uses a local one-time access code.

## Links

- [Final Figma design](https://www.figma.com/design/SSbeTrYNnD5PR5s5Noafmh?node-id=175-107)
- [Prototype](https://www.figma.com/proto/SSbeTrYNnD5PR5s5Noafmh?node-id=175-631&starting-point-node-id=175%3A631)
- [Pitch website](https://creditbro-college-demo.kmiller13524.chatgpt.site): currently owner-private, not an anonymous judge link

No private chats, raw report responses, phone contacts, credentials, encryption keys or runtime state belong in this repository. Review sponsor requirements and access before submitting to Devpost.
