# Architecture

## High-Level Architecture

```text
SharePoint Online / one SPFx web part
  MeFriend Applications Portal (launcher and application routes)
    +-- Shared platform (UI, context, API/auth, SharePoint, utilities)
    +-- MeFriend BC Extension (pages, routes, permissions, integrations)
    +-- Future application modules (their own pages, routes, integrations)

BC Extension integration:
+-------------------------------+
| SharePoint Online             |
| SPFx React TypeScript App     |
+---------------+---------------+
                |
                | HTTPS / AadHttpClient
                v
+-------------------------------+
| MeFriend .NET Web API         |
| Secure backend proxy          |
+---------------+---------------+
                |
                | OAuth Client Credentials
                v
+-------------------------------+
| Dynamics 365 Business Central |
+-------------------------------+
```

The MeFriend Applications Portal is a SharePoint-hosted SPFx platform for independent applications. The BC Extension is the first consumer and uses a separately deployed .NET API backend for Business Central integration. Future applications may use their own integrations through the shared API infrastructure.

## Frontend Responsibility

The SPFx frontend has portal, shared, and application layers. `portal/Portal.tsx` owns the SharePoint page hash and application-level routes. `portal/config/applications.ts` is the single application registry used by the launcher and router. `applications/bc-extension/components/App/App.tsx` is the BC composition root and receives a relative BC route. BC owns its module routes and navigation. The portal does not call BC APIs or run BC permission checks on its home page. See [the platform architecture](portal-platform.md) for dependency rules and Application 2 setup.

Routes are `#/` and `#/apps` for the launcher, `#/apps/bc` for the BC default module, and `#/apps/bc/<module>/...` for existing BC screens. Existing BC hash bookmarks migrate to the new prefix while preserving detail identifiers. Each future application registers its own prefix, component, and default route.

The SPFx frontend is responsible for:

- Rendering the business application inside SharePoint.
- Providing reusable React TypeScript UI components.
- Composing module screens using configuration-driven tables, filters, forms, dashboards, details, financial summaries, and related-record sections.
- Calling the BC backend through shared API transport from the BC application; future applications configure their own backend integrations.
- Keeping endpoint selection, payload adaptation, and module service calls outside React UI components.

SPFx must not call Business Central directly.

## Backend Responsibility

The .NET Web API is responsible for:

- Authenticating and authorizing frontend API requests.
- Validating incoming requests.
- Mapping frontend DTOs to backend integration models.
- Calling Business Central through server-side services.
- Returning stable API response types to the frontend.
- Isolating pending or missing Business Central API contracts behind backend service boundaries.

## Business Central Integration Responsibility

Business Central integration belongs server-side in the .NET API.

The backend must:

- Acquire OAuth tokens using client credentials.
- Store client credentials only in secure backend configuration.
- Call Business Central APIs through a dedicated HTTP client/service layer.
- Keep token values out of logs and API responses.
- Keep Business Central OData details out of React components.

## Security Rules

- SPFx must not contain Business Central client secrets.
- SPFx must not request Business Central OAuth tokens.
- SPFx must not store access tokens in localStorage or sessionStorage.
- The .NET API is the only layer that may authenticate to Business Central.
- Use user-secrets for local backend development.
- Use Azure App Service settings or Key Vault for production secrets.
- Do not log tokens, secrets, or sensitive integration payloads.

## Common Component Strategy

The frontend is one SPFx deployable solution with independent feature modules. Reusable components belong in `shared`; business pages and integration logic stay in their application module.

Common reusable components should include:

- Button
- InputField
- Dropdown
- DatePicker
- StatusBadge
- AmountDisplay
- Loader
- EmptyState
- ErrorState
- Toast or Notification
- ConfirmationDialog
- EntityTable
- EntityDashboard
- EntityFilters
- EntityForm
- EntityModal
- DetailViewLayout
- RelatedRecordsSection
- FinancialSummaryCards
- LineItemsEditor

Module pages may exist, but they should mostly compose reusable components and pass module configuration, service calls, and typed data.

## Module List

Initial modules:

- Customer Master
- Event View
- Salesperson View
- Invoice View
- Sales Order

Customer Master supports listing if available, detail view if available, creation, search, and filtering.

Event View supports listing, search, filtering, and optional detail view if available. It does not support creation or edit.

Salesperson View supports listing, search, filtering, and optional detail view if available. It does not support creation or edit.

Invoice View supports listing, detail view, search, filtering, outstanding amount visibility, paid amount visibility, remaining amount visibility, payment status visibility, invoice status visibility, and sales order reference visibility where available. It does not support creation or edit.

Sales Order supports listing, detail view, creation, header and line-item entry, and related invoice visibility.

## Related Invoices Requirement

Sales Order detail must show invoices created against that sales order.

The related invoices section must show:

- Invoice number
- Invoice date
- Total invoice amount
- Paid amount
- Outstanding amount
- Payment status
- Invoice status

If no invoices exist, display:

```text
No invoices found for this sales order.
```

Related invoice row click should open invoice detail if the route and API exist.

## Invoice Outstanding Requirement

Invoice view must show:

- Invoice number
- Customer
- Sales order reference if available
- Invoice date
- Due date if available
- Total invoice amount
- Paid amount if available
- Outstanding amount if available or calculable
- Payment status if available or calculable
- Invoice status if available

If the backend returns `totalAmount` and `paidAmount` but not `outstandingAmount`, calculate:

```text
outstandingAmount = totalAmount - paidAmount
```

If `paymentStatus` is missing:

- `outstandingAmount <= 0`: Paid
- `paidAmount > 0` and `outstandingAmount > 0`: Partially Paid
- `paidAmount <= 0` and `outstandingAmount > 0`: Unpaid
- Otherwise: Unknown

This logic belongs in the invoice service or backend mapper, not in `EntityTable`.
