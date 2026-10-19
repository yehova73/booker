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

## AI coloring pages (local testing)

Add your OpenAI API key to `.env.local` before running the editor:

```bash
OPENAI_API_KEY=your_api_key
```

AI coloring-page generation is restricted to local development until
authentication is added. Each batch is limited to 10 generated pages.

## Authentication and database setup

Copy `.env.example` to `.env` and configure `DATABASE_URL`. Google sign-in
requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; magic-link sign-in
requires an SMTP `EMAIL_SERVER` and `EMAIL_FROM`. Set `NEXTAUTH_SECRET` to a
long random value and `NEXTAUTH_URL` to the app's URL. Image uploads also need
`AWS_REGION`, `S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, and
`AWS_SECRET_ACCESS_KEY`. Deploy `aws/template.yaml` with SAM and use its
`FilesBucketName`, `FilesBucketRegion`, `FilesUserAccessKeyId`, and
`FilesUserSecretAccessKey` outputs to configure these values. Treat the secret
access key output as a credential and do not commit it.

Generate Prisma Client and create the database tables with:

```bash
npm run db:generate
npm run db:migrate
```

The dashboard supports user-owned collections and books, with book dimensions
using the editor's letter, paperback, and square presets. Book editor content
and image references are saved to the database automatically; uploaded image
objects are stored in a private S3 bucket and served through expiring signed
URLs. Apply the `add_file_storage` Prisma migration before using image uploads.

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
