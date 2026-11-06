# TStrong: the index

## About

description: The Stronghold's landing page (a hero image slot, a Chekhov quote and a weekly-newsletter sign-up form), the runtime and component scripts it loads, and an Express server that serves the folder and saves sign-ups to `subscribers.json`.
aim: To publish The Stronghold community's landing page and collect its newsletter sign-ups, as a static site or through the Express server.
numerical_result_summary: 1 page, 1 image slot (`hero-image`), 1 API route (`POST /api/subscribe`); 2 image files (`Bird Formation.png`, and `download`, a WebP) that no page references.

## Contents

- `*.html` — The site's pages: `The Stronghold.dc.html`, the landing page, and `index.html`, which redirects to it.
- `*.js` — The scripts: `support.js`, the generated runtime that renders the `.dc.html` page; `image-slot.js`, the image-slot component; and `server.js`, the Express server `npm start` runs.
- `*.json` — Data and package files: `.image-slots.state.json`, the hero slot's saved image and crop; `package.json` and `package-lock.json`, the server's Express dependency.
