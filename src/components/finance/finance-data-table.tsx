"use client";

import { useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, Columns3Icon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

export type FinanceTableColumn<T> = {
  key: string;
  label: string;
  searchable?: boolean;
  searchValue?: (row: T) => string;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  sticky?: boolean;
};

const SCROLLBAR_HIDDEN_STYLE = { scrollbarWidth: "none" } as const;

export function FinanceDataTable<T>({
  rows,
  columns,
  rowKey,
  search,
  onSearchChange,
  emptyLabel,
  filteredEmptyLabel,
  onRowClick,
  actions,
  selectable,
  selectedKeys,
  onSelectedKeysChange,
  showColumnToggle = true,
  toolbarClassName,
}: {
  rows: T[];
  columns: FinanceTableColumn<T>[];
  rowKey: (row: T) => string;
  search?: string;
  onSearchChange?: (value: string) => void;
  emptyLabel: string;
  filteredEmptyLabel?: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectedKeysChange?: (keys: Set<string>) => void;
  showColumnToggle?: boolean;
  toolbarClassName?: string;
}) {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => new Set(columns.map((column) => column.key)));
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchFocused, setSearchFocused] = useState(false);

  const sortedRows = useMemo(() => {
    const needle = search?.trim().toLocaleLowerCase("id") ?? "";
    const filtered = needle
      ? rows.filter((row) => columns.some((column) => column.searchable && column.searchValue?.(row).toLocaleLowerCase("id").includes(needle)))
      : rows;
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return filtered;
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((left, right) => {
      const leftValue = column.sortValue?.(left) ?? "";
      const rightValue = column.sortValue?.(right) ?? "";
      if (typeof leftValue === "number" && typeof rightValue === "number") return (leftValue - rightValue) * direction;
      return String(leftValue).localeCompare(String(rightValue), "id", { numeric: true, sensitivity: "base" }) * direction;
    });
  }, [columns, rows, search, sortDirection, sortKey]);

  const visibleColumns = columns.filter((column) => visibleKeys.has(column.key));
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = sortedRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, sortedRows.length);
  const searchScope = columns.filter((column) => column.searchable).map((column) => column.label);

  const setSort = (key: string) => {
    if (sortKey === key) setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleKeys((current) => {
      if (current.size === 1 && current.has(key)) return current;
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div>
      <div className={`mb-4 flex flex-wrap items-center justify-end gap-3 ${toolbarClassName ?? ""}`}>
        {onSearchChange ? (
          <div className="relative w-full sm:w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#91a49a]" />
            <Input
              value={search ?? ""}
              onChange={(event) => {
                onSearchChange(event.target.value);
                setPage(1);
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Cari data..."
              className="h-[35px] rounded-[9px] border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
            />
            {searchFocused ? (
              <div className="absolute top-[calc(100%+6px)] right-0 z-40 w-full rounded-[10px] border border-[#dbe8df] bg-white p-3.5 shadow-[0_12px_32px_rgb(13_50_35/14%)]">
                <p className="text-[10px] font-bold tracking-[.06em] text-[#4d9775] uppercase">Pencarian mencakup</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {searchScope.map((label) => <span key={label} className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">{label}</span>)}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {showColumnToggle ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[#e2ece5] bg-white px-2.5 text-xs font-medium text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5]">
              <Columns3Icon className="size-4 text-[#4d8669]" /> Kolom
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-[#e2ece5] bg-white">
              {columns.map((column) => <DropdownMenuCheckboxItem key={column.key} checked={visibleKeys.has(column.key)} onCheckedChange={() => toggleColumn(column.key)}>{column.label}</DropdownMenuCheckboxItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="overflow-x-auto" style={SCROLLBAR_HIDDEN_STYLE}>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
              {selectable && selectedKeys && onSelectedKeysChange ? (
                <TableHead className="sticky left-0 z-30 w-10 bg-white px-3.5 py-2.5 shadow-[8px_0_8px_-8px_#1c44331a]">
                  <Checkbox 
                    checked={pageRows.length > 0 && pageRows.every(row => selectedKeys.has(rowKey(row)))}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(selectedKeys);
                      pageRows.forEach(row => {
                        if (checked) newSet.add(rowKey(row));
                        else newSet.delete(rowKey(row));
                      });
                      onSelectedKeysChange(newSet);
                    }}
                    className="rounded-[4px] border-[#c0cfc6] data-[state=checked]:bg-[#185743] data-[state=checked]:border-[#185743] text-white h-4 w-4"
                  />
                </TableHead>
              ) : null}
              {visibleColumns.map((column) => {
                const active = sortKey === column.key;
                const stickyClass = column.sticky 
                  ? (selectable ? "sticky left-10 z-20 bg-white pl-3.5 shadow-[8px_0_8px_-8px_#1c44331a]" : "sticky left-0 z-20 bg-white pl-6 shadow-[8px_0_8px_-8px_#1c44331a]")
                  : "";
                return (
                  <TableHead key={column.key} onClick={() => column.sortValue && setSort(column.key)} className={`px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] whitespace-nowrap ${column.sortValue ? "cursor-pointer select-none hover:text-[#2b7254]" : ""} ${stickyClass}`}>
                    <span className="inline-flex items-center gap-1.5">{column.label}{column.sortValue ? active ? sortDirection === "asc" ? <ArrowUpIcon className="size-3.5 text-[#2b7254]" /> : <ArrowDownIcon className="size-3.5 text-[#2b7254]" /> : <ArrowUpDownIcon className="size-3.5 text-[#9aaa9f]" /> : null}</span>
                  </TableHead>
                );
              })}
              {actions ? <TableHead className="sticky right-0 z-20 w-10 bg-white pr-6 text-right text-[10px] font-bold text-[#6c8279] shadow-[-8px_0_8px_-8px_#1c44331a]">Aksi</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow><TableCell colSpan={visibleColumns.length + (actions ? 1 : 0) + (selectable ? 1 : 0)} className="h-32 text-center text-sm text-[#8b9f95]">{search ? filteredEmptyLabel ?? "Tidak ada data yang cocok dengan pencarian." : emptyLabel}</TableCell></TableRow>
            ) : pageRows.map((row) => (
              <TableRow key={rowKey(row)} className={`group border-b border-[#f0f5f1] ${onRowClick ? "cursor-pointer" : ""} hover:bg-[#f6fbf7]`} onClick={() => onRowClick?.(row)}>
                {selectable && selectedKeys && onSelectedKeysChange ? (
                  <TableCell className="sticky left-0 z-20 bg-white px-3.5 py-3 align-middle shadow-[8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedKeys.has(rowKey(row))}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedKeys);
                        if (checked) newSet.add(rowKey(row));
                        else newSet.delete(rowKey(row));
                        onSelectedKeysChange(newSet);
                      }}
                      className="rounded-[4px] border-[#c0cfc6] data-[state=checked]:bg-[#185743] data-[state=checked]:border-[#185743] text-white h-4 w-4"
                    />
                  </TableCell>
                ) : null}
                {visibleColumns.map((column) => {
                  const stickyClass = column.sticky 
                    ? (selectable ? "sticky left-10 z-10 bg-white pl-3.5 shadow-[8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]" : "sticky left-0 z-10 bg-white pl-6 shadow-[8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]")
                    : "";
                  return (
                    <TableCell key={column.key} className={`px-3.5 py-3 align-middle ${stickyClass}`}>{column.render(row)}</TableCell>
                  );
                })}
                {actions ? <TableCell className="sticky right-0 z-10 bg-white px-3 py-3 pr-6 align-middle shadow-[-8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]" onClick={(event) => event.stopPropagation()}>{actions(row)}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f5f1] px-6 py-3">
          <div className="flex items-center gap-3 text-xs text-[#8b9f95]">
            Menampilkan {rangeStart}–{rangeEnd} dari {sortedRows.length}
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-[#6c8279]">Baris<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-8 rounded-[9px] border border-[#e2ece5] bg-white px-2 text-xs text-[#284a3d]">{[5, 10, 20, 30].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467]">Sebelumnya</Button>
            <span className="px-1.5 text-xs font-semibold text-[#537467]">{safePage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467]">Berikutnya</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
