FROM oven/bun:1 AS runner
WORKDIR /app

# Install project dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy application files
COPY . .

# Ensure storage directories exist
RUN mkdir -p storage/images storage/documents

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["sh", "-c", "bun run db:migrate && bun run start"]
