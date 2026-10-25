# Creditbro for Netlify

This is the latest website design, packaged independently for Netlify. It contains the interactive guided demo, spending screens, reminder simulation, sponsor cards, and an optional Claude chat function. It contains no personal data, keys, messaging backend, or BlueBubbles connection.

## Share the visual demo now

Unzip `creditbro-netlify-static.zip` and drag its contents (the built `dist` folder) into Netlify Drop. The guided interactions work without keys. Live Claude chat needs the full deployment below. A static drag-and-drop deploy does not deploy functions.

## Full deployment, including optional Claude chat

Import the Creditbro GitHub repository into Netlify. Set the base directory to `netlify`, build command to `npm run build`, and publish directory to `dist`. The included `netlify.toml` configures functions and redirects. If deploying this folder as its own repository, leave the base directory blank.

For live chat, set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in Netlify's environment settings for Functions, then deploy again. Use your own key and an available model ID. Never place a key in a `VITE_` variable or source file. The visual demo works without these settings.

Alternatively, after installing dependencies, use Netlify CLI from this directory: `npx netlify deploy --build --prod`. This requires your own Netlify login and selection of the intended site.

## Local development

Node 22.13+ is required.

```sh
npm ci
npm run dev
```

`npm run dev` serves the visual frontend. To test the Netlify function locally, use `npx netlify dev` with your own environment settings.

## Demo boundaries

All account/report screens use fictional example data. Reminder confirmation is a browser-only simulation. Live chat sends submitted messages to Anthropic after the visitor agrees, but cannot access accounts, send texts, save profiles, or create CREAO plans. No visitor is connected to Katie's personal dashboard or phone. The app is educational coaching, not a bank or payment service.

The Figma design remains linked in the header and Figma sponsor card. It is useful submission evidence, not required to operate this demo.

Netlify functions documentation: https://docs.netlify.com/build/functions/get-started/

Run `npm test` for mocked function checks. These tests never call Anthropic or send messages.
