-- supabase/verify.sql
-- Run after importing the three CSV files. Expected results are in the comments.
select 'products'  as tbl, count(*) as rows from public.products     -- expect 18115 (18117 after running 003_products_insert_and_new_items.sql)
union all select 'customers', count(*) from public.customers          -- expect 1371
union all select 'borrow_log', count(*) from public.borrow_log;       -- expect 5641

select status, count(*) as rows, sum(quantity) as qty
from public.borrow_log group by status order by status;
-- expect: อยู่ในระหว่างยืม 1506 rows / 5947 qty, ทำขายแล้ว 4135 rows

select min(created_at at time zone 'Asia/Bangkok') as first_entry,
       max(created_at at time zone 'Asia/Bangkok') as last_entry
from public.borrow_log;
-- expect: 2025-12-07 09:00:00 ... 2026-09-30 12:00:37

select count(*) as open_products, sum(qty_out) as open_qty from public.stock_summary; -- open_qty expect 5947
