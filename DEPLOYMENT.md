# Educonnect Deployment

This project is a Next.js application with Prisma and PostgreSQL. The simplest
production setup is:

- Vercel for the Next.js application
- Supabase PostgreSQL for the database
- LiveKit Cloud for live video

The existing `docker-compose.livekit.yml` is for a separate VPS deployment.
Vercel cannot run that LiveKit server.

## 0. Rotate the exposed database password

The local `.env` currently contains a malformed database URL and a
real-looking database credential. Reset that database password in Supabase
before using the project in production. Replace the local and hosted values
after the reset. Do not commit `.env`.

## 1. Create the database

1. Create a Supabase project.
2. Open the project `Connect` dialog.
3. Set `DATABASE_URL` to the transaction pooler URL. Use the `6543` endpoint
   and include `pgbouncer=true`.
4. Set `DIRECT_URL` to the direct database URL. Use the `5432` endpoint.
5. URL-encode special characters in the database password. For example, an
   `@` in a password must become `%40`.

Example shape only:

```env
DATABASE_URL="postgresql://USER:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
```

Do not copy the example values literally.

## 2. Create the schema and first admin

Set these variables in a private terminal or `.env.local`:

```env
DATABASE_URL="..."
DIRECT_URL="..."
JWT_SECRET="a-random-secret-at-least-32-characters-long"
ADMIN_NAME="System Admin"
ADMIN_EMAIL="admin@your-domain.com"
ADMIN_PASSWORD="a-long-random-password"
```

Run:

```bash
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

`db:seed` is idempotent for the administrator email. It updates that
administrator's password to the value supplied in `ADMIN_PASSWORD`, so remove
or rotate that variable after the first seed if it is stored anywhere
persistently.

For local development, use `npm run db:migrate` after changing
`prisma/schema.prisma`. Commit every generated folder under
`prisma/migrations`.

## 3. Deploy the app to Vercel

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Set the framework to Next.js if Vercel does not detect it automatically.
4. Add these Production environment variables:

```text
DATABASE_URL
DIRECT_URL
JWT_SECRET
ADMIN_NAME
ADMIN_EMAIL
ADMIN_PASSWORD
NEXT_PUBLIC_APP_URL
NEXTAUTH_URL
```

Set `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to the final HTTPS domain. For
the first deployment, the generated Vercel domain is acceptable.

Use `npm run build` as the build command. Deploy after the database migration
has succeeded. Do not run the admin seed on every build; use it once from a
trusted terminal or CI job.

For later schema changes, run this from CI with the Production database
variables:

```bash
npm ci
npm run db:migrate:deploy
```

Then deploy the application normally.

## 4. Enable LiveKit video

1. Create a LiveKit Cloud project.
2. Copy its project URL, API key, and API secret.
3. Add these Vercel variables:

```env
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."
NEXT_PUBLIC_LIVEKIT_URL="wss://your-project.livekit.cloud"
```

The API secret must remain server-only. The app's
`/api/live/token` route creates participant tokens on the server. Without
these variables, the UI uses a mock token and real audio/video will not
connect.

## 5. Verify the deployment

1. Open `/register` and create a student account.
2. Sign out and sign back in through `/login`.
3. Create a teacher account and verify it lands on `/pending-approval`.
4. Sign in with the seeded admin account.
5. Approve the teacher from the admin approvals page.
6. Create a schedule and test a LiveKit room in two browser sessions.
7. Confirm the browser is using HTTPS and the live URL is `wss://`.

The repository now includes:

- A PostgreSQL Prisma migration under `prisma/migrations`
- A secret-driven admin seed at `prisma/seed.mjs`
- Real registration, login, and logout API routes
- HTTP-only JWT session cookies
- Production validation for `JWT_SECRET`
- Automatic Prisma Client generation on install/build

## Current feature caveats

Email delivery, object-storage uploads, and Stripe payment processing are
documented in `.env.production.example`, but the current code does not yet
wire real provider SDKs for those features. They are not required to deploy
the core learning, scheduling, exam, attendance, admin, and LiveKit flows.
