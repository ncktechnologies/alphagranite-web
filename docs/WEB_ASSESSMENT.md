# Odyssey Tracker Web: Assessment and Implementation Plan

Assessed 2026-11-17 against branch `ui-redesign-2026-feedback` (commit `3d02abc`). Scope: `src/`, build configuration, `public/`, the `dist/` output and the GitHub workflow.

The companion documents are `BACKEND_ASSESSMENT.md` and `ODYSSEY_MOBILE_APP_PLAN.md` (backend repo, `docs/`) and `INSTALLER_APP_ASSESSMENT.md` (installer app repo, `docs/`). Backend item IDs (`BE-...`) refer to the backend document.

## 1. Summary

The web app is React 19 + Vite 7 + TypeScript with RTK Query, Tailwind 4 and Radix, about 124,000 lines across roughly 100 routes. It was built on the Metronic "demo1" template. Strict TypeScript is on, the API layer is consistent, and recent work (auto-refresh that pauses while the user edits, table state persistence, the Chicago clock handling) is thoughtful.

The main problems, in order:

| # | Finding | Effect |
|---|---|---|
| WEB-SEC-01 | Notes are rendered as raw HTML | A note containing a script runs in every viewer's browser and can steal their session |
| WEB-BUG-01 | Token refresh calls an endpoint that does not exist | Every refresh fails; users are logged out instead |
| WEB-SEC-02 | Pages are protected only by hiding menu items | Any logged-in user can open any page by URL |
| WEB-PERF-01 | The whole app ships as one 3.6 MB JavaScript file | Slow first load, worst on shop-floor tablets and phones |
| WEB-QUAL-01 | About 1,240 `any` types, 320 console calls, 12 tests | Type safety is nominal; regressions are caught by users |

Severity: **Critical** = exploitable now with serious impact; **High** = fix this sprint; **Medium** = fix this quarter; **Low** = tidy-up.
Effort: **S** = under half a day, **M** = 1–2 days, **L** = 3–5 days, **XL** = more than a week.

## 2. Phase 0: fix immediately

### WEB-SEC-01. Stored XSS in notes (Critical, S)

`src/pages/jobs/components/job-details.tsx/GraySidebar.tsx:236` renders note content with `dangerouslySetInnerHTML={{ __html: html }}`. `noteHtml()` (line 139) returns the string unchanged, and neither the web nor the backend sanitises notes. A user who saves a note such as `<img src=x onerror="...">` runs script in the browser of everyone who opens that job. Access and refresh tokens are in `localStorage`, so the script can read them, and access tokens currently never expire (BE-SEC-01).

Change:
1. If notes are plain text with links, stop using `dangerouslySetInnerHTML`. Render text nodes and turn URLs into `<a>` elements in React.
2. If some notes carry real HTML (migrated Caspio notes; see `lib/migrated-notes.ts`), sanitise with DOMPurify using a short allowlist (`b`, `i`, `br`, `p`, `ul`, `li`, `a[href]`), and add `rel="noopener noreferrer"` to links.
3. Remove `src/partials/topbar/chat-sheet.tsx` (template demo with the same pattern at lines 162 and 200) unless it is in use.
4. Add an ESLint rule that bans `dangerouslySetInnerHTML` outside one reviewed `SafeHtml` component.

Confirm: a note containing `<img src=x onerror=alert(1)>` displays as text or is stripped, and no alert appears.

### WEB-BUG-01. Token refresh calls the wrong endpoint (Critical, S)

`src/services/axiosBaseQuery.ts:126` and `src/store/api/auth.ts:79` post to `/auth/refresh`. The backend route is `/auth/refresh-token`. The call returns 404, the interceptor treats that as a failed refresh, clears storage, shows "Your session has expired" and reloads. Today this fires only after eight idle hours. When the backend adds token expiry it will fire every time a token expires.

