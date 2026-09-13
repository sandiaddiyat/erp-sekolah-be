/**
 * Setup database ERP Sekolah.
 *
 * Menjalankan berurutan:
 *   1. Semua file di supabase/migrations/ (urut berdasarkan nama)
 *   2. Membuat akun admin pertama lewat Supabase Admin API
 *   3. Membuat sekolah pertama + role default + mengangkat admin jadi super admin
 *
 * Aman dijalankan berulang kali (idempoten).
 * Tidak pernah mencetak nilai kredensial ke layar.
 *
 * Jalankan dengan: npm run db:setup
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

try {
  process.loadEnvFile(path.join(projectRoot, ".env.local"));
} catch {
  console.error("✗ File .env.local tidak ditemukan di " + projectRoot);
  process.exit(1);
}

const cfg = {
  supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, ""),
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  adminEmail: (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase(),
  adminPassword: process.env.SEED_ADMIN_PASSWORD ?? "",
  adminName: process.env.SEED_ADMIN_NAME ?? "Administrator",
  schoolName: process.env.SEED_SCHOOL_NAME ?? "Sekolah Contoh",
  schoolSlug: process.env.SEED_SCHOOL_SLUG ?? "sekolah-contoh",
};

function fail(message, hint) {
  console.error(`\n✗ ${message}`);
  if (hint) console.error(`  → ${hint}`);
  process.exit(1);
}

// ---------------------------------------------------------------- validasi
const missing = [];
if (!cfg.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
if (!cfg.serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (!cfg.databaseUrl) missing.push("DATABASE_URL");
if (!cfg.adminEmail) missing.push("SEED_ADMIN_EMAIL");
if (!cfg.adminPassword) missing.push("SEED_ADMIN_PASSWORD");

if (missing.length > 0) {
  fail(
    "Nilai berikut masih kosong di .env.local: " + missing.join(", "),
    "Buka D:\\Developments\\erp-sekolah\\.env.local lalu isi."
  );
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.supabaseUrl)) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL formatnya tidak sesuai.",
    "Seharusnya seperti https://abcdefghijk.supabase.co (tanpa garis miring di akhir)."
  );
}

if (!cfg.serviceKey.startsWith("eyJ")) {
  fail(
    "SUPABASE_SERVICE_ROLE_KEY bukan format JWT (tidak diawali 'eyJ').",
    "Pakai key dari tab 'Legacy API keys' di Supabase, bukan key baru 'sb_secret_...'."
  );
}

if (!/^postgres(ql)?:\/\//i.test(cfg.databaseUrl)) {
  fail(
    "DATABASE_URL harus berupa connection string Postgres.",
    "Ambil dari Project Settings > Database > Connection string > Session pooler."
  );
}

const weakPasswords = new Set([
  "admin123",
  "password",
  "password123",
  "administrator",
  "admin",
  "sekolah123",
  "erp123456",
  "12345678",
  "qwerty123",
]);

if (
  cfg.adminPassword.length < 12 ||
  weakPasswords.has(cfg.adminPassword.toLowerCase()) ||
  /^\d+$/.test(cfg.adminPassword)
) {
  fail(
    "SEED_ADMIN_PASSWORD terlalu lemah.",
    "Gunakan minimal 12 karakter yang terdiri dari huruf, angka, dan simbol. Jangan pakai password umum seperti admin123."
  );
}

function maskDbUrl(value) {
  try {
    const url = new URL(value);
    return `${url.hostname}:${url.port || "5432"}`;
  } catch {
    return "(tidak bisa dibaca)";
  }
}

console.log("Konfigurasi terbaca:");
console.log(`  Supabase   : ${cfg.supabaseUrl}`);
console.log(`  Database   : ${maskDbUrl(cfg.databaseUrl)}`);
console.log(`  Admin      : ${cfg.adminEmail}`);
console.log(`  Sekolah    : ${cfg.schoolName}\n`);

// ---------------------------------------------------------------- database
const sslConfig = (() => {
  const caCert = process.env.DATABASE_CA_CERT;
  if (caCert) {
    return {
      rejectUnauthorized: true,
      ca: readFileSync(path.resolve(projectRoot, caCert)),
    };
  }
  console.warn(
    "⚠  DATABASE_CA_CERT belum diisi. Verifikasi TLS dinonaktifkan (rejectUnauthorized=false)\n" +
      "   karena Supabase session pooler memakai sertifikat self-signed. Untuk verifikasi\n" +
      "   penuh, unduh CA cert dari Supabase (Project Settings > Database > CA certificate)\n" +
      "   lalu set DATABASE_CA_CERT ke path file .pem-nya."
  );
  return { rejectUnauthorized: false };
})();

const client = new Client({
  connectionString: cfg.databaseUrl,
  ssl: sslConfig,
  connectionTimeoutMillis: 20000,
});

function sqlFile(relative) {
  return readFileSync(path.join(projectRoot, relative), "utf8");
}

async function runSqlFile(relative, label) {
  process.stdout.write(`→ ${label}... `);
  try {
    await client.query("begin");
    await client.query(sqlFile(relative));
    await client.query("commit");
    console.log("selesai");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.log("GAGAL");
    throw error;
  }
}

// ------------------------------------------------------------- admin api
async function adminFetch(pathname, init = {}) {
  const response = await fetch(`${cfg.supabaseUrl}/auth/v1${pathname}`, {
    ...init,
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: response.ok, status: response.status, body };
}

async function ensureAdminUser() {
  process.stdout.write("→ Membuat akun admin... ");

  const created = await adminFetch("/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: cfg.adminEmail,
      password: cfg.adminPassword,
      email_confirm: true,
      user_metadata: { full_name: cfg.adminName },
    }),
  });

  if (created.ok && created.body?.id) {
    console.log("dibuat");
    return created.body.id;
  }

  const message = JSON.stringify(created.body ?? "");
  const alreadyExists =
    created.status === 409 ||
    created.status === 422 ||
    /already|exists|registered/i.test(message);

  if (!alreadyExists) {
    console.log("GAGAL");
    throw new Error(
      `Supabase Admin API menolak permintaan (HTTP ${created.status}): ${message}`
    );
  }

  const { rows } = await client.query(
    "select id from public.profiles where lower(email) = $1 limit 1",
    [cfg.adminEmail]
  );

  if (rows.length === 0) {
    console.log("GAGAL");
    throw new Error(
      `Email ${cfg.adminEmail} sudah terdaftar tetapi profilnya tidak ditemukan. ` +
        "Hapus user tersebut di Supabase > Authentication > Users lalu jalankan ulang."
    );
  }

  console.log("sudah ada, dilewati");
  return rows[0].id;
}

async function setAdminPassword(userId) {
  const response = await adminFetch(`/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ password: cfg.adminPassword }),
  });

  if (!response.ok) {
    throw new Error(
      `Gagal memperbarui password admin (HTTP ${response.status}): ${JSON.stringify(response.body)}`
    );
  }
}

// ---------------------------------------------------------------- jalankan
try {
  process.stdout.write("→ Menghubungkan ke database... ");
  await client.connect();
  console.log("terhubung\n");

  const migrationsDir = path.join(projectRoot, "supabase", "migrations");
  const migrations = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrations) {
    await runSqlFile(`supabase/migrations/${file}`, file);
  }

  const adminUserId = await ensureAdminUser();

  process.stdout.write("→ Menyamakan password admin dengan SEED_ADMIN_PASSWORD... ");
  await setAdminPassword(adminUserId);
  console.log("selesai");

  process.stdout.write("→ Membuat sekolah + role default... ");
  await client.query("begin");
  try {
    const schoolResult = await client.query(
      `insert into public.schools (name, slug, level, address)
       values ($1, $2, 'SMA', '-')
       on conflict (slug) do update set name = excluded.name
       returning id`,
      [cfg.schoolName, cfg.schoolSlug]
    );
    const schoolId = schoolResult.rows[0].id;

    await client.query("select public.create_default_roles($1)", [schoolId]);

    await client.query(
      `update public.profiles
          set school_id = $1,
              is_super_admin = true,
              is_active = true,
              full_name = coalesce(nullif(full_name, ''), $2)
        where id = $3`,
      [schoolId, cfg.adminName, adminUserId]
    );

    await client.query(
      `insert into public.user_roles (user_id, role_id)
       select $1, r.id
         from public.roles r
        where r.school_id = $2 and r.slug = 'admin_sekolah'
       on conflict do nothing`,
      [adminUserId, schoolId]
    );

    await client.query("commit");
    console.log("selesai");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.log("GAGAL");
    throw error;
  }

  // ------------------------------------------------------------- verifikasi
  const school = await client.query(
    "select id, name, slug from public.schools where slug = $1",
    [cfg.schoolSlug]
  );
  const roles = await client.query(
    `select r.name,
            count(rp.permission_id)::int as permissions
       from public.roles r
       left join public.role_permissions rp on rp.role_id = r.id
      where r.school_id = $1
      group by r.id, r.name
      order by r.name`,
    [school.rows[0].id]
  );
  const permissionTotal = await client.query(
    "select count(*)::int as total from public.permissions"
  );
  const admin = await client.query(
    `select p.full_name,
            p.email,
            p.is_super_admin,
            s.name as school_name,
            coalesce(string_agg(r.name, ', ' order by r.name), '-') as roles
       from public.profiles p
       left join public.schools s on s.id = p.school_id
       left join public.user_roles ur on ur.user_id = p.id
       left join public.roles r on r.id = ur.role_id
      where p.id = $1
      group by p.id, p.full_name, p.email, p.is_super_admin, s.name`,
    [adminUserId]
  );

  console.log("\n═════════════════════ HASIL SETUP ═════════════════════");
  console.log(`Sekolah      : ${school.rows[0].name} (${school.rows[0].slug})`);
  console.log(`Permission   : ${permissionTotal.rows[0].total} baris di katalog`);
  console.log("\nRole default:");
  for (const role of roles.rows) {
    console.log(`  • ${role.name.padEnd(24)} ${role.permissions} izin`);
  }

  const adminRow = admin.rows[0];
  console.log("\nAkun admin:");
  console.log(`  Nama       : ${adminRow.full_name}`);
  console.log(`  Email      : ${adminRow.email}`);
  console.log(`  Sekolah    : ${adminRow.school_name}`);
  console.log(`  Role       : ${adminRow.roles}`);
  console.log(`  Super admin: ${adminRow.is_super_admin ? "ya" : "tidak"}`);
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n✓ Setup selesai. Jalankan `npm run dev` lalu login dengan");
  console.log(`  email ${cfg.adminEmail} dan password SEED_ADMIN_PASSWORD.\n`);
} catch (error) {
  console.error(`\n✗ Setup gagal: ${error.message}`);
  const hint = error.message.includes("ENOTFOUND")
    ? "Host database tidak ditemukan. Pastikan DATABASE_URL memakai Session pooler."
    : error.message.includes("password authentication failed")
      ? "Password database salah. Reset di Project Settings > Database."
      : error.message.includes("ETIMEDOUT") || error.message.includes("timeout")
        ? "Koneksi timeout. Cek jaringan, atau pakai connection string Session pooler."
        : undefined;
  if (hint) console.error(`  → ${hint}`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
