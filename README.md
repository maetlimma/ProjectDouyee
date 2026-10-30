# Dou Yee Product API

REST API for managing products, series and certificate types. The server uses ElysiaJS, PostgreSQL, `node-pg-migrate`, and host file storage. The existing admin login flow is retained: email/password creates a one-time code in the server log, and OTP verification returns a JWT.

## Run locally

Requirements: Bun and Docker Compose.

```powershell
bun install
bun run setup && bun run dev
```

Local setup uses the same default PostgreSQL credentials as Docker Compose, so `.env` is optional. Copy `.env.example` to `.env` only when you want to override those defaults.

- API: `http://localhost:3000/api/v1`
- OpenAPI UI: `http://localhost:3000/swagger`
- Health: `http://localhost:3000/health`
- Admin login UI: `http://localhost:3000/admin/login`
- Admin console: `http://localhost:3000/admin/dashboard` (Products, Series, Certificates)

Set a strong `JWT_SECRET` (at least 32 characters) and `POSTGRES_PASSWORD` in `.env` before deploying the service. Production startup rejects a missing or short JWT secret. Development defaults are only for local use.

## Authentication

1. `POST /api/auth/login` with `{ "email": "admin@douyee.com", "password": "..." }`.
2. Read the 6-digit OTP printed in the server console.
3. `POST /api/auth/verify-otp` with the `challengeToken` and `otpCode` from those steps.
4. Send `Authorization: Bearer <token>` to API endpoints.

The existing administrator account remains in `database/users.json`; login continues to verify its existing password hash. No admin user management endpoint is added.

The admin console uses the v1 API: products are grouped by series, product forms edit the Product fields and certificate links, Series manages `SeriesType`, and Certificates manages `CertificateType`. Product image and PDF uploads use the API's multipart fields; audit history is shown from the API response.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| POST / PUT | `/api/v1/product` | Create or update a product |
| GET | `/api/v1/product` | List products grouped by series |
| DELETE | `/api/v1/product` | Delete using `{ "product_id": "..." }` |
| GET | `/api/v1/product/{id}` | Get product and linked certificate codes |
| GET | `/api/v1/product/{id}/datasheet` | Stream the datasheet PDF |
| GET | `/api/v1/product/{id}/certificate` | Stream the certificate PDF |
| POST / PUT / GET / DELETE | `/api/v1/series` | Create, update, list and delete series |
| POST / PUT / GET / DELETE | `/api/v1/certificate` | Create, update, list and delete certificate types |

Every endpoint under `/api/v1` requires the admin JWT. Product update uses `product_id` in the request body, and product/certificate deletion uses the resource key in the request body. Delete operations return HTTP 204 on success. Errors use `{ "error": { "code": "...", "message": "..." } }`.

### Product request

Product bodies use the API design's snake_case fields: `sku`, `product_name`, `series`, `brand`, `title`, `main_image`, `other_image`, `specification`, `size_weights`, `datasheet_pdf`, `certificate_pdf`, and `other`. `certificate_codes` is accepted to maintain the `CertificateProduct` mapping when creating or updating a product.

For file upload, use `multipart/form-data`. Send ordinary metadata as form fields, JSON values (`other_image`, `specification`, `size_weights`, `other`, `certificate_codes`) as JSON strings, and file fields named `main_image_file`, `other_image_files` (repeat for multiple images), `datasheet_pdf_file`, or `certificate_pdf_file`. Certificate type create/update accepts `image_file`. Images are limited to 12 MiB and PDF files to 30 MiB. Files receive generated names and are stored in separate `storage/images` and `storage/documents` folders. File links require a JWT when fetched.

## Database and assumptions

- The initial migration creates `product`, `series_type`, `certificate_type`, and `certificate_product`, with foreign keys and audit fields. It seeds the three series and two certificate codes listed in the design brief.
- A product has one series; deleting a series referenced by products returns a conflict.
- Deleting a certificate type referenced by a product returns a conflict. Removing a product also removes its certificate mapping rows.
- `other`, `specification` and `size_weights` are JSONB objects; `other_image` is a JSONB array of stored file paths.
- `certificate_codes` is the API input/output helper for the mapping table; it is not a column on `product`.
- The design did not specify product request serialization or delete payloads. This implementation accepts JSON or multipart form data for file-bearing writes and uses key fields in delete request bodies as shown above.
- Audit fields use the authenticated admin email. PostgreSQL records creation and update timestamps in UTC.
- Uploaded files are stored on the application host; use a persistent mounted volume for `FILE_STORAGE_DIR` in deployment.

## Tests

The test suite includes product validation unit tests and three API integration flows. Start PostgreSQL, run migrations, then run:

```sh
bun test
```

Integration tests use the existing `admin@douyee.com` account and its default development password unless `TEST_ADMIN_PASSWORD` is set.

## Project structure

```text
src/
  db/pool.ts                 PostgreSQL connection pool
  migrations/                node-pg-migrate schema
  routes/v1.ts               Versioned REST controllers
  services/                  Product, lookup, and file business logic
  index.ts                   Elysia app, auth, Swagger and login UI routes
tests/                       Product validation and API integration tests
storage/                     Generated host-side upload storage (gitignored)
```
