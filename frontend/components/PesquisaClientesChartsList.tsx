"use client";

import React, { useEffect, useState } from "react";
import GeneratedChartCard from "./GeneratedChartCard";
import PaginationControls from "./PaginationControls";
import type { Client } from "./ClientCard";

const PAGE_SIZE = 5;

interface PesquisaClientesChartsListProps {
  readyClients: Client[];
  formattedDateSelection: string;
  onOpenClient: (id: string) => void;
}

export default function PesquisaClientesChartsList({
  readyClients,
  formattedDateSelection,
  onOpenClient,
}: PesquisaClientesChartsListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(readyClients.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [readyClients.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (readyClients.length === 0) return null;

  const pagedClients = readyClients.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div data-testid="generated-charts-section" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌌</span>
          <h3 className="font-bold text-base" style={{ color: "#f0eeff" }}>
            {readyClients.length === 1
              ? "Mapa Astral Gerado"
              : `Mapas Astrais Gerados (${readyClients.length})`}
          </h3>
        </div>
        <div
          data-testid="header-date-range-badge"
          className="px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          style={{
            background: "rgba(127, 119, 221, 0.2)",
            color: "#AFA9EC",
            border: "1px solid rgba(127, 119, 221, 0.35)",
          }}
        >
          <span>🔍 Filtro de Busca:</span>
          <span>{formattedDateSelection}</span>
        </div>
      </div>

      {pagedClients.map((c) => (
        <GeneratedChartCard
          key={c.id}
          clientId={c.id}
          onOpenClient={onOpenClient}
        />
      ))}

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={readyClients.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        itemName="mapas"
      />
    </div>
  );
}
