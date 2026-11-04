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

- Staff can log in by selecting their name and entering their **4-6 digit PIN** on the clock-in keypad at `/`. The keypad shows four PIN indicators initially and reveals the remaining two only when a fifth digit is entered.
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

## Offline POS, branch views, and reports

- Staff POS transactions stay locked to the signed-in operator's assigned branch. Owners and managers can select a specific branch in POS; an "All Branches" view is read-only until they choose one. POS sales and held-sale completions are written to the durable outbox before the API request (desktop SQLite; browser IndexedDB), so timeouts, weak connections, and restarts do not drop a transaction. Retries keep the original branch and idempotency reference; sale, payment, stock, customer, and revenue-ledger writes are applied together by the API. Queued work is tied to its originating user and only syncs while that user is signed in. Offline POS history/accounting includes local completed-sale overlays for the original branch until the server confirms the transaction.
- Manager branch choices and the last successful branch list are cached locally. A manager can switch among branches already known to that device while offline; the selected branch is also persisted across reloads.
- Dashboard and report pages render cached snapshots first. A report can be generated offline for branches and date ranges that were loaded successfully on that device before going offline. Offline reports reflect the last cached snapshot and may not include newer activity from other devices until sync.
- The sync indicator and pending-sales panel show queued work. Reconnect, periodic checks, or **Sync now** drains the queue and refreshes server-backed data.
- Report exports from the Reports overview use the same branch-aware, formatted export as their detail pages. The reports release includes item-level sales and cost calculations where product costs are available; profit is not treated as reliable when costs are missing.
- The PWA and desktop app use the same report pages. The PWA service-worker cache is versioned per release, and the desktop installer bundles the static app. Generating reports offline still requires the relevant report data to have been loaded on that device while online.

## Expense requests and supporting documents

- Expense requests support a category, amount, description, date, and optional receipt, invoice, and payment-receipt attachments. Attachments accept PDF, JPEG, PNG, and WebP files up to 5 MB each.
- The expense categories include **Server & Hosting** for recurring monthly server subscriptions and **DevOps** for infrastructure and tooling costs.
- Requests are always created as **Pending**. Managers can approve or reject requests for their assigned branch; owners and system administrators can decide across branches. The requester cannot decide their own request, and only pending requests can be decided. Approved expenses post to the ledger once.
- Offline requests, including selected document data, are stored in the browser's IndexedDB queue or desktop's durable SQLite outbox and uploaded when that same user signs in online. Pending writes are preserved when signing out.
- Expense documents are stored in a **private** Supabase Storage bucket named `expense-support`. Uploads go through the authenticated API; configure `SUPABASE_SERVICE_ROLE_KEY` in the API environment (never in the web app), ensure `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` point to the same project, create the bucket below, then apply the Prisma schema change with `npx prisma db push` from `api`.

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-support',
  'expense-support',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = excluded.allowed_mime_types;
```

The app stores signed document links with each expense; those links expire after one year. Re-upload a document if a link has expired.

### Build release 2.0.7

- PWA/web: run `npm run build` and deploy the web build. The service-worker cache version is bumped so installed PWAs replace the previous cached app shell when the new worker activates.
- Windows desktop offline app: run `npm run tauri:build`. Tauri bundles the same report changes into the offline-capable desktop installer.
- Publishing a desktop auto-update still requires the configured signing key and release hosting; a local build does not publish an update.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
