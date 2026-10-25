# Creditbro demo website

The pitch website presents Creditbro's text-first experience through supplied Figma exports, interactive design previews, and an optional isolated Claude conversation.

## Run

Requires Node.js 22.13 or newer. From the repository root:

```sh
cd website
npm ci
npm run dev
```

Open `http://localhost:5173`. To build, run `npm run build` from this directory.

## Optional Claude chat

Copy `.dev.vars.example` to `.dev.vars` and supply your own server-only `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`. Restart the dev server. Never commit the populated file. The visual tour works without credentials; model requests may incur charges.

This chat is isolated from the messaging backend. It cannot access accounts, schedule texts, retrieve credit reports, or execute CREAO plans. Reminder confirmation in the tour is simulated. Home screens are interactive design previews; Library and You are linked through Figma.

## Source map

- `app/page.tsx`: landing page, chapters, and chat interface
- `app/globals.css`: styling and responsive layout
- `components/dashboard-preview.tsx`: Home view switching and report details
- `public/assets/final/`: supplied Figma exports
- `public/assets/figtree.ttf`: local Figtree font
- `lib/voice.ts` and `lib/creditbro-voice.txt`: coaching instructions
- `app/api/chat/route.ts`: server-side Anthropic request

## Deployment

The site runs on React/TypeScript, Vinext/Vite, and Cloudflare Workers. It requires a server runtime, not just static-file hosting. The shared source has no existing Sites project ID. Configure a new deployment and runtime secrets for your own copy; repository access does not grant access to a hosted site's secrets or change its audience. Use the Sites workflow when deploying through that plugin.

See the [repository README](../README.md) for sponsor integrations and the [setup guide](../docs/SETUP.md) for the separate messaging backend.
