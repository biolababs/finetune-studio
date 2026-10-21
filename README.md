# Finetune Studio

**Unofficial UI for [Liquid Finetune](https://github.com/Liquid4All/liquid-finetune).**

Finetune Studio is a browser-only configuration builder for Liquid
Finetune. It turns guided training choices into deterministic YAML that
can be downloaded and run from your own Liquid Finetune checkout.

This project is not affiliated with or endorsed by Liquid AI.

## What it does

- Provides starters for all 11 Liquid Finetune training modes.
- Generates deterministic YAML without sending data to a server.
- Performs browser preflight checks for core fields and recipe compatibility.
- Imports and downloads YAML locally in the browser.
- Produces the matching `uv run liquid-finetune ...` command.

Finetune Studio does **not** execute training. The Liquid Finetune CLI is
the source of truth for complete validation, local paths, custom rewards,
and runtime dependencies.

## Local development

Node.js 20 or newer is required. There are no runtime dependencies.

```bash
npm run dev
```

The preview server listens only on `127.0.0.1:4173`. Select another
loopback port with:

```bash
npm run dev -- --port 8088
```

Run the tests and create the static build:

```bash
npm run check
```

The deployable site is written to `dist/`.

## Publishing with GitHub Pages

The included workflow tests and builds the site before publishing the
`dist/` artifact. After creating a GitHub repository:

1. Push this project to a `main` branch.
2. Open **Settings → Pages** in the repository.
3. Set the source to **GitHub Actions**.
4. Push to `main` or run the deployment workflow manually.

Do not add secrets to the static bundle. Everything in `dist/` becomes
anonymously public.

## Privacy and security

- No API, database, authentication, cookies, analytics, or telemetry.
- No network requests from application JavaScript.
- Imported files are limited to 1 MB and remain in the current tab.
- The local preview server binds to loopback and rejects unknown hosts.
- A restrictive content security policy is supplied in the page and local
  preview headers.

See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

## Project structure

```text
index.html            Static application shell
src/app.js            Browser interactions
src/core.js           Config generation, YAML, and validation
src/styles.css        Responsive visual system
scripts/serve.mjs     Loopback-only local preview
scripts/build.mjs     Deterministic static build
tests/                Core, DOM/privacy, and artifact checks
```
