import { Label } from "@/components/ui/label";

/**
 * Label form dengan penanda wajib (`*` merah) atau opsional
 * (`(opsional)` abu-abu). Dipakai di seluruh form pegawai (Issue #21).
 */
export function FieldLabel({
  htmlFor,
  children,
  required,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-[10px] font-bold text-[#4c6a5e]">
      {children}
      {required ? (
        <span className="text-[#d06a5d]">*</span>
      ) : optional ? (
        <span className="text-[9px] font-medium text-[#98aaa1]">
          (opsional)
        </span>
      ) : null}
    </Label>
  );
}
