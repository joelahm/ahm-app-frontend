"use client";

import type { Key, ReactNode, HTMLAttributes } from "react";
import type { Selection } from "@react-types/shared";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  DashboardTableAction,
  DashboardTableShell,
} from "@/components/dashboard/dashboard-table-shell";

export interface DashboardDataTableColumn<TItem> {
  key: string;
  label: string;
  className?: string;
  renderCell: (item: TItem) => ReactNode;
}

interface DashboardDataTableProps<TItem> {
  title: ReactNode;
  headerActions?: DashboardTableAction[];
  headerRight?: ReactNode;
  topContent?: ReactNode;
  rows: TItem[];
  columns: DashboardDataTableColumn<TItem>[];
  ariaLabel?: string;
  getRowKey: (item: TItem) => Key;
  enableSelection?: boolean;
  selectedKeys?: Selection;
  onSelectionChange?: (keys: Selection) => void;
  showPagination?: boolean;
  serverPagination?: boolean;
  totalPages?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  withShell?: boolean;
  getRowProps?: (item: TItem) => HTMLAttributes<HTMLTableRowElement>;
}

const getPageItems = (
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const pages = new Set<number>([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  const validPages = Array.from(pages)
    .filter((page) => page > 1 && page < totalPages)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [1];

  for (const page of validPages) {
    const last = items[items.length - 1];

    if (typeof last === "number" && page - last > 1) {
      items.push("ellipsis");
    }

    items.push(page);
  }

  const last = items[items.length - 1];

  if (typeof last === "number" && totalPages - last > 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);

  return items;
};

export const DashboardDataTable = <TItem,>({
  title,
  headerActions = [],
  headerRight,
  topContent,
  rows,
  columns,
  ariaLabel = "Dashboard data table",
  getRowKey,
  enableSelection = false,
  selectedKeys,
  onSelectionChange,
  showPagination = false,
  serverPagination = false,
  totalPages: totalPagesFromProps,
  pageSize = 8,
  currentPage,
  onPageChange,
  withShell = true,
  getRowProps,
}: DashboardDataTableProps<TItem>) => {
  const [internalPage, setInternalPage] = useState(1);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalPages = showPagination
    ? Math.max(
        1,
        serverPagination
          ? (totalPagesFromProps ?? 1)
          : Math.ceil(rows.length / Math.max(1, pageSize)),
      )
    : 1;

  const activePage = currentPage ?? internalPage;

  const safePage = Math.min(Math.max(1, activePage), totalPages);

  const paginatedRows = useMemo(() => {
    if (!showPagination || serverPagination) {
      return rows;
    }

    const start = (safePage - 1) * pageSize;

    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize, showPagination, serverPagination]);

  const pageItems = useMemo(
    () => getPageItems(safePage, totalPages),
    [safePage, totalPages],
  );

  const updatePage = (nextPage: number) => {
    const bounded = Math.min(Math.max(1, nextPage), totalPages);

    if (onPageChange) {
      onPageChange(bounded);

      return;
    }

    setInternalPage(bounded);
  };

  const content = (
    <>
      {topContent ? (
        <div className="border-b border-default-200 px-5 py-3">
          {topContent}
        </div>
      ) : null}
      {isMounted ? (
        <Table
          removeWrapper
          aria-label={ariaLabel}
          classNames={{
            table: "border-collapse border-spacing-0",
            thead: "[&_tr]:rounded-none",
            tbody:
              "[&_tr]:rounded-none [&_tr]:border-b [&_tr]:border-default-200 [&_tr:nth-child(even)]:bg-[#F9FAFB]",
            tr: "rounded-none",
            th: enableSelection
              ? "!rounded-none [&:first-child]:text-xs [&:first-child]:font-medium [&:first-child]:text-[#111827] [&:first-child]:bg-[#F9FAFB] [&:first-child]:!rounded-none"
              : "!rounded-none",
            td: "!rounded-none p-4",
          }}
          selectedKeys={enableSelection ? selectedKeys : undefined}
          selectionMode={enableSelection ? "multiple" : undefined}
          onSelectionChange={enableSelection ? onSelectionChange : undefined}
        >
          <TableHeader>
            {columns.map((column) => (
              <TableColumn key={column.key} className={column.className}>
                {column.label}
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody items={paginatedRows}>
            {(item) => (
              <TableRow
                key={getRowKey(item)}
                {...(getRowProps ? getRowProps(item) : undefined)}
              >
                {columns.map((column) => (
                  <TableCell key={`${String(getRowKey(item))}-${column.key}`}>
                    {column.renderCell(item)}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      ) : (
        <div className="h-56 rounded-lg border border-default-200 bg-white" />
      )}

      {showPagination && (
        <div className="flex items-center justify-center border-t-0 border-default-200 p-3">
          <Button
            isDisabled={safePage <= 1}
            startContent={<ChevronLeft size={20} />}
            variant="light"
            onPress={() => updatePage(safePage - 1)}
          >
            Prev
          </Button>

          <div className="flex items-center gap-1">
            {pageItems.map((item, idx) => {
              if (item === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 text-sm text-default-500"
                  >
                    ...
                  </span>
                );
              }

              const isActive = item === safePage;

              return (
                <Button
                  key={`page-${item}`}
                  className={`min-w-11 min-h-11 ${isActive ? "bg-[#022279] text-white" : ""}`}
                  radius="full"
                  variant={isActive ? "solid" : "light"}
                  onPress={() => updatePage(item)}
                >
                  {item}
                </Button>
              );
            })}
          </div>

          <Button
            endContent={<ChevronRight size={20} />}
            isDisabled={safePage >= totalPages}
            variant="light"
            onPress={() => updatePage(safePage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );

  if (!withShell) {
    return content;
  }

  return (
    <DashboardTableShell
      actions={headerActions}
      headerRight={headerRight}
      title={title}
    >
      {content}
    </DashboardTableShell>
  );
};
