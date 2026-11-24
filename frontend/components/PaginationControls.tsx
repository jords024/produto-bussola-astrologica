"use client";

import React from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  itemName?: string;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemName = "itens",
}: PaginationControlsProps) {
  if (totalItems <= 0) return null;

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      data-testid="pagination-controls"
      className="p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs"
      style={{
        background: "#1a1535",
        border: "1px solid rgba(127, 119, 221, 0.2)",
      }}
    >
      <div style={{ color: "#8b87b8" }}>
        Exibindo <span className="font-semibold text-white">{startIndex}</span> a{" "}
        <span className="font-semibold text-white">{endIndex}</span> de{" "}
        <span className="font-semibold text-white">{totalItems}</span> {itemName} ({pageSize} por página)
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="prev-page-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="px-3.5 py-1.5 rounded-xl font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-white/10"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(127, 119, 221, 0.3)",
            color: "#f0eeff",
          }}
        >
          ← Anterior
        </button>

        <span
          data-testid="page-indicator"
          className="px-3 py-1.5 rounded-xl font-mono font-medium"
          style={{
            background: "rgba(127, 119, 221, 0.15)",
            color: "#AFA9EC",
            border: "1px solid rgba(127, 119, 221, 0.25)",
          }}
        >
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          data-testid="next-page-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="px-3.5 py-1.5 rounded-xl font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-white/10"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(127, 119, 221, 0.3)",
            color: "#f0eeff",
          }}
        >
          Próxima →
        </button>
      </div>
    </div>
  );
}
