"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type MultiSelectOption = { value: string; label: string };

/**
 * Multi-select searchable tanpa library/portal baru: tombol toggle membuka
 * panel inline berisi input filter + daftar checkbox (opsi diurutkan berdasar
 * nama), chip terpilih tampil di bawahnya.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Pilih...",
  emptyText = "Tidak ada opsi",
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label)),
    [options]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter((option) =>
      option.label.toLowerCase().includes(needle)
    );
  }, [sorted, query]);

  const labelByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options]
  );

  const toggle = (value: string, checked: boolean) => {
    onChange(
      checked
        ? [...selected, value]
        : selected.filter((item) => item !== value)
    );
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
          {selected.length > 0 ? `${selected.length} dipilih` : placeholder}
        </span>
        <ChevronDownIcon
          className={cn("size-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="space-y-2 rounded-lg border bg-popover p-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari..."
            className="h-8"
          />
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {emptyText}
              </p>
            ) : (
              filtered.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <div key={option.value} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted">
                    <Checkbox
                      id={`multiselect_${option.value}`}
                      checked={checked}
                      onCheckedChange={(next) =>
                        toggle(option.value, Boolean(next))
                      }
                    />
                    <Label
                      htmlFor={`multiselect_${option.value}`}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <span
              key={value}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {labelByValue.get(value) ?? value}
              <button
                type="button"
                aria-label="Hapus"
                onClick={() => toggle(value, false)}
                className="rounded-full hover:text-destructive"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
