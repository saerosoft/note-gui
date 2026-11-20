# Security Policy

## Supported Versions

Security fixes are applied on the `main` branch of `saerosoft/note-gui`. Older commits are not backported.

| Version | Supported |
| --- | --- |
| `main` (latest commit) | Yes |
| Historical commits | No |

## Reporting a Vulnerability

Please do **not** report undisclosed security vulnerabilities through public GitHub issues, pull requests, or discussions.

Use GitHub's [private vulnerability reporting](https://github.com/saerosoft/note-gui/security/advisories/new) for this repository to submit a report confidentially. If you cannot use GitHub Security Advisories, contact the maintainers privately at `tinywind@saerosoft.com` or `help@saerosoft.com`.

When reporting an issue, please include as much of the following as possible:

- Affected component and commit SHA
- Reproduction steps or minimal proof of concept (do not attach real credentials, API keys, tokens, or personal/customer data)
- Description of the potential security impact and any suggested mitigation

## Response Process

- We aim to acknowledge receipt of a vulnerability report within 7 days.
- Validated issues are tracked privately through a GitHub Security Advisory while a fix is prepared and verified on `main`.

## Scope

`note-gui` is the public Docmost fork for the Knowledge Engine note GUI.

### Components

- Frontend client & adapters (`/`, pnpm / TypeScript)

### In scope

- XSS, HTML/Markdown sanitization bypasses, or unsafe URL/content handling in the note editor and viewer
- Authentication/session or backend adapter isolation bugs in `note-gui`
- Vulnerabilities in dependencies or container/workflow configurations affecting `main`

### Out of scope

- Vulnerabilities in third-party services outside this repository
- Issues requiring unauthorized physical access or compromised operator environments
