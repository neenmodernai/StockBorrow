-- supabase/diagnose.sql
select 'products' as tbl, count(*) as rows from public.products
union all select 'customers', count(*) from public.customers
union all select 'borrow_log', count(*) from public.borrow_log;

select status, count(*) as rows, sum(quantity) as qty
from public.borrow_log group by status order by status;

select min(created_at at time zone 'Asia/Bangkok') as first_entry,
       max(created_at at time zone 'Asia/Bangkok') as last_entry
from public.borrow_log;