Change:
1. Call `/auth/refresh-token`. Coordinate with BE-BUG-01, which adds an alias.
2. In the "no refresh token" branch (line 106) the redirect is commented out, so the user stays on a page where every request fails. Redirect to `/auth/signin?next=...`.
3. `isRefreshing` and `failedQueue` are module globals with `any` types. Wrap the refresh in a single shared promise so parallel 401s wait on one refresh.
4. Move the duplicated "clear session" code (three copies) into one `clearSession()` function.

### WEB-SEC-02. No route-level authorisation (High, M)

`src/routing/app-routing-setup.tsx` declares about 100 routes under one `RequireAuth`. `ProtectedRoute` is imported but every use is commented out. `JobRouteGuard` covers nine path prefixes. Everything else, including `/report/weekly-fabrication-cost`, `/report/installer-rates`, `/audit`, `/settings/roles` and `/employees`, opens for any logged-in user who types the URL. The backend does not block the data either (BE-SEC-04), so this is a real exposure today, not a cosmetic one.

Change:
1. Put the required permission next to each route in one table, for example `{ path: '/report/installer-rates', element: ..., permission: 'reports_financial' }`, and generate both the `<Route>` elements and the sidebar from it. `config/menu.config.tsx` already carries `permissionKey`; make it the single source.
2. Add a `<RequirePermission code action>` wrapper that renders a 403 page when the check fails.
3. Handle 403 responses from the API with a clear "You don't have access to this" message. Once BE-SEC-04 ships, users will start receiving them.
4. `JobRouteGuard` (`src/lib/job-route-guard.tsx:43`) calls `useJobStage()` inside an `if`, which breaks the Rules of Hooks. Use the value from the first call at the top of the component.

### WEB-SEC-03. Tokens in localStorage (High, M)

Access and refresh tokens are stored in `localStorage` (`store/slice/user.ts:73`, the axios interceptor) and the user object is persisted with redux-persist. Any XSS can read them. After WEB-SEC-01 is fixed this is defence in depth, but it is still worth doing with the backend session work (BE-SEC-09): move the refresh token to an `HttpOnly; Secure; SameSite=Strict` cookie set by the API, and keep the access token in memory only. Add a `Content-Security-Policy` header at the web server (`default-src 'self'; connect-src <api origin>; img-src 'self' data: blob: <api origin>; frame-src <api origin>`).

### WEB-SEC-04. File URLs will become signed (High, M)

File previews load `/api/v1/files/{id}/view` directly in `<img>` and `<iframe>` elements with no credentials, which works only because the backend serves files publicly (BE-SEC-03). When that closes, the web must use the signed URL returned by the API for every preview and download. Affected: `pages/jobs/components/FileGallery.tsx`, `roles/drafters/components/FileViewer.tsx`, the `fileUploads.tsx` components, `components/file-list` and `components/universal-upload`. Route every file URL through one helper (`getFileUrl(file)`) now so the switch is one change.

## 3. Phase 1: correctness bugs

### WEB-BUG-02. Calls to endpoints that do not exist (Medium, S)

`store/api/auth.ts` defines `getDashboardWidgets` (`/admin/platform/dashboard/stats`), `getRoleBasedDashboard` (`/dashboard/role-based`) and `forgotPassword` (`/users/forgot_password`). None of them exists on the backend, and no component uses their hooks. `uploadImage` captures the token once at module load (`const token = localStorage.getItem('token')` at line 23), so it sends a stale or empty token after login; the interceptor already adds the header, so delete that code. Remove the dead endpoints and their hooks.

### WEB-BUG-03. Two Redux stores (Medium, S)

`src/store/store.ts` and `src/store/index.ts` both call `configureStore`. `index.ts` is the one in use. `store.ts` registers fewer APIs and exports its own `RootState` and `AppDispatch` types, which can be imported by mistake. Delete `store.ts`.

### WEB-BUG-04. `RequireAuth` logic (Medium, S)

`src/auth/require-auth.tsx` decides on `localStorage.getItem('token')` at render time and separately calls `verify()`. A present but invalid token shows the layout and then fails every request. Drive the guard from one auth state (`loading | authenticated | anonymous`) that `verify()` sets.

