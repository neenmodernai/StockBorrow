-- supabase/migrations/002_open_index.sql
create index if not exists borrow_log_open_idx on public.borrow_log (created_at desc)
  where status = 'อยู่ในระหว่างยืม' and deleted_at is null;

NOTIFY pgrst, 'reload schema';