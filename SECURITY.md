# Security policy

## Reporting a vulnerability

Please use GitHub private vulnerability reporting for security issues.
Do not open a public issue containing exploit details or sensitive data.

## Security model

Finetune Studio is an anonymous public static site. It has no server API,
account system, database, telemetry, or training executor. YAML import and
generation happen inside the browser tab.

The local development server is intentionally bound to `127.0.0.1` and
rejects requests with an unrecognized `Host` header. Do not change it to a
wildcard bind for sharing; use a static preview deployment instead.
