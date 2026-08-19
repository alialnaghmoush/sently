# Security Policy

sently is a messaging library that holds provider API keys and tokens in the installing application at runtime. Treat compromised publishes and credential leaks as high severity.

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

Use [GitHub Security Advisories](https://github.com/omqkhafi/sently/security/advisories/new) for this repository so the report stays private until a fix is ready.

Include:

- Affected package version(s)
- Impact (credential exfiltration, unauthorized send, SSRF, signature bypass, …)
- Reproduction steps or a minimal proof of concept when possible

## Response targets

| Stage | Target |
| --- | --- |
| Initial acknowledgement | Within **72 hours** |
| Triage (severity / severity) | Within **7 days** of acknowledgement |
| Fix or mitigation guidance | As soon as practical; critical issues are prioritized over feature work |

These are goals, not SLAs. Complex issues may take longer; we will keep the reporter updated.

## Supported versions (security patches)

After **1.0.0**, security fixes land on the current **1.x** line (latest minor/patch). See the [stability policy](https://sently.omqkhafi.dev/docs/get-started/stability) for what is semver-frozen.

| Version | Security patches |
| --- | --- |
| `1.x` | Yes |
| `0.x` | Best effort only (pre-1.0; prefer upgrading to 1.x) |

## Release integrity

npm publishes from CI (`.github/workflows/publish.yml`) use:

- **`npm publish --provenance`** — attestations linking the tarball to this public repository and the build
- **Trusted Publishing (OIDC)** — preferred path so a long-lived `NPM_TOKEN` is not required

### One-time setup (package owner)

On [npmjs.com/package/sently](https://www.npmjs.com/package/sently) → **Settings** → **Trusted Publisher**:

1. Bind **GitHub Actions**
2. Repository: `omqkhafi/sently`
3. Workflow: `publish.yml` (`.github/workflows/publish.yml`)
4. Environment: `production` (must match the workflow `environment`)
5. Confirm the npm package repository URL matches `package.json` → `repository`

Until one OIDC publish has succeeded, CI may fall back to a repository secret `NPM_TOKEN` / `NODE_AUTH_TOKEN` if present. Remove that secret after OIDC is verified.

## Related hardening in the library

- Web Push endpoint allowlisting / SSRF checks
- Redaction of push endpoints and FCM tokens in hooks
- Webhook signature verification helpers for Supported providers
