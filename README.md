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
MONGODB_URI=mongodb://localhost:27017/
```

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
- `src/app/api/reports` - API routes for report save/fetch and PDF generation
- `src/lib/loan.ts` - loan simulation and strategy logic
- `src/lib/mongodb.ts` - MongoDB connection helper
- `src/lib/report-model.ts` - Mongoose report schema/model

## Deploy

Recommended: [Vercel](https://vercel.com/new)

1. Import this GitHub repo in Vercel
2. Set environment variable `MONGODB_URI`
3. Deploy

## Repository

GitHub: [AkshayBhalodiya/loan-calculator](https://github.com/AkshayBhalodiya/loan-calculator)
