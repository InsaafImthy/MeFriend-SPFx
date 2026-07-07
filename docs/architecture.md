# Architecture

## High-Level Architecture

```text
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

The Madhyamam / MeFriend system extends an existing Dynamics 365 Business Central implementation with a SharePoint-hosted SPFx frontend and a separately deployed .NET Web API backend.

## Frontend Responsibility

The SPFx frontend is responsible for:

- Rendering the business application inside SharePoint.
- Providing reusable React TypeScript UI components.
- Composing module screens using configuration-driven tables, filters, forms, dashboards, details, financial summaries, and related-record sections.
- Calling only the MeFriend .NET API through a centralized SPFx API client.
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

The frontend must be one reusable business application framework, not five separate mini applications.

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
