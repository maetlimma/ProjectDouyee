# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Bun is the runtime, package manager and test runner. There is no separate frontend build step, lint script or typecheck script.

```bash
bun install                      # install dependencies
bun run dev                      # bun --watch src/index.ts, serves http://localhost:3000 (PORT env overrides)
bun run setup                    # docker compose up PostgreSQL, then run migrations
bun run admin:create <email> <password>   # create/reset an admin in database/users.json (gitignored)
bun run db:seed                  # load seed/products into storage + DB (also runs in setup and on container start)
bun run products:build           # regenerate seed/products and series artwork from reference/ (needs reference/)
bun test                         # needs PostgreSQL and TEST_ADMIN_PASSWORD
bun test tests/product-validation.test.ts # run one test file
bunx tsc --noEmit                # typecheck (tsconfig has noEmit, covers src/, public/, tests/)
```

## Architecture

A single Elysia process (`src/index.ts`) serves both the REST API and two React SPAs. There is no Vite/Webpack: `public/index.html` and `public/admin.html` are imported as Bun HTML bundles (`await import(htmlPath)`) and Bun compiles the referenced TSX on the fly. REST endpoints live in `src/routes/v1.ts` under `/api/v1`, backed by PostgreSQL (`src/db/pool.ts`, migrations in `src/migrations/`) and services in `src/services/`.

The static plugin does not actually serve files from `public/` (requests fall through to the SPA HTML), so binary files need explicit routes: `/assets/:filename` goes through `serveAsset()`, which rejects names containing path separators, and `/files/:folder/:filename` serves authenticated uploads. Public-site artwork lives in `public/assets/` and its styles in `public/site.css`, scoped under `.site` so the admin portal is unaffected.

Route order in `src/index.ts` matters: the file routes are registered before the static plugin, then the API routes, then the SPA catch-alls (`/admin`, `/admin/*` serve the admin bundle; `/` and `/*` serve the public bundle). New API routes must be added before the catch-alls.

### Two frontends
- **Public site**: `public/index.html` -> `index.tsx` -> `App.tsx` (BrowserRouter with `/`, `/about`, `/products`, `/catalogues`, `/contact`). There is no product page: a product opens as the `ProductSheet.tsx` popup, driven by the `?item=<product id>` query on any route (`ProductSheetHost` in `App.tsx`; build links with `useProductLink()`). `/products/:id` only redirects to `/products?item=:id`. Popup labels show one language at a time.
- **Admin site**: `public/admin.html` -> `admin.tsx` -> `adminApp.tsx` (BrowserRouter with `basename="/admin"`, routes `/login`, `/dashboard`, `/workspace`, `/settings`). The product editor is `views/AdminWorkspaceView.tsx`. It edits an existing product when the URL has `?id=`, otherwise it creates one. `views/AdminSettingsView.tsx` edits the taxonomy.
- Both SPAs share `public/i18n.tsx` (`I18nProvider`, `useI18n`, `LanguageDropdown`) and `public/index.css`, which is plain CSS with variables. Many admin strings are inline ternaries on `lang` instead of entries in the translations table.
- localStorage keys: `douyee_admin_token` holds the JWT and `douyee_lang` holds the UI language.

### Data layer
Products, series, certificate types, catalogues and admin accounts (`admin_user`, see `src/services/admins.ts`) are stored in PostgreSQL. Uploaded files are written to local disk under `storage/` (`FILE_STORAGE_DIR`) by `src/services/files.ts`; migration `1710000005000_drop_stored_file.js` removed the old `stored_file` table. Render's disk is not persistent, so files must be restorable. Never commit a default password.

### Product seed
The 27 products from `reference/Product_List.xlsx` (Basic, e9, ESD series) are committed in `seed/products/` (`manifest.json` plus `files/images` and `files/documents`) because `reference/` is git- and docker-ignored. `scripts/build-product-seed.ts` generates it: the sheet-row-to-PDF mapping lives in its `ROWS` table, photos are extracted from each datasheet, and the series artwork in `public/assets/series-*.jpg` is cropped from the booklet PDF. `scripts/seed-products.ts` runs on every container start: it re-copies seed files into storage, inserts each sku once (ledger table `product_seed`, so admin deletions stick) and refreshes rows still owned by `update_by = 'seed'`. Card grouping uses `product.other.model` / `other.variant` / `other.spec` / `other.sort`.

