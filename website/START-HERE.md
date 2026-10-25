# Creditbro website — sister handoff

This is the latest demo/pitch website, including the final exported Figma screens, Figtree font, interactive Home previews, and the server-side Claude chat endpoint.

## Run on your computer

1. Unzip this folder.
2. Install Node.js 22.13 or newer (Node 24 LTS is suitable).
3. In Terminal, enter the extracted `Creditbro-Website` folder, then run:

```sh
npm ci
npm run dev
```

Open http://localhost:5173 in your browser. Keep Terminal running. Ctrl+C stops it.

## Optional: enable real Claude conversations

The visual website works without an API key. For live chat, copy `.dev.vars.example` to `.dev.vars` in this folder. Set your Anthropic API key and an exact model ID available to your account. Restart the dev server. These are server-only settings; never put them in browser code or commit/share `.dev.vars`. Model requests may incur charges.

No keys are included. The API key configured on Josie's hosted website does not transfer with this ZIP.

## What to edit

- `app/page.tsx`: landing page, chapters, chat interface
- `app/globals.css`: styling and responsive layout
- `components/dashboard-preview.tsx`: Home view switching and report details
- `public/assets/final/`: supplied Figma SVG/PNG exports
- `public/assets/figtree.ttf`: local font
- `lib/voice.ts` and `lib/creditbro-voice.txt`: coaching voice
- `app/api/chat/route.ts`: server-side Anthropic request and demo boundaries

## What this includes and what it does not

This is the website, not the BlueBubbles texting worker or the full Creditbro backend. CRS/Nessie/CREAO sections explain the prototype; the site previews use sample data. Reminder confirmation is simulated. The website Claude chat is isolated and cannot access accounts, schedule texts, retrieve credit reports, or run CREAO plans. Library and You link to Figma; their full screens were not supplied as exports.

## Build and deployment

```sh
npm run build
```

The stack is React/TypeScript on Vinext/Vite with Cloudflare Workers. It is not a static HTML folder; double-clicking a file will not run it. The existing Sites project identity was removed from this transferable copy to avoid publishing over Josie's site. To publish a separate copy, register a new Sites project or configure your own compatible Cloudflare deployment and set runtime secrets there. This ZIP does not grant access to the existing hosted site.

The original framework README and scripts are retained. Dependencies, generated builds, Git history, runtime state, and secrets are excluded. `package-lock.json` is included for reproducible installation.
