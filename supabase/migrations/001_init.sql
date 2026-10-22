-- supabase/migrations/001_init.sql
-- Stock Borrow App v3: schema, security rules and stock summary view.
-- Safe to run once on a fresh project. Run it in Supabase > SQL Editor.

create extension if not exists pg_trgm with schema extensions;

-- 1) Tables ---------------------------------------------------------------
create table if not exists public.products (
  id   text primary key,
  name text not null
);

create table if not exists public.customers (
  name text primary key
);

create table if not exists public.borrow_log (
  uid           text primary key default gen_random_uuid()::text,
  created_at    timestamptz not null default now(),
  barcode       text,
  product_id    text not null,
  product_name  text not null,
  customer_name text not null,
  quote_no      text,
  quantity      integer not null default 1 check (quantity > 0),
  requester     text,
  notes         text,
  status        text not null default 'อยู่ในระหว่างยืม'
                check (status in ('อยู่ในระหว่างยืม', 'คืนแล้ว', 'ทำขายแล้ว')),
  deleted_at    timestamptz            -- soft delete: set instead of removing the row
);

-- 2) Indexes (fast search / filters) --------------------------------------
create index if not exists products_name_trgm  on public.products  using gin (name extensions.gin_trgm_ops);
create index if not exists customers_name_trgm on public.customers using gin (name extensions.gin_trgm_ops);
create index if not exists borrow_log_created_idx on public.borrow_log (created_at desc);
create index if not exists borrow_log_status_idx  on public.borrow_log (status) where deleted_at is null;
-- The default list only shows open items, newest first: keep that query instant
create index if not exists borrow_log_open_idx on public.borrow_log (created_at desc)
  where status = 'อยู่ในระหว่างยืม' and deleted_at is null;
create index if not exists borrow_log_product_idx on public.borrow_log (product_id);

-- 3) Stock summary view (what is currently out on borrow) ------------------
create or replace view public.stock_summary
with (security_invoker = true) as
select product_id,
       max(product_name) as product_name,
       sum(quantity)::int as qty_out
from public.borrow_log
where status = 'อยู่ในระหว่างยืม' and deleted_at is null
group by product_id;

-- 4) Security -------------------------------------------------------------
-- The app uses one shared open link (no login), so the public "anon" key can
-- read and add data. It can NOT rewrite history: only status and deleted_at
-- can be changed on borrow_log, and nothing can be hard-deleted.
alter table public.products   enable row level security;
alter table public.customers  enable row level security;
alter table public.borrow_log enable row level security;

drop policy if exists products_read   on public.products;
drop policy if exists products_add    on public.products;
drop policy if exists customers_read  on public.customers;
drop policy if exists customers_add   on public.customers;
drop policy if exists log_read        on public.borrow_log;
drop policy if exists log_add         on public.borrow_log;
drop policy if exists log_update      on public.borrow_log;

create policy products_read  on public.products   for select to anon, authenticated using (true);
create policy products_add   on public.products   for insert to anon, authenticated with check (true);
create policy customers_read on public.customers  for select to anon, authenticated using (true);
create policy customers_add  on public.customers   for insert to anon, authenticated with check (true);
create policy log_read       on public.borrow_log  for select to anon, authenticated using (true);
create policy log_add        on public.borrow_log  for insert to anon, authenticated with check (true);
create policy log_update     on public.borrow_log  for update to anon, authenticated using (true) with check (true);

revoke all on public.products, public.customers, public.borrow_log, public.stock_summary from anon, authenticated;
grant select, insert on public.products to anon, authenticated;
grant select, insert on public.customers to anon, authenticated;
grant select, insert on public.borrow_log to anon, authenticated;
grant update (status, deleted_at) on public.borrow_log to anon, authenticated;
grant select on public.stock_summary to anon, authenticated;

-- 5) Refresh the API schema cache
NOTIFY pgrst, 'reload schema';
