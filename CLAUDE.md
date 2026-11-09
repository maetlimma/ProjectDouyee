# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Bun is the runtime, package manager and test runner. There is no separate frontend build step, lint script or typecheck script.

```bash
bun install                      # install dependencies
bun run dev                      # bun --watch src/index.ts, serves http://localhost:3000 (PORT env overrides)
bun run setup                    # docker compose up PostgreSQL, then run migrations
bun run admin:create <email> <password>   # create/reset an admin in database/users.json (gitignored)
bun test                         # needs PostgreSQL and TEST_ADMIN_PASSWORD
bun test tests/product-validation.test.ts # run one test file
bunx tsc --noEmit                # typecheck (tsconfig has noEmit, covers src/, public/, tests/)
```

## Architecture

A single Elysia process (`src/index.ts`) serves both the REST API and two React SPAs. There is no Vite/Webpack: `public/index.html` and `public/admin.html` are imported as Bun HTML bundles (`await import(htmlPath)`) and Bun compiles the referenced TSX on the fly. REST endpoints live in `src/routes/v1.ts` under `/api/v1`, backed by PostgreSQL (`src/db/pool.ts`, migrations in `src/migrations/`) and services in `src/services/`.

The static plugin does not actually serve files from `public/` (requests fall through to the SPA HTML), so binary files need explicit routes: `/assets/:filename` goes through `serveAsset()`, which rejects names containing path separators, and `/files/:folder/:filename` serves authenticated uploads. Public-site artwork lives in `public/assets/` and its styles in `public/site.css`, scoped under `.site` so the admin portal is unaffected.

Route order in `src/index.ts` matters: the file routes are registered before the static plugin, then the API routes, then the SPA catch-alls (`/admin`, `/admin/*` serve the admin bundle; `/` and `/*` serve the public bundle). New API routes must be added before the catch-alls.

### Two frontends
- **Public site**: `public/index.html` -> `index.tsx` -> `App.tsx` (BrowserRouter with `/`, `/products`, `/products/:id`, `/contact`). It reads `/api/products` and `/api/taxonomy`.
- **Admin site**: `public/admin.html` -> `admin.tsx` -> `adminApp.tsx` (BrowserRouter with `basename="/admin"`, routes `/login`, `/dashboard`, `/workspace`, `/settings`). The product editor is `views/AdminWorkspaceView.tsx`. It edits an existing product when the URL has `?id=`, otherwise it creates one. `views/AdminSettingsView.tsx` edits the taxonomy.
- Both SPAs share `public/i18n.tsx` (`I18nProvider`, `useI18n`, `LanguageDropdown`) and `public/index.css`, which is plain CSS with variables. Many admin strings are inline ternaries on `lang` instead of entries in the translations table.
- localStorage keys: `douyee_admin_token` holds the JWT and `douyee_lang` holds the UI language.

### Data layer
Products, series, certificate types and catalogues are stored in PostgreSQL. Admin accounts are the exception: `src/legacy-auth-store.ts` reads them from `database/users.json`, which is gitignored and created with `scripts/create-admin.ts`. Never commit that file or a default password.

The concepts below describe the older public-site product model that `ProductDetailView.tsx` still expects. Its `/api/products` endpoints no longer exist on this branch.

Key model concepts:
- All user-facing text is `MultilingualText` `{ en, zh, th }`. `getProducts()` backfills a missing `th` from `en` for `title` and `subCategory`.
- `Product.department` holds a taxonomy sector id (for example `sector-esd`). `subCategory` is stored as multilingual text, not as an id.
- `contentBlocks` are `paragraph` | `specTable` | `bulletList`. `technicalMatrix` items are `group` | `standard` | `nested`.
- Public visibility is checked at request time. A product is public only when `status === 'enabled'`, `publishAt` is unset or in the past, and `expireAt` is unset or in the future. Admin endpoints return every product.
- Paragraph HTML must go through `sanitizeHtml()` (`public/sanitizeHtml.ts`) before `dangerouslySetInnerHTML`.

### Auth
`POST /api/auth/login` checks the password with `Bun.password.verify`. On success it creates a 6-digit OTP with `crypto.randomInt`, keeps it in an in-memory `Map` for 5 minutes and prints it to the server console. `POST /api/auth/verify-otp` then issues a JWT signed with `jwtSecret` from `src/config.ts`. That secret is `JWT_SECRET`, which production requires to be at least 32 characters. Otherwise it is a random value per process. Never add a hardcoded fallback secret. In `src/routes/v1.ts`, every handler calls `actor()` to check the token by hand, so new admin routes must do the same. When `NODE_ENV === 'test'`, the login response also includes `testOtp`.

Uploads are validated by MIME type and size in `src/services/files.ts`, stored under `FILE_STORAGE_DIR` (default `storage/`, gitignored) with UUID names, and served only to authenticated requests through `/files/:folder/:filename`.

## Testing notes
- Tests import `app` from `src/index.ts` and call `app.handle(new Request(...))`.
- Integration tests need PostgreSQL running, migrations applied, and an admin created with `scripts/create-admin.ts` whose password is in `TEST_ADMIN_PASSWORD`.

## Project rules
- No emojis in code comments.
- Keep code comments short, clean and professional.
