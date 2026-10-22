-- supabase/migrations/003_products_insert_and_new_items.sql
-- 1) Let the app add new product IDs (same as new customer names).
--    Only adding is allowed: names/IDs of existing products cannot be edited or deleted from the app.
drop policy if exists products_add on public.products;
create policy products_add on public.products for insert to anon, authenticated with check (true);
grant insert on public.products to anon, authenticated;

-- 2) Products from "รายการสินค้าไม่มีรหัสในระบบ-Stock Borrow.xlsx"
--    ON CONFLICT DO NOTHING: IDs that already exist keep their current name.
--    0002665 and 9005999 already exist, so only 3090273 and 9005998 are new.
insert into public.products (id, name) values
  ('0002665', 'จุลินทรีย์ ผงย่อยสลายไขมัน 1,0 แบคโตเซล 3001'),
  ('3090273', 'ยู้ฮูกาวสารพัดประโยชน์ SOLVE-B'),
  ('9005998', 'หน้ากากอนามัยHI-CARE#P10/OR'),
  ('9005999', 'หน้ากากอนามัยHI-CARE#P10/VI')
on conflict (id) do nothing;

NOTIFY pgrst, 'reload schema';
