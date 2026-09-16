import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser } from "@/lib/types";
import type {
  SaveBillInput,
  SaveBillItemInput,
  SavePaymentInput,
  VerifyPaymentInput,
} from "./schema";

/**
 * Service layer fitur keuangan: berisi ATURAN MAINNYA SAJA — tanpa FormData,
 * tanpa revalidatePath, tanpa Next.js. Dependency (client Supabase)
 * di-inject lewat parameter sehingga bisa di-mock saat testing.
 */
export type KeuanganMutationsDeps = {
  supabase: SupabaseClient<Database>;
};

type BillPayload = Database["public"]["Tables"]["bills"]["Insert"];
type PaymentPayload = Database["public"]["Tables"]["payments"]["Insert"];

/** Pesan ramah untuk pelanggaran unique tagihan ganda dalam satu sekolah. */
function duplicateMessage(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  if (code === "23505" || /duplicate key/i.test(message)) {
    return "Tagihan dengan deskripsi yang sama untuk siswa ini sudah ada.";
  }
  return null;
}

/**
 * Buat tagihan baru untuk seorang siswa.
 * `school_id` SELALU dari user yang login — bukan dari input form.
 */
export async function createBillRecord(
  deps: KeuanganMutationsDeps,
  current: CurrentUser,
  command: SaveBillInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult("Hanya admin sekolah yang boleh mengelola tagihan.");
  }

  const payload: BillPayload = {
    school_id: schoolId,
    student_id: command.student_id,
    bill_item_id: command.bill_item_id || null,
    deskripsi: command.deskripsi,
    nominal: command.nominal,
    diskon: command.diskon ?? 0,
    diskon_keterangan: command.diskon_keterangan || null,
    jatuh_tempo: command.jatuh_tempo || null,
  };

  const { error } = await deps.supabase.from("bills").insert(payload);

  if (error) {
    return errResult(
      serverError(error, duplicateMessage(error) ?? "Gagal membuat tagihan.")
    );
  }

  return okResult(`Tagihan "${command.deskripsi}" berhasil dibuat.`);
}

/**
 * Catat pembayaran untuk sebuah tagihan. Payment berstatus `menunggu`
 * sampai diverifikasi petugas.
 */
export async function recordPaymentRecord(
  deps: KeuanganMutationsDeps,
  current: CurrentUser,
  command: SavePaymentInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult("Hanya admin sekolah yang boleh mencatat pembayaran.");
  }

  // Pastikan tagihan milik sekolah yang sama dan masih bisa dibayar.
  const billResult = await deps.supabase
    .from("bills")
    .select("id, status, nominal, diskon")
    .eq("id", command.bill_id)
    .eq("school_id", schoolId)
    .single();

  const bill = billResult.data as {
    id: string;
    status: string;
    nominal: number;
    diskon: number;
  } | null;
  if (billResult.error || !bill) {
    return errResult("Tagihan tidak ditemukan.");
  }
  if (bill.status === "lunas") {
    return errResult("Tagihan ini sudah lunas.");
  }
  if (bill.status === "batal") {
    return errResult("Tagihan ini sudah dibatalkan.");
  }

  // Pembayaran tidak boleh melebihi sisa tagihan (total setelah diskon
  // dikurangi pembayaran terverifikasi yang sudah ada).
  const terverifikasi = await deps.supabase
    .from("payments")
    .select("nominal")
    .eq("bill_id", command.bill_id)
    .eq("school_id", schoolId)
    .eq("status", "terverifikasi");

  const totalTerverifikasi = ((terverifikasi.data as { nominal: number }[] | null) ?? [])
    .reduce((sum, p) => sum + Number(p.nominal), 0);
  const totalTagihan = Number(bill.nominal) - Number(bill.diskon ?? 0);
  const sisa = totalTagihan - totalTerverifikasi;
  if (command.nominal > sisa) {
    return errResult(
      `Nominal melebihi sisa tagihan. Sisa: ${sisa.toLocaleString("id-ID")}.`
    );
  }

  const payload: PaymentPayload = {
    school_id: schoolId,
    bill_id: command.bill_id,
    dicatat_oleh: current.id,
    nominal: command.nominal,
    metode: command.metode,
    bukti_url: command.bukti_url || null,
    catatan: command.catatan || null,
    status: "menunggu",
  };

  const { error } = await deps.supabase.from("payments").insert(payload);

  if (error) {
    return errResult(serverError(error, "Gagal mencatat pembayaran."));
  }

  // Tandai tagihan menunggu verifikasi agar petugas tahu ada konfirmasi baru.
  const { error: billError } = await deps.supabase
    .from("bills")
    .update({ status: "menunggu_verifikasi" })
    .eq("id", command.bill_id)
    .eq("school_id", schoolId);

  if (billError) {
    return errResult(
      serverError(billError, "Pembayaran tercatat namun gagal memperbarui status tagihan.")
    );
  }

  return okResult("Pembayaran tercatat, menunggu verifikasi petugas.");
}

