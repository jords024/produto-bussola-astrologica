"use client";

import React from "react";
import type { FinanceiroUserItem } from "./Financeiro";

interface FinanceiroSelectionPopupProps {
  selectedUsers: FinanceiroUserItem[];
  onClearSelection: () => void;
}

export default function FinanceiroSelectionPopup({
  selectedUsers,
  onClearSelection,
}: FinanceiroSelectionPopupProps) {
  if (selectedUsers.length === 0) return null;

  const totals = selectedUsers.reduce(
    (acc, user) => ({
      readings: acc.readings + (user.readings_count || 0),
      tokens: acc.tokens + (user.total_tokens || 0),
      costUsd: acc.costUsd + (user.cost_usd || 0),
      costBrl: acc.costBrl + (user.cost_brl || 0),
    }),
    { readings: 0, tokens: 0, costUsd: 0, costBrl: 0 }
  );

  const formatUsd = (val: number) => `$${val.toFixed(4)}`;
  const formatBrl = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;
  const formatTokens = (val: number) => val.toLocaleString("pt-BR");

  return (
    <div
      data-testid="financeiro-selection-popup"
      role="region"
      aria-label="Resumo das pessoas selecionadas"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-4xl rounded-2xl p-4 sm:px-6 sm:py-4 backdrop-blur-xl shadow-2xl transition-all"
      style={{
        background: "rgba(26, 21, 53, 0.94)",
        border: "1px solid rgba(127, 119, 221, 0.55)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.55), 0 0 24px rgba(127, 119, 221, 0.25)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: "rgba(127, 119, 221, 0.25)",
              color: "#f0eeff",
              border: "1px solid rgba(127, 119, 221, 0.5)",
            }}
            data-testid="selection-popup-count"
          >
            {selectedUsers.length} {selectedUsers.length === 1 ? "selecionada" : "selecionadas"}
          </span>
          <span className="text-xs font-medium hidden sm:inline" style={{ color: "#8b87b8" }}>
            Resumo acumulado
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "#8b87b8" }}>
              Leituras
            </div>
            <div data-testid="selection-popup-readings" className="text-sm sm:text-base font-bold" style={{ color: "#f0eeff" }}>
              {totals.readings}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "#8b87b8" }}>
              Soma dos Tokens
            </div>
            <div data-testid="selection-popup-tokens" className="text-sm sm:text-base font-bold" style={{ color: "#AFA9EC" }}>
              {formatTokens(totals.tokens)}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "#8b87b8" }}>
              Gasto (USD)
            </div>
            <div data-testid="selection-popup-usd" className="text-sm sm:text-base font-bold text-emerald-300">
              {formatUsd(totals.costUsd)}
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "#8b87b8" }}>
              Gasto (BRL)
            </div>
            <div data-testid="selection-popup-brl" className="text-sm sm:text-base font-bold text-emerald-200">
              {formatBrl(totals.costBrl)}
            </div>
          </div>

          <button
            type="button"
            data-testid="financeiro-clear-selection-btn"
            onClick={onClearSelection}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer hover:brightness-110 active:scale-95"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              color: "#f0eeff",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}
