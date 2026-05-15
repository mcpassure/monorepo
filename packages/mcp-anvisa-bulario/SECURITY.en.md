# Security Policy

**[🇧🇷 Português (BR)](./SECURITY.md) · 🇺🇸 English**

---

## Supported versions

| Version | Supported |
|---------|-----------|
| 2.x.x latest | ✓ |
| < latest     | ✗ |

## Reporting a vulnerability

**Do not open public issues for security vulnerabilities.**

Send an e-mail to: `security@mcpassure.com.br`

Include:
- Vulnerability description
- Steps to reproduce
- Potential impact
- Affected version

## Expected response time

- HIGH/CRITICAL: 7 days
- MEDIUM: 30 days
- LOW: best-effort

## Scope

- This MCP server does not process, store, or log personal data (PHI/PII)
- Queries only public data from the ANVISA Electronic Drug Information Database (Bulário Eletrônico)
- The SQLite cache stores only public API responses, no user data

In-scope vulnerabilities:
- SQL injection via tool inputs
- Dependencies with known CVEs
- Unexpected Playwright/Chromium behavior at runtime

## Responsible disclosure

After mitigation, we disclose publicly via CVE where applicable.
