# Flori

**flori — the all-in-one operations admin for independent flower shops.** A Next.js 16 PWA on multi-tenant Supabase (Row Level Security), Cloudflare R2 image storage, and Web Push reminders — sales, expenses, customers, reservations, gallery, deposits, and insights in a single installable app.

---

## Overview

Flori is an admin system built to run the day-to-day operations of a small flower shop from one place. Sales, expenses, customers, reservations, a photo gallery, deposit reconciliation, and analytics all live in one Progressive Web App that installs to a phone home screen and delivers reservation reminders through push notifications.

It is multi-tenant from the ground up: every shop's data is isolated at the database layer through Supabase Auth and PostgreSQL Row Level Security, so a single deployment can serve many independent shops.

---

## Why Flori

Running a small flower shop on spreadsheets and paper has real limits:

- **Missed and inaccurate records** — manual entry during a busy day is easy to skip and slow to reconcile afterwards.
- **No customer history** — regulars' purchase history and preferences are hard to track systematically.
- **Reservation slips through the cracks** — phone-and-memo scheduling carries a high risk of no-shows.
- **Analysis is a chore** — monthly trends, category mix, and payment-method breakdowns need separate work to surface.
- **No access on the move** — desktop software can't be reached from outside the shop.

Flori solves these with real-time sales tracking, automated customer management, and push reminders — accessible from any mobile browser, no app-store install required.

---

## Features

### Sales
- Create, edit, and delete sales records
- Classify by product category, payment method, and sales channel (multi-select filters)
- Card-fee auto-calculation with card-company selection
- Photo attachments (auto-compressed above 3MB, up to 10 per record, direct-to-R2 presigned upload)
- Quick "road purchase" (wholesale) entry mode
- Unpaid (credit) tracking with settle / revert actions
- Day-grouped card list with server-side search

### Expenses
- Create, edit, and delete expenses with category and payment-method settings
- Unit-price × quantity auto-calculation
- **Recurring (fixed) costs** — weekly / monthly / yearly rules with multi-date support, auto-generated daily via Cron, with iOS-style "this one / all future" editing

### Customers
- Phone-based identification with auto-formatting
- Tier system and gender field
- Purchase-history linkage from sales
- Inline autocomplete when registering a sale

### Reservations
- Calendar-based create / edit / delete
- One-tap conversion of a reservation into a sale
- Completion-status toggle
- Reminder scheduling with push delivery

### Gallery
- Photo-card management of finished work
- Color-coded tag system
- Drag-and-drop ordering
- Linked to sales records

### Deposits
- Per-card-company expected deposit dates
- Bulk settle / undo
- Expected deposit = amount × (1 − fee_rate)

### Insights
- Curated trend articles with category filters and scrap toggles
- Instagram feed by followed account, with a post lightbox
- "My Scraps" page with editable memos

### Dashboard
- Today's sales summary and monthly analysis
- Breakdowns by category, payment method, and channel
- Real-time aggregation (no hard-coded stats)

### PWA & Push
- Installable from a mobile browser
- Service Worker push notifications
- Daily 08:00 KST reservation summary
- Per-reservation reminders

### Other
- Light / dark mode (system-linked, CSS-variable themes)
- Customizable bottom navigation (4–6 items, drag-to-reorder)
- CSV / Excel / PDF export

---

## Tech Stack

| Area | Stack |
|------|-------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui (Radix UI) |
| Database | Supabase (PostgreSQL, Auth, Row Level Security) |
| Storage | Cloudflare R2 (S3-compatible, CDN, presigned upload) |
| Validation | Zod 4 |
| State | React hooks (no global store) |
| Date | date-fns |
| Toast | Sonner |
| Theme | next-themes |
| Icons | lucide-react |
| DnD | @dnd-kit |
| Push | Web Push API (VAPID), Service Worker |
| Image | browser-image-compression (client-side) |
| Export | ExcelJS, jsPDF |
| Test | Vitest, fast-check (property-based), Testing Library |
| Deploy | Vercel |
| CI/CD | GitHub Actions (lint, type-check, test, build) |
| Error Logging | Discord webhook |

---

## Architecture

- **Pattern**: `page.tsx` (Server) fetches data → `*-client.tsx` (Client) renders UI
- **Server Actions** (`src/lib/actions/`) with a `withErrorLogging()` wrapper — expected errors throw `AppError`, unknown errors are reported to Discord
- **Auth**: middleware → Supabase Auth cookie → `requireAuth()` guard on every action; only `/admin/*` is protected, `/` and public routes are open
- **Multi-tenancy**: 19 tables carry `user_id`, enforced by RLS (`auth.uid() = user_id`); shared read-only tables (trends, Instagram) are written via the service role
- **Internal API** (`src/app/api/internal/`): `Bearer INTERNAL_API_KEY` (timing-safe), service-role writes for external ingestion routines

---

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Public site (no auth, /)
│   ├── (admin)/admin/     # Admin routes (auth required, /admin/*)
│   │   ├── sales/ expenses/ customers/ deposits/
│   │   ├── gallery/ calendar/ insights/ settings/
│   ├── api/
│   │   ├── cron/          # Vercel Cron (reminders, recurring expenses)
│   │   └── internal/      # Internal API (Bearer token, service role)
│   ├── login/             # Login
│   └── manifest.ts        # PWA manifest
├── components/
│   ├── ui/                # shadcn/ui
│   ├── layout/            # AppLayout, Header, Sidebar, BottomNav
│   ├── public/            # Public homepage sections
│   ├── sales/ gallery/ expenses/ insights/
├── lib/
│   ├── actions/           # Server Actions
│   ├── supabase/          # client, server, middleware, service-role
│   ├── storage.ts         # Cloudflare R2 abstraction
│   ├── validations.ts     # Zod schemas
│   ├── errors.ts          # AppError, withErrorLogging()
│   └── ...                # auth-guard, logger, export, utils
├── types/database.ts      # TypeScript types
└── public/
    ├── sw.js              # Service Worker
    └── icons/             # PWA icons
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- A [Supabase](https://supabase.com) project
- A [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) bucket

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Cloudflare R2
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-r2-bucket-name
R2_PUBLIC_URL=your-r2-public-url

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# Cron & internal API auth
CRON_SECRET=your-cron-secret
INTERNAL_API_KEY=your-internal-api-key

# Error logging
DISCORD_WEBHOOK_URL=your-discord-webhook-url
```

### 3. Set up the database

Run the SQL in `supabase/schema.sql` from the Supabase SQL Editor to create tables and RLS policies.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3100](http://localhost:3100).

### Other commands

```bash
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run tests
npm run test:watch   # Watch mode
```
