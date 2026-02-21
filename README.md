## E-Commerce Template

### Authentication setup

This project uses Better Auth with Prisma + PostgreSQL.

Required environment variables:

- `DATABASE_URL`
- `BETTER_AUTH_URL` (for example `http://localhost:3000`)
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM` (for example `noreply@yourdomain.com`)
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Apply schema changes and generate Prisma client:

```bash
npx prisma migrate dev --name add_auth
npx prisma generate
```

### Stripe webhook setup

Webhook endpoint:

- `POST /api/stripe/webhook`

Subscribed Stripe events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

Local development:

1. Start the app locally (`npm run dev`).
2. Forward Stripe events:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. Copy the webhook signing secret from Stripe CLI output (`whsec_...`) into:

- `STRIPE_WEBHOOK_SECRET`

Production:

1. Create a Stripe webhook endpoint pointing to:

- `https://<your-domain>/api/stripe/webhook`

2. Subscribe only to the three events listed above.
3. Set the production endpoint signing secret as `STRIPE_WEBHOOK_SECRET` in your host environment.
