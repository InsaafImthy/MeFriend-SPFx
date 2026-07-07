# Implementation Notes

## Repository Normalization

The SPFx project already exists at the repository root and is not moved during this normalization pass.

Target deployable projects:

- `mefriend-spfx`: existing SPFx frontend, currently located at repository root.
- `mefriend-api`: backend placeholder folder created for the future .NET Web API project.

## Current Source Status

- Existing SPFx web part: `src/webparts/mefrienddynamics`.
- Existing SPFx package/config files are at repository root.
- Common component, model, and service folders already exist under the SPFx web part path, but business module implementation is not added in this pass.
- No .NET solution or project files are present yet.

## Next Build Step

Create the actual .NET Web API project under `mefriend-api` in a later prompt, then wire configuration, authentication, validators, mappers, and Business Central integration services.