/**
 * Verifikasi atau tolak pembayaran. Saat disetujui, tagihan menjadi `lunas`;
 * saat ditolak, tagihan kembali `belum_bayar` kecuali ada pembayaran lain
 * yang sudah terverifikasi.
 */
export async function verifyPaymentRecord(
  deps: KeuanganMutationsDeps,
  current: CurrentUser,
  command: VerifyPaymentInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult("Hanya admin sekolah yang boleh memverifikasi pembayaran.");
  }

  // Ambil payment milik sekolah ini yang masih menunggu.
  const paymentResult = await deps.supabase
    .from("payments")
    .select("id, bill_id, status")
    .eq("id", command.payment_id)
    .eq("school_id", schoolId)
    .single();

  const payment = paymentResult.data as {
    id: string;
    bill_id: string;
    status: string;
  } | null;
  if (paymentResult.error || !payment) {
    return errResult("Pembayaran tidak ditemukan.");
  }
  if (payment.status !== "menunggu") {
    return errResult("Pembayaran ini sudah diproses sebelumnya.");
  }

  const sekarang = new Date().toISOString();

  const { error: updateError } = await deps.supabase
    .from("payments")
    .update({
      status: command.keputusan,
      diverifikasi_oleh: current.id,
      diverifikasi_pada: sekarang,
    })
    .eq("id", command.payment_id)
    .eq("school_id", schoolId);

  if (updateError) {
    return errResult(serverError(updateError, "Gagal memproses verifikasi."));
  }

  // Sinkronkan status tagihan sesuai keputusan.
  // Total yang harus dibayar = nominal - diskon. Lunas hanya bila total
  // pembayaran terverifikasi mencapai total tersebut; jika belum, berstatus
  // `cicilan` (masih ada sisa).
  const terverifikasi = await deps.supabase
    .from("payments")
    .select("nominal, status")
    .eq("bill_id", payment.bill_id)
    .eq("school_id", schoolId);

  const daftar = (terverifikasi.data as { nominal: number; status: string }[] | null) ?? [];
  const totalTerverifikasi = daftar
    .filter((p) => p.status === "terverifikasi")
    .reduce((sum, p) => sum + Number(p.nominal), 0);

  const billResult = await deps.supabase
    .from("bills")
    .select("nominal, diskon")
    .eq("id", payment.bill_id)
    .eq("school_id", schoolId)
    .single();

  const bill = billResult.data as { nominal: number; diskon: number } | null;
  if (!bill) {
    return errResult("Tagihan tidak ditemukan.");
  }
  const totalTagihan = Number(bill.nominal) - Number(bill.diskon ?? 0);
  const sudahLunas = totalTerverifikasi >= totalTagihan;

  if (command.keputusan === "terverifikasi") {
    const statusBaru = sudahLunas ? "lunas" : "cicilan";
    const { error: billError } = await deps.supabase
      .from("bills")
      .update({ status: statusBaru })
      .eq("id", payment.bill_id)
      .eq("school_id", schoolId);

    if (billError) {
      return errResult(
        serverError(billError, "Verifikasi tersimpan namun gagal memperbarui tagihan.")
      );
    }
    return okResult(
      sudahLunas
        ? "Pembayaran disetujui. Tagihan telah lunas."
        : "Pembayaran cicilan disetujui. Masih ada sisa tagihan."
    );
  }

  // Ditolak: tagihan kembali sesuai pembayaran terverifikasi lainnya —
  // `cicilan` bila ada, `belum_bayar` bila tidak ada.
  const statusBaru = totalTerverifikasi > 0 ? "cicilan" : "belum_bayar";

  const { error: billError } = await deps.supabase
    .from("bills")
    .update({ status: statusBaru })
    .eq("id", payment.bill_id)
    .eq("school_id", schoolId);

  if (billError) {
    return errResult(
      serverError(billError, "Verifikasi tersimpan namun gagal memperbarui tagihan.")
    );
  }

  return okResult("Pembayaran ditolak.");
}