### Public catalogue API
`src/routes/public.routes.ts` (unauthenticated): `GET /api/products`, `/api/products/:id`, `/api/taxonomy` (series as sectors), `/api/media/:folder/:filename` (serves a stored file only while a product, or a certificate type linked to a product, references it), `/api/home-slides` (ordered product ids for the home slider), and `/api/catalogues` with `/api/catalogues/:id/cover` (page 1 as JPEG, shared cache in `src/services/catalogues.ts`) and `/api/catalogues/:id/pdf`. `src/services/catalog.ts` maps DB rows to the `CatalogProduct` shape in `public/catalog.ts`, including `specs` (EN/TH), `sizeWeights`, `certificates` (name + image) and `conformity`.

Popup data beyond the columns lives in `product.other`: `conformity` (`{ en: string[], th: string[] }`, the numbered Certificate box, extracted from datasheets by the seed builder and editable in the product editor). The home slider order is the `home_slide` table, edited on the admin Home Slider page; an empty table means the first 5 products with a photo.

### Auth
`POST /api/auth/login` checks the password with `Bun.password.verify`. On success it creates a 6-digit OTP with `crypto.randomInt`, keeps it in an in-memory `Map` for 5 minutes and prints it to the server console. `POST /api/auth/verify-otp` then issues a JWT signed with `jwtSecret` from `src/config.ts`. That secret is `JWT_SECRET`, which production requires to be at least 32 characters. Otherwise it is a random value per process. Never add a hardcoded fallback secret. In `src/routes/v1.ts`, every handler calls `actor()` to check the token by hand, so new admin routes must do the same. When `NODE_ENV === 'test'`, the login response also includes `testOtp`.

Uploads are validated by MIME type and size in `src/services/files.ts`, stored in the `stored_file` table with UUID names, and served only to authenticated requests through `/files/:folder/:filename` and the v1 PDF routes, using `fileResponse()`.

Deployment is described in `render.yaml` (free Docker web service plus free Postgres). The container start command runs migrations before the server.

## Testing notes
- Tests import `app` from `src/index.ts` and call `app.handle(new Request(...))`.
- Integration tests need PostgreSQL running, migrations applied, and an admin created with `scripts/create-admin.ts` whose password is in `TEST_ADMIN_PASSWORD`.

## Project rules
- No emojis in code comments.
- Keep code comments short, clean and professional.

## Dev skill config

### Verification
- Launch: `bun run dev` from the repo root (needs the Docker PostgreSQL from `bun run setup`). Port 3000.
- Readiness: `GET http://localhost:3000/` returns 200.
- App URL: http://localhost:3000 (public site), http://localhost:3000/admin (admin portal).
- Login: public pages need none. Admin uses email + password then an OTP printed to the server console; ask the user to sign in, never type credentials.
- UI change paths: `public/**` (except `public/assets/**` alone).
- Stop: kill the PID of the `bun` process started for the run; never kill every bun process.
- Data: local Docker PostgreSQL, shared with integration tests. No emails are sent.

## Known Pitfalls

### page-flip cannot be destroyed cleanly

**Symptom**: Every reopen of the brochure modal adds another animation loop, and a destroyed book keeps redrawing.

**Cause**: `PageFlip.destroy()` calls `block.remove()` on the root element passed to the constructor, which removes a React-owned node if one was passed. Its `Render.start()` `requestAnimationFrame` loop (`node_modules/page-flip/src/Render/Render.ts`, around line 137) is never cancelled, and `destroy()` does not stop it.

**Fix**: Create the root `div` imperatively inside the effect and append it to a React-owned host. Create the book once and keep it mounted, hiding it with CSS, instead of recreating it per open. On cleanup, call `destroy()` and replace the render method with a no-op.

```ts
const block = document.createElement('div');
hostRef.current.appendChild(block);
const book = new PageFlip(block, options);
// cleanup:
book.destroy();
(book as unknown as { render?: { render: () => void } }).render!.render = () => {};
```

**Affected file(s)**: `public/components/BrochureViewer.tsx` (lines 24-59), `public/page-flip.d.ts`
