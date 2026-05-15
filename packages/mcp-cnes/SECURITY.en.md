# Security Policy

**[🇧🇷 Português (BR)](./SECURITY.md) · 🇺🇸 English**

---

## Supported versions

| Version | Security support |
|---------|-----------------|
| 0.x.x latest | ✓ Active |
| < latest     | ✗ |

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

This MCP does not process patient data (PHI/PII). Exposed data is public from CNES/DATASUS.

Professional CPFs are masked by default (`privacy-first`).

In-scope vulnerabilities:
- SQL injection via tool inputs
- Path traversal in the sync script
- Dependencies with known CVEs
- CPF leakage via `MCPASSURE_LGPD_ALLOW_PII` misconfiguration

## Responsible disclosure

After mitigation, we disclose publicly via CVE where applicable.