`signin-page.tsx:139` navigates to the `next` query parameter. `navigate()` keeps this on the same origin, but validate that the value starts with a single `/` so it cannot be used for confusing redirects.

### WEB-BUG-05. Global `Date` patch (Medium, L)

`src/lib/app-timezone.ts` replaces `new Date()` and `Date.now()` so that local fields read America/Chicago wall-clock time when the browser is in another timezone. It is imported first in `main.tsx` and it works, but:
- third-party code (charts, calendars, token expiry checks, any future SDK) silently receives shifted instants;
- `toISOString()` and `getTime()` on these dates are wrong by the offset;
- the ambiguous hour at the end of daylight saving cannot be represented.

Target state: dates stay real instants and are formatted with `formatInTimeZone(date, 'America/Chicago', ...)` in display helpers and pickers. This depends on the backend moving to explicit offsets (BE-BUG-09). Until then, keep the patch but add tests for the two daylight-saving transitions and for a browser in a non-US timezone, and do not use `Date.now()` for anything compared with server instants.

### WEB-BUG-06. Native `confirm()` and `alert()` (Low, S)

`components/file-list/FileList.tsx:79` and `pages/settings/stone-types/stone-types-section.tsx:315,423` use `window.confirm` for deletes. Replace with the existing `AlertDialog` component so destructive actions look the same everywhere and work in embedded webviews.

## 4. Phase 2: performance

### WEB-PERF-01. Code splitting (High, M)

`dist/assets/index-*.js` is 3.6 MB uncompressed. Only two modals and the 3D model viewer are lazy. `app-routing-setup.tsx` statically imports every page.

Change:
1. Convert each route element to `React.lazy(() => import(...))` with a `<Suspense>` fallback in the layout. Group by area (jobs, shop, reports, settings, operator) so related pages share a chunk.
2. Lazy-load heavy libraries where they are used: `apexcharts` (reports only), `react-big-calendar` (shop calendar), `leaflet`, `three` and `@google/model-viewer` (file viewer only).
3. Add `build.rollupOptions.output.manualChunks` for `react`, `redux`, `radix` and `date-fns`, and remove `chunkSizeWarningLimit: 3000`, which hides the warning.
4. Add `rollup-plugin-visualizer` and set a budget: initial JavaScript under 350 KB gzipped.

Confirm: Lighthouse on a mid-range tablet profile shows time-to-interactive under 3 seconds on the login and dashboard pages.

### WEB-PERF-02. Dependencies to remove (High, S)

`package.json` lists packages that are unused or duplicated. Checked by searching imports in `src/`:

| Package | Status |
|---|---|
| `@auth0/auth0-spa-js`, `@faker-js/faker`, `formik`, `yup`, `notistack`, `react-toastify`, `react-helmet`, `path`, `vite-plugin-windicss`, `postcss-preset-env`, `@headlessui/react`, `react-collapse`, `react-inlinesvg`, `simplebar-react`, `mini-svg-data-uri`, `tanstack-table-export-to-csv` | No imports found. Remove. |
| `react-query` (v3) and `@tanstack/react-query` (v5) | One file each, alongside RTK Query. Keep RTK Query and remove both, plus the devtools. |
| `framer-motion` and `motion` | Same library under two names (2 and 10 files). Keep `motion`. |
| `react-router` and `react-router-dom` | Imports are mixed. In v7 use `react-router` only. |

Then run `npx depcheck` and `npm dedupe`. The CI installs with `--legacy-peer-deps`; fix the peer conflicts so that flag can go.

### WEB-PERF-03. Icon fonts and static assets (Medium, S)

`components/keenicons` adds 14 MB to the source tree and ships four icon families as SVG, TTF and WOFF (the SVG fonts alone are 0.8–1.7 MB each). The app also uses `lucide-react`, `@remixicon/react` and `@iconify/react`. Standardise on `lucide-react`, replace the Keenicons still in use, and delete the font files. `public/fonts` (6.5 MB) contains the full Proxima Nova download of 123 files; keep the WOFF2 weights actually used and add `font-display: swap`.

