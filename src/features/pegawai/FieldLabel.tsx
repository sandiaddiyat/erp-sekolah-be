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
    <Label htmlFor={htmlFor}>
      {children}
      {required ? (
        <span className="ml-0.5 text-destructive">*</span>
      ) : optional ? (
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          (opsional)
        </span>
      ) : null}
    </Label>
  );
}
