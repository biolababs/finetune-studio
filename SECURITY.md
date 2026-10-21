# Security policy

Finetune Studio is a public, browser-only static application. Security reports
are welcome and should be handled privately.

## Supported version

Security fixes are applied to the latest commit on `main`. Older commits and
third-party deployments are not maintained by this project.

## Reporting a vulnerability

Use GitHub private vulnerability reporting from the repository Security tab.
Do not open a public issue containing exploit details, private configuration
content, credentials, or other sensitive data.

A useful report includes:

- The affected URL, file, or commit.
- Reproduction steps and expected impact.
- Browser and operating-system versions when relevant.
- A minimal proof of concept that does not expose third-party data.

## Security model

Finetune Studio intentionally has no application backend, user accounts,
database, cookies, analytics, telemetry, or training executor. Configuration
creation, import, validation, and download happen inside the current browser
tab.

The project applies these controls:

- Application JavaScript makes no network or persistent-storage requests.
- Imported YAML is size-limited and rendered only as text.
- JavaScript-special YAML keys are rejected before object construction.
- Content Security Policy blocks network connections, objects, and forms.
- The local preview server serves an explicit file allowlist, validates hosts,
  rejects unsupported methods, and binds only to `127.0.0.1`.
- GitHub Actions permissions are denied by default and granted per job.
- The deploy workflow does not persist checkout credentials.

## User responsibilities

Treat every GitHub Pages artifact as public. Do not place API keys, access
tokens, passwords, private dataset contents, or customer information in this
repository or a configuration intended for publication.

The generated YAML is a starting point, not a sandbox. Review model code,
datasets, reward recipes, and dependencies before running Liquid Finetune.
