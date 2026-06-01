# Loan Calculator (LoanWise)

A smart EMI strategy planner built with Next.js.  
It helps compare baseline EMI vs optimized repayment strategy and shows interest savings, tenure reduction, charts, and amortization schedule.

## Features

- Loan input (amount, interest, tenure, start date, loan type, optional manual EMI)
- Strategy simulation (monthly extra, periodic extra EMI, yearly lump sum)
- Savings insights (interest saved, months/years saved, closure date impact)
- Visual analytics with charts (pie, bar, line, area)
- Detailed amortization schedule with pagination
- Save reports and view past reports
- Export report via print-to-PDF workflow

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Recharts
- MongoDB + Mongoose

## Local Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `.env.local` in the project root:

```env
MONGODB_URI=mongodb://localhost:27017/loanwise
AUTH_SECRET=your-random-secret-at-least-32-chars
ADMIN_EMAIL=admin@loanwise.com
ADMIN_PASSWORD=your-admin-password
NEXTAUTH_URL=http://localhost:3000
```

See `.env.example` for optional Google, Resend email, and cron settings.

### 3) Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - start local development server
- `npm run build` - build production app
- `npm run start` - run production server
- `npm run lint` - run ESLint checks

## Project Structure

- `src/app/page.tsx` - main calculator UI and insights dashboard
- `src/app/reports` - saved reports listing/details pages
- `src/app/api` - REST APIs (simulate, compare, stats, rates, reports CRUD, export, email, cron)
- `src/lib/auth.ts` - NextAuth sign-in (credentials + optional Google)
- `src/lib/loan.ts` - loan simulation and strategy logic
- `src/lib/mongodb.ts` - MongoDB connection helper
- `src/lib/report-model.ts` - Mongoose report schema/model

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/simulate` | Server-side loan simulation |
| POST | `/api/compare` | Compare two strategies |
| GET | `/api/rates?loanType=Home` | Reference bank rates |
| GET | `/api/stats` | Dashboard aggregates |
| GET/POST | `/api/reports` | List / create reports |
| GET/PATCH/DELETE | `/api/reports/[id]` | Report CRUD |
| GET | `/api/reports/[id]/export?format=json\|csv` | Export report |
| POST | `/api/reports/[id]/email` | Email report (needs Resend) |
| GET | `/api/reports/[id]/pdf` | Download PDF |
| GET | `/api/cron/reminders` | High-risk reminders (CRON_SECRET) |

- **Sign up** at `/signup` — email + password saved in MongoDB (hashed).
- **Sign in** at `/login` — same credentials.
- **Admin** — only `ADMIN_EMAIL` + `ADMIN_PASSWORD` from `.env.local`; sees all users at `/admin`.
- Each user’s reports are private to their email.

## Deploy

Recommended: [Vercel](https://vercel.com/new)

1. Import this GitHub repo in Vercel
2. Set environment variable `MONGODB_URI`
3. Deploy

## Repository

GitHub: [AkshayBhalodiya/loan-calculator](https://github.com/AkshayBhalodiya/loan-calculator)
