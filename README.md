# Madhyamam MeFriend Business Central Extension

This repository contains the Madhyamam / MeFriend extension around an existing Microsoft Dynamics 365 Business Central implementation.

The solution is split into two deployable parts:

- SPFx React TypeScript frontend hosted in SharePoint Online.
- Secure .NET Web API backend that proxies and maps Business Central API calls.

## Project Structure

The target repository structure is:

```text
Madhyamam-MeFriend/
|-- mefriend-spfx/
|-- mefriend-api/
|-- docs/
|   |-- architecture.md
|   |-- implementation-notes.md
|   |-- api-contract-status.md
|-- README.md
```

Current repository status:

- The SPFx project already exists at the repository root.
- The existing SPFx source entry point is `src/webparts/mefrienddynamics`.
- The backend placeholder folder exists at `mefriend-api`.
- Documentation exists under `docs`.

The SPFx project has not been moved into `mefriend-spfx` in this normalization pass, because the existing frontend project is already rooted here and must not be destroyed or disrupted.

## Build And Deployment Overview

Frontend:

- Build with the SPFx toolchain from the existing repository root.
- Current build script: `npm run build`.
- Deploy the generated SPFx package to the SharePoint app catalog.

Backend:

- The .NET API project is not created yet.
- The backend will be created under `mefriend-api` in a later implementation step.
- Deploy the API separately from SPFx, for example to Azure App Service.

Integration:

- SPFx calls the .NET API only.
- The .NET API authenticates to Business Central server-side.
- Business Central payload mapping belongs in backend mappers or frontend service-layer adapters, not React UI components.

## Security Note

Business Central client secrets, OAuth client credentials, and access tokens must never be stored in SPFx source, frontend configuration, browser storage, or SharePoint-hosted assets.

Only the .NET API may request Business Central OAuth tokens. Use user-secrets locally and Azure App Service settings or Key Vault in production.
