import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const BUTTON_CLASS = "h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]";

export function TablePaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const goToPage = (nextPage: number) => onPageChange(Math.min(Math.max(1, nextPage), safeTotalPages));

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Halaman pertama"
        title="Halaman pertama"
        disabled={safePage <= 1}
        onClick={() => goToPage(1)}
        className={BUTTON_CLASS}
      >
        <ChevronsLeftIcon className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={safePage <= 1}
        onClick={() => goToPage(safePage - 1)}
        className={BUTTON_CLASS}
      >
        Sebelumnya
      </Button>
      <label className="flex items-center gap-1 text-[10px] font-bold text-[#6c8279]">
        <span className="sr-only">Nomor halaman</span>
        <input
          aria-label="Nomor halaman"
          type="number"
          min={1}
          max={safeTotalPages}
          value={safePage}
          onChange={(event) => {
            if (event.target.value === "") return;
            goToPage(Number(event.target.value));
          }}
          className="h-8 w-14 rounded-[9px] border border-[#e1ebe4] bg-white px-2 text-center text-xs font-semibold text-[#537467] outline-none focus:border-[#9dc7a8] focus:ring-3 focus:ring-[#4f9970]/10"
        />
        <span>/ {safeTotalPages}</span>
      </label>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={safePage >= safeTotalPages}
        onClick={() => goToPage(safePage + 1)}
        className={BUTTON_CLASS}
      >
        Berikutnya
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Halaman terakhir"
        title="Halaman terakhir"
        disabled={safePage >= safeTotalPages}
        onClick={() => goToPage(safeTotalPages)}
        className={BUTTON_CLASS}
      >
        <ChevronsRightIcon className="size-3.5" />
      </Button>
    </div>
  );
}
