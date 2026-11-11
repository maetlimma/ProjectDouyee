FROM oven/bun:1-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json bun.lock ./
RUN bun install --production

COPY . .

EXPOSE 3000
# Apply pending migrations, load the product and catalogue seeds (seed/), then start the server. Render sets PORT.
CMD ["sh", "-c", "bun scripts/migrate.ts up && bun scripts/seed-products.ts && bun scripts/seed-catalogues.ts && bun src/index.ts"]
