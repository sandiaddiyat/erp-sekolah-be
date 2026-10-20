-- =============================================================================
-- Migrasi 0055: WhatsApp Gateway, log notifikasi, dan token kuitansi publik
--
-- Menambahkan katalog permission dan tabel tenant untuk konfigurasi gateway,
-- audit pengiriman, serta tautan kuitansi tanpa login.
-- Tidak mengubah tabel pembayaran atau data kuitansi yang sudah ada.
-- =============================================================================

create table if not exists public.whatsapp_settings (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null references public.schools(id) on delete cascade unique,
    provider text not null default 'fonnte' check (provider in ('fonnte', 'wablas')),
    api_token text not null default '',
    sender_number text,
    is_active boolean not null default false,
    auto_send_invoice boolean not null default false,
    auto_send_receipt boolean not null default true,
    template_invoice text not null default 'Yth. Orang tua dari {{nama_siswa}}, tagihan {{nama_tagihan}} sebesar {{nominal}} telah terbit dengan jatuh tempo {{jatuh_tempo}}. Pembayaran dapat ditransfer ke {{rekening_tujuan}}. Terima kasih.',
    template_receipt text not null default 'Alhamdulillah, pembayaran {{nama_tagihan}} an. {{nama_siswa}} sebesar {{nominal}} telah kami terima pada {{tanggal_bayar}}. Unduh kuitansi resmi Anda di: {{link_kuitansi}}. Terima kasih.',
    webhook_secret text not null default encode(gen_random_bytes(16), 'hex'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_settings_school on public.whatsapp_settings (school_id);

drop trigger if exists trg_whatsapp_settings_updated_at on public.whatsapp_settings;
create trigger trg_whatsapp_settings_updated_at
before update on public.whatsapp_settings
for each row execute function public.set_updated_at();

create table if not exists public.whatsapp_logs (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null references public.schools(id) on delete cascade,
    recipient_phone text not null,
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

create index if not exists idx_whatsapp_logs_school on public.whatsapp_logs (school_id);
create index if not exists idx_whatsapp_logs_created_at on public.whatsapp_logs (school_id, created_at desc);
create index if not exists idx_whatsapp_logs_recipient on public.whatsapp_logs (school_id, recipient_phone);

drop trigger if exists trg_whatsapp_logs_updated_at on public.whatsapp_logs;
create trigger trg_whatsapp_logs_updated_at
before update on public.whatsapp_logs
for each row execute function public.set_updated_at();

create table if not exists public.receipt_access_tokens (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null references public.schools(id) on delete cascade,
    payment_id uuid not null references public.payments(id) on delete cascade,
    token text not null unique default encode(gen_random_bytes(24), 'hex'),
    expires_at timestamptz not null default (now() + interval '30 days'),
    view_count integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_receipt_access_tokens_school on public.receipt_access_tokens (school_id);
create index if not exists idx_receipt_access_tokens_token on public.receipt_access_tokens (token);
create index if not exists idx_receipt_access_tokens_payment on public.receipt_access_tokens (payment_id);

alter table public.whatsapp_settings enable row level security;
alter table public.whatsapp_logs enable row level security;
alter table public.receipt_access_tokens enable row level security;

drop policy if exists whatsapp_settings_select on public.whatsapp_settings;
create policy whatsapp_settings_select on public.whatsapp_settings
for select to authenticated
using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id()));

drop policy if exists whatsapp_settings_modify on public.whatsapp_settings;
create policy whatsapp_settings_modify on public.whatsapp_settings
for all to authenticated
using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('finance.whatsapp_manage')))
with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('finance.whatsapp_manage')));

drop policy if exists whatsapp_logs_select on public.whatsapp_logs;
create policy whatsapp_logs_select on public.whatsapp_logs
for select to authenticated
using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('finance.whatsapp_view') or public.has_permission('finance.whatsapp_manage') or public.has_permission('finance.view'))));

drop policy if exists whatsapp_logs_insert on public.whatsapp_logs;
create policy whatsapp_logs_insert on public.whatsapp_logs
for insert to authenticated
with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id()));

drop policy if exists whatsapp_logs_update on public.whatsapp_logs;
create policy whatsapp_logs_update on public.whatsapp_logs
for update to authenticated
using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id()))
with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id()));

drop policy if exists receipt_access_tokens_select on public.receipt_access_tokens;
create policy receipt_access_tokens_select on public.receipt_access_tokens
for select to authenticated
using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id()));

drop policy if exists receipt_access_tokens_insert on public.receipt_access_tokens;
create policy receipt_access_tokens_insert on public.receipt_access_tokens
for insert to authenticated
with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id()));

insert into public.permissions (slug, module, action, name, description)
values
    ('finance.whatsapp_view', 'finance', 'whatsapp_view', 'Lihat WhatsApp & Log', 'Melihat konfigurasi dan log notifikasi WhatsApp'),
    ('finance.whatsapp_manage', 'finance', 'whatsapp_manage', 'Kelola WhatsApp Gateway', 'Mengatur kredensial API dan template pesan WhatsApp')
on conflict (slug) do nothing;

-- Grant permission WhatsApp baru ke role sistem per-sekolah (admin_sekolah dan bendahara)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true
  and r.slug in ('admin_sekolah', 'bendahara')
  and p.slug in ('finance.whatsapp_view', 'finance.whatsapp_manage')
on conflict (role_id, permission_id) do nothing;
