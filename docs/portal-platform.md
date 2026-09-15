# MeFriend application platform

The SPFx solution is one deployable modular application platform. Its dependency flow is `applications/<name> -> shared -> SPFx/SharePoint or an external service`. The portal selects applications and owns only application-level routes. `shared` never imports an application. The only portal file that imports application modules is `portal/config/applications.ts`, the composition registry.

```text
src/webparts/mefrienddynamics/
  portal/                       launcher, transition, registry, application routing
  shared/                       UI, design tokens, hooks, models, HTTP/auth,
                                SharePoint REST, permissions, utilities, hash links
  applications/bc-extension/    BC pages, navigation, routes, settings, models,
                                API adapters, SharePoint lists, access and approvals
  components/Mefrienddynamics   SPFx-facing React adapter
  MefrienddynamicsWebPart.ts     SPFx entry point and context provider
```

The BC application is exported by `applications/bc-extension/index.ts`. It owns its module routes in `config/moduleConfig.ts`, resolves relative routes in `utils/routeUtils.ts`, and keeps its Business Central API and SharePoint workflow services under its own `services/`. The portal resolves only the `apps/bc` prefix and passes the remaining route path to BC. Legacy bookmark roots are supplied by the BC definition rather than imported by portal routing.

The shared UI barrel at `shared/components/index.ts` exports reusable buttons, forms, tables, filters, loaders, status, error and empty states, confirmation dialogs, layout building blocks, and toasts. Shared API transport (`shared/api`) and authentication (`shared/api/authClient.ts`) take backend settings from each application; the BC URL and authentication settings remain in BC's `config/appConfig.ts`. `shared/services/sharepoint/sharePointRestClient.ts` accepts the SPFx context and web URL through its constructor. BC list names and permission records stay in BC because their schema is application-specific. The host props expose user name, page context, and SPFx clients to each application. Shared typography, color, spacing, surface, radius, and page width tokens live in `shared/styles/commonTypography.css`. Presentation locale and currency defaults live in `shared/config/platformConfig.ts`; applications can override them in formatting calls.

To create Application 2:

1. Add `applications/sales/` with an `index.ts` that exports one application definition: `id`, `name`, `description`, `iconName`, `route` (for example `apps/sales`), `defaultPath`, `enabled`, and a React `component` accepting `IPortalApplicationProps` from `shared/models`.
2. Put its pages, internal route resolver, navigation, services, models, and permission source in that folder. Its component receives `routePath` relative to its application prefix and may call `onPortalReady` after its own initial load. Use `onPortalNavigate('apps')` for the launcher.
3. Import the definition in `portal/config/applications.ts` and add it to `applications`. The launcher cards and portal route resolver use that same array. No BC file needs changing.
4. Import common UI from `shared/components`, and use `shared/api`, `shared/services/sharepoint`, `shared/hooks`, `shared/utilities`, `shared/permissions`, and the supplied SPFx context as needed. Set API authentication and URL in Sales configuration. Keep Sales endpoints, records, workflow, and roles in Sales.
5. Run `npm run build`, and review new imports for shared-to-application, application-to-portal, cross-application, or non-registry portal-to-application dependencies.

The existing `#/apps/bc` routes and BC feature behavior remain unchanged by the file move. The production build verifies source, styles, tests, and packaging. Permission, approval, Business Central API, and legacy-bookmark behavior still need functional checks in a SharePoint test site before release. The backend remains separately deployed; this refactor does not change its contract or publish either part.
