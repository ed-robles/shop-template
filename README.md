# Shop Template

Next.js e-commerce starter with:
- Better Auth (email/password + optional Google sign-in)
- Prisma + PostgreSQL
- Stripe Checkout
- Resend transactional emails
- S3 (and optional CloudFront) product image hosting

## 1. Clone and install

```bash
git clone <your-fork-or-repo-url>
cd shop-template
npm install
cp .env.example .env
```

## 2. Configure environment variables

Fill in `.env` after copying from `.env.example`.

### Environment variable reference (`.env.example`)

| Variable | Required | What it does |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Yes | Secret used to sign/encrypt Better Auth tokens. Generate a long random string (example: `openssl rand -base64 32`). |
| `BETTER_AUTH_URL` | Yes | Public base URL of your app (example: `http://localhost:3000` in dev, `https://store.yourdomain.com` in prod). Used for auth/checkout redirects and links. |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma (example: `postgresql://user:pass@localhost:5432/shop_template`). |
| `GOOGLE_CLIENT_ID` | Optional | Enables Google OAuth login when set with `GOOGLE_CLIENT_SECRET`. Leave blank to use email/password only. |
| `GOOGLE_CLIENT_SECRET` | Optional | Secret for the Google OAuth app. Must be set together with `GOOGLE_CLIENT_ID`. |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key used by the frontend checkout flow. |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key used by server routes to create checkout sessions and process Stripe events. |
| `RESEND_API_KEY` | Yes | API key for sending auth emails and paid-order admin notifications through Resend. |
| `EMAIL_FROM` | Yes | Sender address for auth emails (example: `noreply@yourdomain.com`). Should be from a verified Resend domain/sender. |
| `AWS_ACCESS_KEY_ID` | Usually yes | AWS access key used by S3 uploads. Can be omitted if credentials are provided by IAM role/profile in your runtime environment. |
| `AWS_SECRET_ACCESS_KEY` | Usually yes | AWS secret key paired with `AWS_ACCESS_KEY_ID`. Can be omitted when using IAM role/profile credentials. |
| `AWS_REGION` | Yes | AWS region of your S3 bucket (example: `us-east-1`). |
| `AWS_S3_BUCKET` | Yes | S3 bucket name used for product image uploads and deletions. |
| `ADMIN_EMAILS` | Yes | Comma-separated email list for `/admin` access and paid-order backup notifications (example: `owner@yourdomain.com,ops@yourdomain.com`). |
| `AWS_CLOUDFRONT_URL` | Optional | CloudFront domain/base URL used to serve product images. If omitted, direct S3 URLs are used. |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret (`whsec_...`) used to verify incoming webhook events at `/api/stripe/webhook`. |

## 3. Create database schema

Run migrations against your Postgres database:

```bash
npx prisma migrate deploy
```

If you are actively changing schema during development, use:

```bash
npx prisma migrate dev
```

## 4. Service setup checklist

### Better Auth

- Set `BETTER_AUTH_URL` to your app URL for each environment.
- Set a strong `BETTER_AUTH_SECRET`.
- If using Google sign-in, create Google OAuth credentials and configure the callback URI used by Better Auth for this app.

### Resend

- Create a Resend API key and put it in `RESEND_API_KEY`.
- Verify your sender domain/address and set `EMAIL_FROM`.
- `ADMIN_EMAILS` recipients receive paid-order backup notifications with order details.

### S3 / CloudFront (product images)

- Create an S3 bucket and set `AWS_S3_BUCKET`, `AWS_REGION`, and AWS credentials.
- Configure S3 CORS to allow browser `PUT` uploads from your app origin(s). Example:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-store-domain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

- Optional: set `AWS_CLOUDFRONT_URL` to serve images through CloudFront.

### Stripe (checkout + order webhooks)

- Add `STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`.
- Webhook endpoint is `POST /api/stripe/webhook`.
- Subscribe Stripe webhook to:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`

For local development, forward events:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the returned `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

## 5. Start the app

```bash
npm run dev
```

Then:
1. Open `http://localhost:3000/auth` and create your first account.
2. Make sure that account email is included in `ADMIN_EMAILS`.
3. Open `http://localhost:3000/admin/inventory` to add products.
