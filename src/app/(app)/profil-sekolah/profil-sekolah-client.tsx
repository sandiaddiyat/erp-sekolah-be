import Link from "next/link";

/**
 * Ditampilkan ketika pengguna tidak punya sekolah (atau, untuk super admin,
 * tidak memilih sekolah lewat `?school=`), sehingga form tidak bisa dirender.
 */
export function NoSchool({
  isSuperAdmin,
  reason,
}: {
  isSuperAdmin: boolean;
  reason?: string;
}) {
  return (
    <div className="mx-auto max-w-[1190px] w-full space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#4c9a77]">
          Profil Sekolah
        </p>
        <h1 className="font-heading text-2xl font-bold text-[#183d32]">
          Belum ada data profil
        </h1>
      </div>

      <div className="rounded-[17px] border border-[#e2ece5] bg-[#fbfdfb] px-6 py-8 text-center shadow-[0_3px_7px_#1c443305]">
        <p className="text-sm text-[#82978d]">
          {reason ??
            (isSuperAdmin
              ? "Pilih sekolah yang profilnya ingin dikelola dari halaman Sekolah."
              : "Akun Anda belum tertaut ke sekolah mana pun. Hubungi administrator sekolah Anda.")}
        </p>
        <Link
          href={isSuperAdmin ? "/sekolah" : "/dashboard"}
          className="mt-4 inline-flex h-9 items-center rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
        >
          {isSuperAdmin ? "Ke halaman Sekolah" : "Kembali ke Dashboard"}
        </Link>
      </div>
    </div>
  );
}
