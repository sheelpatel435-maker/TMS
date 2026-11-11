# TMS Desk (static UI)

Deploy this `ui` folder to Vercel. API calls go to https://tms-t8ln.onrender.com (baked into the bundle).

## User module (current API behavior)

- `POST /api/users` is available to administrators and always creates a `COMPANY_USER`. If `user_type` is supplied, it must be exactly `COMPANY_USER`; company scope always comes from the authenticated user.
- `name`, `mobile`, and `password` are required; email is optional. Mobile follows the existing auth format (10–15 digits after normalization; optional `+91` prefix); email is validated and lowercased. Duplicate mobile/email values return `409`.
- `PUT`/`PATCH /api/users/:id` can edit a same-company `COMPANY_USER` only. `user_type`, `company_id`, and `status` are rejected. An administrator may edit their own name/password only.
- `PATCH /api/users/:id/status` activates (`1`) or deactivates (`0`) a same-company `COMPANY_USER`. Deactivation invalidates access tokens and revokes refresh tokens transactionally. `DELETE /api/users/:id` remains the deactivate alias.
- `PUT /api/user-module-access/:userId` replaces a target `COMPANY_USER`'s full permissions checklist in one transaction. Each item has `{ module_id, actions: ["can_view", ...] }`; invalid modules/actions reject the whole request. Self-assignment is forbidden.
- Current permission modules/action flags come from guarded routes: Vehicles (including vehicle types, assignments, and documents), Drivers & Helpers, Bilty, Clients: view/create/update/delete; Trips: those actions plus approve/dispatch; Trip Expenses and Trip Settlement: view/create/approve; Invoices: view/create/update/delete/approve; Payments: view/create/approve; Reports and Audit Logs: view only.
- The old one-module `POST /api/user-module-access` and per-row `DELETE /api/user-module-access/:id` endpoints are removed.
- Migration files: run `migrations/queries/20261111_find_duplicate_user_contacts.sql` and resolve any results before applying `migrations/20261111_users_contact_unique.up.sql`. Roll back with the paired `.down.sql`. Migrations have not been run by this change.
- Both compiled UI bundles (`ui/assets/index-desk.js` and `backend/public/assets/index-desk.js`) still contain the former one-module POST permission editor. Their user editor also sends `user_type`, `company_id`, and `status` when editing, and exposes user types/status that the new API no longer accepts there. The original UI source/build project is not present here, so those bundles need rebuilding/updating for the new user and checklist APIs.
- `POST /api/register` and `POST /api/auth/register` remain deprecated and return `410 Gone` after authentication/admin checks. Driver/Helper master endpoints create records in their own tables, not `users` login accounts.
