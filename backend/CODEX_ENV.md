# Codex Environment Settings (copy/paste)

## Setup script (Manual)
Use this exact script:

```bash
set -e
cd backend
npm install
npm run verify
```

## Maintenance script
Use this exact script:

```bash
set -e
cd backend
npm run verify
```

## Toggles
- Container caching: **ON**
- Agent internet access:
  - **ON** for the first environment creation (to install npm deps)
  - switch to **OFF** after setup succeeds
- Domain allowlist: **Common dependencies** (if setup fails, temporarily use **All unrestricted** to seed, then revert)
- Allowed HTTP methods (gateway/proxy setting): **GET, HEAD, OPTIONS**