/** Hapus tagihan yang belum lunas. Tagihan lunas/batal tidak boleh dihapus. */
export async function deleteBillRecord(
  deps: KeuanganMutationsDeps,
  current: CurrentUser,
  billId: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult("Hanya admin sekolah yang boleh mengelola tagihan.");
  }

  const billResult = await deps.supabase
    .from("bills")
    .select("id, status")
    .eq("id", billId)
    .eq("school_id", schoolId)
    .single();

  const bill = billResult.data as { id: string; status: string } | null;
  if (billResult.error || !bill) {
    return errResult("Tagihan tidak ditemukan.");
  }
  if (bill.status === "lunas") {
    return errResult("Tagihan yang sudah lunas tidak dapat dihapus.");
  }

  const { error } = await deps.supabase
    .from("bills")
    .delete()
    .eq("id", billId)
    .eq("school_id", schoolId);

  if (error) {
    return errResult(serverError(error, "Gagal menghapus tagihan."));
  }

  return okResult("Tagihan berhasil dihapus.");
}

/**
 * Simpan jenis tagihan (katalog): buat bila tanpa `id`, ubah bila ada.
 * Dipakai petugas ber-izin finance.bill_create; RLS menegakkan ulang.
 */
export async function saveBillItemRecord(
  deps: KeuanganMutationsDeps,
  current: CurrentUser,
  command: SaveBillItemInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult("Hanya admin sekolah yang boleh mengelola jenis tagihan.");
  }

  const payload = {
    school_id: schoolId,
    nama_item: command.nama_item,
    nominal: command.nominal,
    frekuensi: command.frekuensi,
  };

  if (command.id) {
    const { error } = await deps.supabase
      .from("bill_items")
      .update(payload)
      .eq("id", command.id)
      .eq("school_id", schoolId);

    if (error) {
      return errResult(
        serverError(
          error,
          duplicateMessage(error) ?? "Gagal memperbarui jenis tagihan."
        )
      );
    }
    return okResult(`Jenis tagihan ${command.nama_item} berhasil diperbarui.`);
  }

  const { error } = await deps.supabase.from("bill_items").insert(payload);

  if (error) {
    return errResult(
      serverError(
        error,
        duplicateMessage(error) ?? "Gagal menambahkan jenis tagihan."
      )
    );
  }

  return okResult(`Jenis tagihan ${command.nama_item} berhasil ditambahkan.`);
}

/** Hapus jenis tagihan dari katalog sekolah yang sedang login. */
export async function deleteBillItemRecord(
  deps: KeuanganMutationsDeps,
  current: CurrentUser,
  billItemId: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult("Hanya admin sekolah yang boleh mengelola jenis tagihan.");
  }

  const { error } = await deps.supabase
    .from("bill_items")
    .delete()
    .eq("id", billItemId)
    .eq("school_id", schoolId);

  if (error) {
    return errResult(serverError(error, "Gagal menghapus jenis tagihan."));
  }

  return okResult("Jenis tagihan berhasil dihapus.");
}
