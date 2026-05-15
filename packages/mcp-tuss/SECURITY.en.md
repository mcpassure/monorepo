# Security Policy

**[🇧🇷 Português (BR)](./SECURITY.md) · 🇺🇸 English**

---

## Supported versions

Only the latest minor of each major receives security fixes.

| Version | Supported |
|---------|-----------|
| 0.x.x latest | ✓ |
| < latest    | ✗ |

## Reporting a vulnerability

**Do not open public Issues for security vulnerabilities.**

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

This MCP does not process patient data (PHI/PII). Exposed data consists of public ANS TUSS tables.

In-scope vulnerabilities:
- SQL injection via tool inputs
- Path traversal in the sync script
- Dependencies with known CVEs

## Responsible disclosure

After mitigation, we disclose publicly via CVE where applicable.
