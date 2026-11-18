# TStrong: the index

## About

description: The Stronghold's landing page (a hero image slot, a Chekhov quote and a weekly-newsletter sign-up form), the runtime and component scripts it loads, and an Express server that serves only the site's public files and saves sign-ups to `subscribers.json`.
aim: To publish The Stronghold community's landing page and collect its newsletter sign-ups, as a static site or through the Express server.
numerical_result_summary: 1 page, 1 image slot (`hero-image`), 1 API route (`POST /api/subscribe`); 2 image files (`Bird Formation.png` and `The Stronghold screenshot.webp`) that no page references.

## Contents

- `*.html` — The site's pages: `The Stronghold.dc.html`, the landing page, and `index.html`, which redirects to it.
- `*.js` — The scripts: `support.js`, the generated runtime that renders the `.dc.html` page; `image-slot.js`, the image-slot component; and `server.js`, the Express server `npm start` runs, which serves the 7 files in its `PUBLIC_FILES` list, the landing page at `/` and `POST /api/subscribe`, and 404s every other path (`.env`, `.private/`, the sign-up list).
- `test/` — The server's tests (`npm test`): `test/server/static-files.test.js` checks the public files are served byte for byte and secret or private paths get a 404.
- `*.json` — Data and package files: `.image-slots.state.json`, the hero slot's saved image and crop; `package.json` and `package-lock.json`, the server's Express dependency.
- `Bird Formation.png` — The hero photograph, geese flying in a V over hills at sunrise; the hero slot holds a 1200-pixel WebP copy of it.
- `The Stronghold screenshot.webp` — A screenshot of the landing page with that photograph in its hero slot.
