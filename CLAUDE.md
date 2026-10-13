# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Bun is the runtime, package manager and test runner. There is no separate frontend build step, lint script or typecheck script.

```bash
bun install                      # install dependencies
bun run dev                      # bun --watch src/index.ts, serves http://localhost:3000 (PORT env overrides)
bun test                         # run all tests in tests/
bun test tests/auth.test.ts      # run one test file
bun test -t "delete"             # run tests whose name matches a pattern
bunx tsc --noEmit                # typecheck (tsconfig has noEmit, covers src/, public/, tests/)
bun run seed6432e.ts             # insert a demo product (id prod-6432e-demo) into database/products.json
```

## Architecture

A single Elysia process (`src/index.ts`) serves both the REST API and two React SPAs. There is no Vite/Webpack: `public/index.html` and `public/admin.html` are imported as Bun HTML bundles (`await import(htmlPath)`) and Bun compiles the referenced TSX on the fly. `dev.ts` is stale (it refers to nonexistent `backend/` and `frontend/` folders and Vite ports), and `test-static.ts` / `test-fullstack-serve.ts` are one-off experiments with the static plugin. None of them are part of the app.

The static plugin does not actually serve files from `public/` (requests fall through to the SPA HTML), so binary files need explicit routes: `/uploads/:filename` and `/assets/:filename` go through `serveFile()`, which rejects names containing path separators. Public-site artwork lives in `public/assets/` and its styles in `public/site.css`, scoped under `.site` so the admin portal is unaffected.

Route order in `src/index.ts` matters: the file routes are registered before the static plugin, then the API routes, then the SPA catch-alls (`/admin`, `/admin/*` serve the admin bundle; `/` and `/*` serve the public bundle). New API routes must be added before the catch-alls.

### Two frontends
- **Public site**: `public/index.html` -> `index.tsx` -> `App.tsx` (BrowserRouter with `/`, `/products`, `/products/:id`, `/contact`). It reads `/api/products` and `/api/taxonomy`.
- **Admin site**: `public/admin.html` -> `admin.tsx` -> `adminApp.tsx` (BrowserRouter with `basename="/admin"`, routes `/login`, `/dashboard`, `/workspace`, `/settings`). The product editor is `views/AdminWorkspaceView.tsx`. It edits an existing product when the URL has `?id=`, otherwise it creates one. `views/AdminSettingsView.tsx` edits the taxonomy.
- Both SPAs share `public/i18n.tsx` (`I18nProvider`, `useI18n`, `LanguageDropdown`) and `public/index.css`, which is plain CSS with variables. Many admin strings are inline ternaries on `lang` instead of entries in the translations table.
- localStorage keys: `douyee_admin_token` holds the JWT and `douyee_lang` holds the UI language.

### Data layer
`src/db.ts` is a flat-file JSON "database" in `database/` (`products.json`, `taxonomy.json`, `users.json`). Every read loads the whole file and every write rewrites it. There is no locking and no caching. `initDb()` creates missing files with defaults: an admin `admin@douyee.com` / `password123` and four default sectors. The TypeScript types for products, content blocks, matrix items and taxonomy are defined in `src/db.ts`.

Key model concepts:
- All user-facing text is `MultilingualText` `{ en, zh, th }`. `getProducts()` backfills a missing `th` from `en` for `title` and `subCategory`.
- `Product.department` holds a taxonomy sector id (for example `sector-esd`). `subCategory` is stored as multilingual text, not as an id.
- `contentBlocks` are `paragraph` | `specTable` | `bulletList`. `technicalMatrix` items are `group` | `standard` | `nested`.
- Public visibility is checked at request time. A product is public only when `status === 'enabled'`, `publishAt` is unset or in the past, and `expireAt` is unset or in the future. Admin endpoints return every product.
- The POST/PUT product body schemas in `src/index.ts` are duplicated and do not list `variants`, `downloads`, `videoUrls` or `certifications`, even though `Product` defines them. If you add a field, update both schemas.

### Auth
`POST /api/auth/login` checks the password with `Bun.password.verify`. On success it creates a 6-digit OTP, keeps it in an in-memory `Map` for 5 minutes and prints it to the server console. `POST /api/auth/verify-otp` then issues a JWT, signed with a hardcoded secret. Protected routes call `getAdminUser()` from `.derive` and check it by hand. There is no guard middleware, so every new admin route has to do the same check. When `NODE_ENV === 'test'`, the login response also includes `testOtp`.

Uploads go to `POST /api/upload` as multipart `files`. Files are written to `public/uploads/` as `<timestamp>-<sanitized name>` and are referenced by `/uploads/...` paths.

## Testing notes
- Tests import `app` from `src/index.ts` and call `app.handle(new Request(...))`. Importing that file also runs `.listen(PORT)`, so port 3000 must be free while tests run.
- Tests read and write the real `database/*.json` files. `products.test.ts` creates a product and deletes it at the end, so an aborted run can leave a stray product behind.
- `tests/i18n.test.ts` tests a local copy of the translation function, not `public/i18n.tsx`.

## Project rules (from `.agents/AGENTS.md`)
- No emojis in code comments.
- Keep code comments short, clean and professional.
