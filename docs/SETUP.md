# Running Creditbro

Run commands from the repository root unless a step says otherwise.

## Quick start

Requires Node.js 22.13+ and Python 3. Install Python packages in a virtual environment where needed.

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

Never put credentials or real identity/account numbers into chat. Obtain CRS access and sanctioned fictional test-persona instructions from the sponsor. [`backend/examples/crs-official-p03.json`](../backend/examples/crs-official-p03.json) preserves the official request structure with identity values redacted. Obtain the sponsor-provided fictional persona JSON, store it outside Git, and set `CREDITBRO_CRS_PERSONA_FILE` to its absolute path before a live sandbox call. The adapter refuses to send placeholder identity values.

```sh
node backend/bridge.mjs --enable --hold-delivery
```

This starts standby mode: no incoming turns, automatic plans, schedules or phone sends run. Remove `--hold-delivery` only for intentional testing with the approved consenting contact. YES consent activates coaching; STOP cancels pending work. Do not publicly expose the personal BlueBubbles server.

```sh
npm run dashboard
```

The private dashboard runs on localhost:3000, with a one-time access code in the runtime `imessage-state` directory. A fresh clone has no saved conversation or banking state. Start and consent to a test conversation to populate it; the website provides a visual demo without credentials.

## CREAO agent configuration

Install or inspect the [Creditbro CREAO agent](https://agent.creao.ai/install/7c1f7506-2488-4564-8935-f3b1ee54666d?version=355fc713-1625-4c8c-bfd8-3b4d7cd0c113).

Use this agent ID in your private runtime `CREAO-Setup.txt` alongside your own scoped `CREAO_API_KEY`:

```text
CREAO_AGENT_ID=7c1f7506-2488-4564-8935-f3b1ee54666d
```

The install URL identifies the shared agent version; it is not an API endpoint or a completed-run receipt. If installing creates a separate agent in your account, use the ID and scoped key for that installed agent. The backend reads configuration from the private runtime file; this repository does not change an existing running worker's settings.
