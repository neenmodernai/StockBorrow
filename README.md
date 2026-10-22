# Stock Borrow App v3

Next.js + Supabase + Vercel. Installable as a PWA (Thai UI).

## Setup
1. Supabase > SQL Editor: run the files in `supabase/migrations/` in order (`001_init.sql`, `002_open_index.sql`, `003_products_insert_and_new_items.sql`).
2. Import the three CSV files (products, customers, borrow_log) in Table Editor > Insert > Import data from CSV.
3. Run `supabase/verify.sql` and check the expected numbers in its comments.
4. Vercel: import this repo and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`).

## Local dev
```
npm install
cp .env.example .env.local   # then fill in the anon key
npm run dev
```

`legacy/index.html` is the old SheetDB version, kept only as a backup.
