"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { serverError } from "@/lib/errors";
import { validatePassword } from "@/lib/password";
import { slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SchoolStatus } from "@/lib/types";

export type FormState = { error?: string; success?: string } | undefined;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const schoolSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(3, "Nama sekolah minimal 3 karakter"),
  slug: z.string().trim().optional(),
  npsn: z.string().trim().optional(),
  level: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  status: z.enum(["trial", "active", "suspended"]),
  active_until: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

function revalidateSchoolPages() {
  revalidatePath("/sekolah");
  revalidatePath("/users");
  revalidatePath("/roles");
  revalidatePath("/dashboard");
}

async function saveSchoolNote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
  note: string | null
) {
  const { error: deleteError } = await supabase
    .from("school_notes")
    .delete()
    .eq("school_id", schoolId);

  if (deleteError) return deleteError;

  if (note) {
    const { error: insertError } = await supabase
      .from("school_notes")
      .insert({ school_id: schoolId, note });
    if (insertError) return insertError;
  }

  return null;
}

export async function saveSchool(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) return { error: "Sesi Anda berakhir. Silakan login ulang." };
  if (!current.isSuperAdmin) {
    return { error: "Hanya super admin yang boleh mengelola sekolah." };
  }

  const parsed = schoolSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    npsn: formData.get("npsn") ?? "",
    level: formData.get("level") ?? "",
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    status: formData.get("status") ?? "trial",
    active_until: formData.get("active_until") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const data = parsed.data;
  const email = data.email || null;
  const activeUntil = data.active_until || null;

  if (email && !EMAIL_PATTERN.test(email)) {
    return { error: "Format email sekolah tidak valid." };
  }
  if (activeUntil && !DATE_PATTERN.test(activeUntil)) {
    return { error: "Format tanggal masa aktif tidak valid." };
  }

  const supabase = await createClient();

  if (data.id) {
    const { data: target } = await supabase
      .from("schools")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();

    if (!target) return { error: "Sekolah tidak ditemukan." };

    const { error } = await supabase
      .from("schools")
      .update({
        name: data.name,
        npsn: data.npsn || null,
        level: data.level || null,
        address: data.address || null,
        phone: data.phone || null,
        email,
        status: data.status,
        active_until: activeUntil,
        is_active: data.status !== "suspended",
      })
      .eq("id", data.id);

    if (error) return { error: serverError(error, "Gagal memperbarui sekolah.") };

    const noteError = await saveSchoolNote(supabase, data.id, data.notes || null);
    if (noteError) {
      return { error: serverError(noteError, "Gagal menyimpan catatan sekolah.") };
    }

    revalidateSchoolPages();
    return { success: `Data ${data.name} berhasil diperbarui.` };
  }

  const slug = slugify(data.slug || data.name, "-", "sekolah");

  const { data: createdId, error: createError } = await supabase.rpc(
    "create_school",
    {
      p_name: data.name,
      p_slug: slug,
      p_npsn: data.npsn || null,
      p_level: data.level || null,
      p_address: data.address || null,
      p_phone: data.phone || null,
      p_email: email,
      p_status: data.status,
      p_active_until: activeUntil,
    }
  );

  if (createError || !createdId) {
    if (
      createError?.code === "23505" ||
      /duplicate key/i.test(createError?.message ?? "")
    ) {
      return { error: `Slug "${slug}" sudah dipakai sekolah lain.` };
    }
    return { error: serverError(createError, "Gagal membuat sekolah.") };
  }

  const schoolId = createdId as string;

  const noteError = await saveSchoolNote(supabase, schoolId, data.notes || null);
  if (noteError) {
    return { error: serverError(noteError, "Sekolah dibuat, tetapi catatan gagal disimpan.") };
  }

  revalidateSchoolPages();

  // Admin pertama opsional. Kalau gagal, sekolahnya tetap sudah jadi dan
  // pesannya menjelaskan bahwa admin bisa ditambahkan lewat menu User.
  const wantsAdmin = formData.get("create_admin") === "true";
  if (!wantsAdmin) {
    return { success: `Sekolah ${data.name} berhasil didaftarkan.` };
  }

  const adminName = String(formData.get("admin_name") ?? "").trim();
  const adminEmail = String(formData.get("admin_email") ?? "")
    .trim()
    .toLowerCase();
  const adminPassword = String(formData.get("admin_password") ?? "");

  const followUp =
    "Sekolah sudah dibuat. Tambahkan adminnya lewat menu User → Tambah User.";

  if (adminName.length < 2) {
    return { error: `Nama admin tidak valid. ${followUp}` };
  }
  if (!EMAIL_PATTERN.test(adminEmail)) {
    return { error: `Email admin tidak valid. ${followUp}` };
  }
  const passwordError = validatePassword(adminPassword);
  if (passwordError) {
    return { error: `${passwordError} ${followUp}` };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return {
      error: `${
        error instanceof Error ? error.message : "Service role key belum diisi."
      } ${followUp}`,
    };
  }

  const { data: created, error: adminError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminName },
  });

  if (adminError || !created?.user) {
    return {
      error: serverError(
        adminError,
        "Sekolah sudah dibuat, tetapi akun admin gagal dibuat."
      ),
    };
  }

  const adminUserId = created.user.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      school_id: schoolId,
      full_name: adminName,
      jabatan: "Administrator",
      is_active: true,
    })
    .eq("id", adminUserId);

  if (profileError) {
    return {
      error: serverError(
        profileError,
        "Akun admin dibuat, tetapi gagal dihubungkan ke sekolah."
      ),
    };
  }

  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("school_id", schoolId)
    .eq("slug", "admin_sekolah")
    .maybeSingle();

  if (role?.id) {
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: adminUserId, role_id: role.id });

    if (roleError) {
      return {
        error: serverError(roleError, "Admin dibuat, tetapi role gagal diberikan."),
      };
    }
  }

  revalidateSchoolPages();
  return {
    success: `Sekolah ${data.name} berhasil didaftarkan beserta akun admin ${adminEmail}.`,
  };
}

export async function setSchoolStatus(
  schoolId: string,
  status: SchoolStatus
): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) return { error: "Sesi Anda berakhir." };
  if (!current.isSuperAdmin) {
    return { error: "Hanya super admin yang boleh mengelola sekolah." };
  }

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("schools")
    .select("id, name")
    .eq("id", schoolId)
    .maybeSingle();

  if (!target) return { error: "Sekolah tidak ditemukan." };

  const { error } = await supabase
    .from("schools")
    .update({ status, is_active: status !== "suspended" })
    .eq("id", schoolId);

  if (error) return { error: serverError(error, "Gagal mengubah status sekolah.") };

  revalidateSchoolPages();
  return {
    success: `${target.name} ${
      status === "suspended" ? "dihentikan sementara" : "diaktifkan kembali"
    }.`,
  };
}
