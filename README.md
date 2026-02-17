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

Apply schema changes and generate Prisma client:

```bash
npx prisma migrate dev --name add_auth
npx prisma generate
```
