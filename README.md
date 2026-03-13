# Water Updates (Assessment)

This is a Next.js website that collects water-related news/articles and prepares a daily digest window:

- **Digest window**: 9:00 AM yesterday → 8:59 AM today (**Asia/Manila**)
- **Storage**: PostgreSQL (`DATABASE_URL`)
- **Ingestion**: RSS (initial sources are in `lib/sources.ts`)

## Setup (Local)

1. Create a local Postgres database and set `DATABASE_URL`.

Copy `.env.example` to `.env.local` and fill in:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
```

2. Install dependencies:

```bash
npm install
```

3. Run migrations:

```bash
npm run db:migrate
```

4. Start dev server:

```bash
npm run dev
```

Open:
- Home: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Admin actions

- **Fetch (ingest) latest**: calls `POST /api/ingest` and inserts new articles (deduped by URL).
- **Load digest preview**: calls `GET /api/digest` and shows articles in the digest window.

## Deployment (Railway)

1. Create a Railway project.
2. Add a **PostgreSQL** plugin/database.
3. Ensure your service has `DATABASE_URL` available (Railway usually injects it).
4. Run migrations once on Railway:

```bash
npm run db:migrate
```

5. Deploy as a normal Next.js service (`npm run build`, then `npm run start`).

## Next step: Viber integration

Once you have a Viber bot and it can post to your group:
- We will add a scheduled job that runs at **9:00 AM** and sends the digest.
- Or a polling worker that sends new items shortly after publication.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