### WEB-PERF-04. Caching is turned off (High, M)

Ten of the RTK Query APIs set `keepUnusedDataFor: 0`, so every navigation back to a list refetches from scratch and shows a loading state. Auto-refresh then invalidates five APIs every 60 seconds.

Change:
1. Set `keepUnusedDataFor` to 60–300 seconds for lists and lookups, and rely on tag invalidation after mutations.
2. Reference data (stone types, colours, edges, departments, roles, employees for dropdowns) changes rarely. Cache it for the session and invalidate only when it is edited.
3. Requests with `limit: 500` or `limit: 1000` to fill dropdowns appear in 37 places (for example `autoSuggest.tsx:423` loads 1,000 FABs). Switch to the lookup endpoints in BE-PERF-05 with server-side search.
4. Auto-refresh should send `If-None-Match` once the backend supports ETags (BE-PERF-04), and move to pushed events when BE-PERF-07 is available.
5. `useAutoPermissionRefresh` polls permissions every five minutes on a separate timer. Fold it into the same refresh loop.

### WEB-PERF-05. Tables and large components (Medium, L)

`JobTable.tsx` (2,010 lines), `sales/components/Table.tsx` (1,677), `statustable.tsx` (1,553) and `shopCalendar.tsx` (1,621) each hold columns, filters, state and cell renderers in one component, so any state change re-renders everything. There is no row virtualisation and only one use of debounce in the codebase.

Change:
1. Add `@tanstack/react-virtual` to `components/ui/data-grid-table.tsx` for tables over about 100 rows.
2. Debounce every search input by 300 ms through one `useDebouncedValue` hook.
3. Define column arrays outside the component or memoise them, and move cell renderers to their own memoised components.
4. Paginate on the server everywhere. Do not fetch all rows and paginate in the browser.

### WEB-PERF-06. Delivery (Medium, S)

On the web server: serve hashed assets with `Cache-Control: public, max-age=31536000, immutable`, serve `index.html` with `no-cache`, enable brotli, and use HTTP/2. Add `<link rel="preconnect">` for the API origin in `index.html`. The favicon link declares `image/svg+xml` for an `.ico` file; fix the type.

## 5. Phase 3: interface and usability

These come from reading the components and routes, not from watching users. Check each against how staff use the screens before committing to it.

### WEB-UX-01. One table experience (High, L)

There are at least six separate table implementations (`JobTable`, the sales `Table`, `statustable`, `resurface_table`, shop `table`, `CutListTable`) with different filter bars, column behaviour and empty states. Build one `DataTable` on the existing `data-grid` components with: sticky header and first column, column show/hide and reorder saved per user (`use-table-state` already does this), saved filter presets ("My FABs", "Due this week"), a consistent empty state with a next action, skeleton rows while loading, and CSV export. Move each screen to it as it is touched.

### WEB-UX-02. Tablet and phone layouts (High, L)

Operators, templaters and installers use tablets and phones on the shop floor and on site. The role pages (`pages/operator`, `pages/installer`, `pages/templater`) are standard desktop layouts with responsive classes. For these three roles:
- touch targets at least 44 px, and primary timer actions (Start, Pause, Stop) as large fixed buttons at the bottom of the screen;
- card lists in place of wide tables under 768 px;
- sticky action bars on detail pages so Save and Complete are always reachable;
- camera capture on upload inputs (`accept="image/*" capture="environment"`).

The mobile app plan covers the native route. These changes make the web usable on a phone in the meantime.

### WEB-UX-03. Navigation and wayfinding (Medium, M)

- Add a global search (job number, FAB ID, account, job name) to the header. `cmdk` and a command palette partial are already in the project.
- `/job/details/:job_id` should show the FAB's position in the workflow as a horizontal stage tracker with the current stage, who holds it and how long it has been there.
- Four routes map to `/operator/dashboard` and several paths look historical (`/planning-status`, `/create-jobs`, `/status-job-report`). Give every page one canonical URL and redirect the old ones.
- Breadcrumbs exist (`lib/breadcrumbs.ts`); make sure every detail page has a working "back to list" link that restores the list's filters and scroll position.

