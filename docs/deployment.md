# MeFriend API Deployment

This document covers secure deployment of the MeFriend .NET API that proxies SPFx requests to Microsoft Dynamics 365 Business Central.

## Azure App Service Deployment

1. Create an Azure App Service for the .NET API.
2. Set the runtime stack to the same .NET version used by the project.
3. Deploy `mefriend-api/MeFriend.Api` from the repository root using your approved CI/CD pipeline or `dotnet publish`.
4. Set `ASPNETCORE_ENVIRONMENT` to `Production`.
5. Enable HTTPS Only on the App Service.
6. Configure application settings in Azure App Service Configuration or Key Vault references. Do not store real secrets in `appsettings.json`.
7. Restart the App Service after configuration changes.

## Required App Settings

Use double underscores for nested settings in Azure App Service:

| Setting | Description |
| --- | --- |
| `BusinessCentral__TenantId` | Entra tenant ID that hosts Business Central |
| `BusinessCentral__Environment` | Business Central environment name |
| `BusinessCentral__CompanyName` | Business Central company name |
| `BusinessCentral__BaseUrl` | Business Central API base URL |
| `BusinessCentral__ClientId` | Server-side Business Central integration app client ID |
| `BusinessCentral__ClientSecret` | Server-side Business Central integration app client secret or Key Vault reference |
| `BusinessCentral__Scope` | Usually `https://api.businesscentral.dynamics.com/.default` |
| `AzureAd__Instance` | Usually `https://login.microsoftonline.com/` |
| `AzureAd__TenantId` | Tenant ID for API authentication |
| `AzureAd__ClientId` | API app registration client ID |
| `AzureAd__Audience` | API audience/application ID URI if different from client ID |
| `Security__AllowedCorsOrigins__0` | SharePoint origin, for Madhyamam use `https://madhyamamgroup.sharepoint.com` |

For additional SharePoint origins, add `Security__AllowedCorsOrigins__1`, `Security__AllowedCorsOrigins__2`, and so on.

## Entra App Registration

Create or configure an Entra app registration for the MeFriend API:

1. Register the API app.
2. Expose an API and define the Application ID URI if required.
3. Add delegated scopes or app roles required by the SPFx client.
4. Configure the SPFx client app registration to request access to the API.
5. Ensure users or groups are assigned as required by the tenant policy.

Create or configure a separate server-side app registration for Business Central client credentials:

1. Register the integration app.
2. Create a client secret or certificate.
3. Store the secret in local user-secrets for development and Azure App Service settings or Key Vault for production.
4. Grant the app access to the required Business Central environment and company.

## Required API Permissions

The SPFx client must be allowed to call the MeFriend API scope or app role.

The server-side Business Central integration app needs only the minimum Business Central API permissions required for:

- Customer creation and lookup where available
- Event listing where available
- Salesperson listing where available
- Invoice listing/detail/outstanding data where available
- Sales order listing/detail/creation and related invoice lookup where available

Grant admin consent only after the permissions have been reviewed.

## CORS Configuration

Only SharePoint origins should be configured:

```text
Security__AllowedCorsOrigins__0=https://madhyamamgroup.sharepoint.com
```

Do not configure wildcard origins. Do not use `AllowAnyOrigin` in production.

## SPFx Backend URL Configuration

Configure the SPFx frontend to call only the deployed .NET API URL, for example:

```text
https://mefriend-api.azurewebsites.net
```

The SPFx app must not call Business Central directly, store Business Central secrets, or request Business Central OAuth tokens.

## Local Development Secrets

Use user-secrets for local development:

```bash
dotnet user-secrets init --project mefriend-api/MeFriend.Api
dotnet user-secrets set "BusinessCentral:ClientSecret" "<secret>" --project mefriend-api/MeFriend.Api
```

Set the remaining required configuration values with user-secrets or environment variables.

## Secret Rotation

Rotate Business Central client secrets on a regular schedule and immediately after suspected exposure. Add the new secret in Key Vault or App Service settings, restart the API, verify token acquisition, then remove the old secret from Entra ID.

Never log access tokens, client secrets, or full sensitive payloads during rotation or troubleshooting.
