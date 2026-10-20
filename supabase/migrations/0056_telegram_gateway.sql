-- =============================================================================
-- Migrasi 0056: Telegram Gateway, pengaturan bot, dan log notifikasi
-- =============================================================================

alter table public.students
    add column if not exists telegram_chat_id text,
    add column if not exists telegram_username text;

create index if not exists idx_students_telegram_chat
    on public.students (school_id, telegram_chat_id);

create table if not exists public.telegram_settings (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null references public.schools(id) on delete cascade unique,
    bot_token text not null default '',
    bot_username text,
    is_active boolean not null default false,
    auto_send_invoice boolean not null default false,
    auto_send_receipt boolean not null default true,
    template_invoice text not null default 'Yth. Orang tua dari <b>{{nama_siswa}}</b>, tagihan <b>{{nama_tagihan}}</b> sebesar <b>{{nominal}}</b> telah terbit dengan jatuh tempo <b>{{jatuh_tempo}}</b>. Pembayaran dapat ditransfer ke:<br>{{rekening_tujuan}}<br><br>Terima kasih.',
    template_receipt text not null default 'Alhamdulillah, pembayaran <b>{{nama_tagihan}}</b> an. <b>{{nama_siswa}}</b> sebesar <b>{{nominal}}</b> telah kami terima pada <b>{{tanggal_bayar}}</b>.<br><br>Terima kasih atas kepercayaannya.',
    webhook_secret text not null default encode(gen_random_bytes(16), 'hex'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_telegram_settings_school on public.telegram_settings (school_id);

drop trigger if exists trg_telegram_settings_updated_at on public.telegram_settings;
create trigger trg_telegram_settings_updated_at
before update on public.telegram_settings
for each row execute function public.set_updated_at();

create table if not exists public.telegram_logs (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null references public.schools(id) on delete cascade,
    chat_id text not null,
    recipient_name text,
    message_type text not null check (message_type in ('invoice', 'receipt', 'reminder', 'bot_inbound')),
    content text not null,
    status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
    response_payload jsonb,
    error_message text,
    invoice_id uuid references public.invoices(id) on delete set null,
    payment_id uuid references public.payments(id) on delete set null,
    student_id uuid references public.students(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_telegram_logs_school on public.telegram_logs (school_id);
create index if not exists idx_telegram_logs_created_at on public.telegram_logs (school_id, created_at desc);
create index if not exists idx_telegram_logs_chat_id on public.telegram_logs (school_id, chat_id);

drop trigger if exists trg_telegram_logs_updated_at on public.telegram_logs;
create trigger trg_telegram_logs_updated_at
before update on public.telegram_logs
for each row execute function public.set_updated_at();

alter table public.telegram_settings enable row level security;
alter table public.telegram_logs enable row level security;

drop policy if exists telegram_settings_select on public.telegram_settings;
create policy telegram_settings_select on public.telegram_settings
for select to authenticated
using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id()));

drop policy if exists telegram_settings_modify on public.telegram_settings;
create policy telegram_settings_modify on public.telegram_settings
for all to authenticated
using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('finance.telegram_manage')))
with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('finance.telegram_manage')));

drop policy if exists telegram_logs_select on public.telegram_logs;
create policy telegram_logs_select on public.telegram_logs
for select to authenticated
using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('finance.telegram_view') or public.has_permission('finance.telegram_manage') or public.has_permission('finance.view'))));

drop policy if exists telegram_logs_insert on public.telegram_logs;
create policy telegram_logs_insert on public.telegram_logs
for insert to authenticated
with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id()));

drop policy if exists telegram_logs_update on public.telegram_logs;
create policy telegram_logs_update on public.telegram_logs
for update to authenticated
using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id()))
with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id()));

insert into public.permissions (slug, module, action, name, description)
values
    ('finance.telegram_view', 'finance', 'telegram_view', 'Lihat Telegram & Log', 'Melihat konfigurasi dan log notifikasi Telegram'),
    ('finance.telegram_manage', 'finance', 'telegram_manage', 'Kelola Telegram Gateway', 'Mengatur bot token dan template pesan Telegram')
on conflict (slug) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true
  and r.slug in ('admin_sekolah', 'bendahara')
  and p.slug in ('finance.telegram_view', 'finance.telegram_manage')
on conflict (role_id, permission_id) do nothing;