### WEB-UX-04. Forms (Medium, L)

`NewFabIdForm.tsx` (1,877 lines) and `EditFabIdForm.tsx` (1,377 lines) duplicate each other. Merge them into one form with create and edit modes, shared zod schema and shared field components. For all long forms: validate on blur with the message next to the field, warn before leaving with unsaved changes (`use-tab-closing-warning` exists; use it everywhere), keep a draft in session storage, disable the submit button while saving, and focus the first invalid field on submit.

### WEB-UX-05. Feedback and errors (Medium, M)

- `axiosBaseQuery` shows a toast for every failed request, so one bad page can stack five toasts, and `JSON.stringify` output reaches users when the error is not a string. Map known error codes to plain messages, group repeated toasts, and show validation errors next to the fields.
- 404 responses are silently swallowed for every request. That is right for optional lookups and wrong for a detail page; let the caller decide.
- Use one skeleton pattern for loading in place of the mix of spinners and blank areas.
- `ErrorBoundary` exists but wraps very little. Add one per route so a rendering error in one page does not blank the app, and report errors to Sentry.
- The offline check (`!navigator.onLine`) reports false negatives on some networks. Show an offline banner from the `online`/`offline` events and let requests fail on their own.

### WEB-UX-06. Notifications (Medium, M)

The backend now has a notifications API. Add an unread badge in the header, a tray with links to the FAB or job, "mark all read", and per-event preferences on `/settings/notifications`. Use the real-time channel (BE-PERF-07) when it exists.

### WEB-UX-07. Accessibility (Medium, M)

- 105 of 117 `<img>` elements have no `alt` attribute. Add `alt=""` for decorative images and a description for the rest.
- Only 80 `aria-label` attributes exist across the app. Every icon-only button needs one.
- Stage and status are often shown by colour alone (`utils/note-utils.ts` `stageConfig`). Add text or an icon and check contrast at WCAG AA.
- Check keyboard access for the drag-and-drop shop calendar and the tables: focus must be visible, and dialogs must trap focus and return it on close.
- Add `eslint-plugin-jsx-a11y` and an axe check in the end-to-end tests.

### WEB-UX-08. Language (Low, M)

`i18n/messages/es.json` is populated (690 lines), while `ar`, `fr` and `zh` are 16-line stubs. Many page strings are hardcoded in English. If shop and install crews need Spanish, move user-facing strings in the operator, installer and templater pages into message files first, and remove the stub languages from the switcher.

### WEB-UX-09. Dashboard (Medium, M)

Make `/` role-aware: each role sees its own queue ("12 FABs waiting for you"), overdue items and today's schedule, with one tap into the work. Managers see workflow bottlenecks by stage and by age. The backend has only `GET /api/v1/dashboard` today, so this needs a role-aware dashboard endpoint (the mobile plan needs the same one).

## 6. Phase 4: code quality and maintainability

### WEB-QUAL-01. Type safety (Medium, XL)

There are about 1,240 uses of `any`, and `store/api/job.ts` is 2,848 lines of hand-written endpoints with 128 queries and mutations, many typed `any`. `tsconfig` is strict, but `any` switches the checks off where it appears.

Change: generate the API layer from the backend's OpenAPI document with `@rtk-query/codegen-openapi` once BE-ARCH-04 makes it accurate. Until then, split `job.ts` by domain (fabs, templating, drafting, shop, install, files), type the responses, and set `@typescript-eslint/no-explicit-any` to `warn` with a CI check that the count does not rise.

`axiosBaseQuery.ts` reads the environment through `(import.meta as any).env` because `"types": ["vite/client"]` is commented out in `tsconfig.app.json`. Restore it and add a typed `env.ts` that fails the build when `VITE_ALPHA_GRANITE_BASE_URL` is missing. The key in `.env` is written with a space before `=`; remove it.

