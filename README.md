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

## PIN Management

The application supports a staff clock-in PIN flow:

### For Admins

When creating a new staff account in **Admin → Staff** (or **Dashboard → Setup Staff**), the system:

- Generates a random **4-6 digit initial PIN** for the staff member.
- Displays that initial PIN in the success toast after account creation.
- Emails the credentials (if email is configured).

The admin must share the initial PIN with the staff member so they can clock in for the first time.

### For Staff

- Staff can log in by selecting their name and entering their **4-6 digit PIN** on the clock-in keypad at `/`.
- On **first login**, the user is forced to change the PIN before entering the dashboard.
- Staff can also generate a new PIN at any time from **Settings → Security → PIN Code** (`/dashboard/settings`).

### For Developers

Relevant files:

- Login page with clock-in PIN pad: `app/page.tsx`
- PIN change / first-login modal: `app/page.tsx`
- PIN generation in settings: `app/dashboard/settings/page.tsx`
- Staff account creation: `app/admin/staff/page.tsx`, `app/dashboard/setup-staff/page.tsx`
- API mutation: `M_CREATE_STAFF_ACCOUNT` in `lib/gql.ts`
- PIN GraphQL mutations: `M_LOGIN_WITH_PIN`, `M_SET_STAFF_PIN` in `lib/gql.ts`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
