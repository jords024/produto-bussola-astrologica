"use client";

import React from "react";

interface UsersBatchActionsBarProps {
  selectableInPageCount: number;
  totalSelectableCount: number;
  selectedCount: number;
  isAllSelectedInPage: boolean;
  isAllSelectedAcrossAll: boolean;
  onToggleSelectAllInPage: () => void;
  onSelectAllAcrossAll: () => void;
  onClearSelection: () => void;
  onOpenBatchAccessProfiles: () => void;
  onOpenBatchLimits: () => void;
  onOpenBatchDelete: () => void;
}

export default function UsersBatchActionsBar({
  selectableInPageCount,
  totalSelectableCount,
  selectedCount,
  isAllSelectedInPage,
  isAllSelectedAcrossAll,
  onToggleSelectAllInPage,
  onSelectAllAcrossAll,
  onClearSelection,
  onOpenBatchAccessProfiles,
  onOpenBatchLimits,
  onOpenBatchDelete,
}: UsersBatchActionsBarProps) {
  return (
    <div
      data-testid="users-batch-bar"
      className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs"
      style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2.5 cursor-pointer font-medium select-none" style={{ color: "#f0eeff" }}>
          <input
            type="checkbox"
            data-testid="select-all-users-btn"
            checked={isAllSelectedInPage}
            onChange={onToggleSelectAllInPage}
            className="w-4 h-4 rounded cursor-pointer accent-purple-500"
          />
          <span>Selecionar todos da página ({selectableInPageCount})</span>
        </label>

        {totalSelectableCount > selectableInPageCount && selectedCount > 0 && !isAllSelectedAcrossAll && (
          <button
            type="button"
            data-testid="select-all-across-pages-btn"
            onClick={onSelectAllAcrossAll}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all hover:brightness-110"
            style={{
              background: "rgba(56, 189, 248, 0.14)",
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.35)",
            }}
          >
            Selecionar todos os {totalSelectableCount} usuários
          </button>
        )}

        {isAllSelectedAcrossAll && totalSelectableCount > selectableInPageCount && (
          <span
            data-testid="all-users-selected-badge"
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{
              background: "rgba(52, 211, 153, 0.14)",
              color: "#34d399",
              border: "1px solid rgba(52, 211, 153, 0.35)",
            }}
          >
            Todos os {totalSelectableCount} usuários selecionados
          </span>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-semibold" style={{ color: "#AFA9EC" }}>
            {selectedCount} selecionado(s)
          </span>
          <button
            type="button"
            data-testid="clear-selection-users-btn"
            onClick={onClearSelection}
            className="px-2.5 py-1 rounded-lg text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Limpar
          </button>
          <button
            type="button"
            data-testid="batch-edit-access-profiles-btn"
            onClick={onOpenBatchAccessProfiles}
            className="px-3.5 py-1.5 rounded-xl font-bold bg-sky-500/20 text-sky-200 border border-sky-400/40 hover:bg-sky-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-lg shadow-sky-500/10"
          >
            <span>⏳</span>
            <span>Acesso e Perfis</span>
          </button>
          <button
            type="button"
            data-testid="batch-edit-limits-btn"
            onClick={onOpenBatchLimits}
            className="px-3.5 py-1.5 rounded-xl font-bold bg-[#7F77DD]/25 text-[#d6d3ff] border border-[#7F77DD]/45 hover:bg-[#7F77DD]/35 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-lg shadow-[#7F77DD]/10"
          >
            <span>⚡</span>
            <span>Editar Limites de IA</span>
          </button>
          <button
            type="button"
            data-testid="batch-delete-users-btn"
            onClick={onOpenBatchDelete}
            className="px-3.5 py-1.5 rounded-xl font-bold bg-rose-500/20 text-rose-300 border border-rose-500/35 hover:bg-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-lg shadow-rose-500/10"
          >
            <span>🗑️</span>
            <span>Excluir Selecionados</span>
          </button>
        </div>
      )}
    </div>
  );
}