### WEB-QUAL-02. Remove template code (Medium, M)

Metronic demo code is still in the tree: `config/menu.config.tsx` is 1,633 lines, most of it demo menus (Store, Public Profile, Network, Billing, NFT, Gamer), plus `partials/` (628 KB of mega-menu, chat sheet and demo cards), `pages/dashboards/demo1`, `auth/pages/signup-page.tsx`, `auth/pages/extended/tfa.tsx`, `examples/`, `pages/settings/role/role-views/exam.tsx` and `hooks/use-recaptcha-v2.ts`. Seventeen files still reference demo routes. Delete what is unused; the knip tool (`npx knip`) lists unused files and exports. This shrinks the bundle and makes the real code easier to find.

Folders named like files (`pages/jobs/components/job-details.tsx/`, `pages/jobs/roles/cost_of_stone.tsx/`) should be renamed.

### WEB-QUAL-03. Console output (Low, S)

There are about 320 `console.*` calls. Add `esbuild: { drop: ['console', 'debugger'] }` for production builds in `vite.config.ts`, and an ESLint `no-console` rule that allows `warn` and `error`.

### WEB-QUAL-04. Tests (High, L)

There are 12 unit test files, all for small `lib/` helpers. Nothing tests auth, permissions, forms or workflow screens.

Change:
1. Unit-test the refresh interceptor, permission helpers and the timezone conversion at both daylight-saving transitions.
2. Add Playwright with a small set of end-to-end flows against a seeded staging API: log in; create a job and FAB; move a FAB through templating, drafting, Sales CT and shop; start and stop a timer; open a report; confirm that a restricted role gets 403 on a restricted page.
3. Use MSW for component tests of the large forms.

### WEB-QUAL-05. CI/CD (High, M)

`.github/workflows` deploys by SSH: `git stash`, `git pull`, `npm install --legacy-peer-deps`, `npm run build` on the server, with `sudo chown` and no lint or test step. A failed build leaves the site broken or stale.

Change:
1. On pull requests: `npm ci`, `tsc --noEmit`, `eslint`, `vitest`, `vite build`, and a bundle size check.
2. Build in CI, upload `dist/` as an artifact and deploy it atomically (rsync to a release directory, then switch a symlink), so servers need neither Node nor the source.
3. Separate workflows for dev, staging and production, with environment-specific `VITE_*` values and manual approval for production.
4. Add Sentry with source maps uploaded from CI, and show the build's commit SHA in the footer.

## 7. Order of work

| Order | Items | Outcome |
|---|---|---|
| Week 1 | WEB-SEC-01, WEB-BUG-01, WEB-BUG-02, WEB-BUG-03, WEB-PERF-02, WEB-QUAL-03 | XSS closed; refresh works; dead dependencies gone |
| Weeks 2–3 | WEB-SEC-02, WEB-SEC-04, WEB-BUG-04, WEB-PERF-01, WEB-PERF-04, WEB-QUAL-05 | Routes guarded; signed file URLs; code-split bundle; CI with checks |
| Weeks 4–6 | WEB-UX-01, 02, 05, 06; WEB-PERF-03, 05; WEB-QUAL-02, 04 | One table component; usable tablet layouts; template code removed; end-to-end tests |
| Later | WEB-SEC-03, WEB-BUG-05, WEB-UX-03, 04, 07, 08, 09; WEB-QUAL-01 | Cookie sessions, timezone clean-up, generated API client, accessibility |

Changes that must ship together with the backend: WEB-BUG-01 with BE-SEC-01 and BE-BUG-01; WEB-SEC-04 with BE-SEC-03; WEB-SEC-02 item 3 with BE-SEC-04.

## 8. Not verified

- `tsc`, `eslint` and the tests were not run during this assessment (Node was not available in the review shell). Run all three first and record the baseline.
- The `dist/` folder reviewed was built on 21 October; bundle sizes may have changed since.
- Usability items in section 5 are based on reading code. Validate the priorities with a few users from each role.
