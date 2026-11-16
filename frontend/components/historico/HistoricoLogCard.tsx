"use client";

import React from "react";
import type { LogItem } from "@/components/HistoricoPesquisas";

interface HistoricoLogCardProps {
  log: LogItem;
  isSelected: boolean;
  formatBrasiliaDate: (dateStr?: string) => string;
  onToggleSelect: (id: string) => void;
  onDelete: (log: LogItem) => void;
}

export default function HistoricoLogCard({
  log,
  isSelected,
  formatBrasiliaDate,
  onToggleSelect,
  onDelete,
}: HistoricoLogCardProps) {
  const isSuccess = log.status === "success" || log.status === "ready";
  const isFailed = log.status === "failed";

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 transition-all ${
        isSelected ? "border-purple-500/80 shadow-lg shadow-purple-500/10" : "hover:border-purple-500/40"
      }`}
      style={{
        background: isSelected ? "rgba(127, 119, 221, 0.12)" : "#1a1535",
        border: `1px solid ${isSelected ? "rgba(127, 119, 221, 0.6)" : "rgba(127, 119, 221, 0.2)"}`,
      }}
    >
      <div className="flex items-start gap-3 min-w-[220px]">
        <input
          type="checkbox"
          data-testid={`checkbox-log-${log.id}`}
          checked={isSelected}
          onChange={() => onToggleSelect(log.id)}
          className="w-4 h-4 rounded cursor-pointer accent-purple-500 shrink-0 mt-1"
        />

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm sm:text-base" style={{ color: "#f0eeff" }}>
              {log.name || "Lead / Usuário"}
            </span>
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
              style={{
                background: isSuccess
                  ? "rgba(52, 211, 153, 0.15)"
                  : isFailed
                  ? "rgba(239, 68, 68, 0.15)"
                  : "rgba(245, 158, 11, 0.15)",
                color: isSuccess ? "#34d399" : isFailed ? "#f87171" : "#fbbf24",
                border: `1px solid ${
                  isSuccess
                    ? "rgba(52, 211, 153, 0.3)"
                    : isFailed
                    ? "rgba(239, 68, 68, 0.3)"
                    : "rgba(245, 158, 11, 0.3)"
                }`,
              }}
            >
              {isSuccess ? "✅ Mapa Gerado" : isFailed ? "❌ Falhou" : "⏳ Em Andamento"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "#8b87b8" }}>
            {log.birth_city && <span>📍 {log.birth_city}</span>}
            {log.birth_date && <span>📅 Nasc: {log.birth_date}</span>}
            {log.birth_time && <span>⏰ Hora: {log.birth_time}</span>}
            {log.email && !log.email.includes("@bussola.local") && <span>✉️ {log.email}</span>}
          </div>

          {(log.model_used || (log.cost_usd != null && log.cost_usd > 0) || (log.total_tokens != null && log.total_tokens > 0)) && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {((log.cost_usd != null && log.cost_usd > 0) || (log.total_tokens != null && log.total_tokens > 0)) && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    color: "#34d399",
                  }}
                >
                  <span>💰 Custo:</span>
                  <strong className="font-mono">{log.cost_formatted_usd || `$${(log.cost_usd || 0).toFixed(4)}`}</strong>
                  <span className="opacity-80 font-mono">({log.cost_formatted_brl || `R$ ${(log.cost_brl || 0).toFixed(4)}`})</span>
                </span>
              )}

              {log.total_tokens ? (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono"
                  style={{
                    background: "rgba(127, 119, 221, 0.1)",
                    border: "1px solid rgba(127, 119, 221, 0.2)",
                    color: "#AFA9EC",
                  }}
                >
                  <span>⚡ {log.total_tokens.toLocaleString()} tokens</span>
                  <span className="text-[10px] text-gray-400">
                    ({log.prompt_tokens?.toLocaleString() || 0} in / {log.completion_tokens?.toLocaleString() || 0} out)
                  </span>
                </span>
              ) : null}

              {log.model_used && (
                <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-purple-950/40 text-purple-300 border border-purple-800/30">
                  🤖 {log.model_used}
                </span>
              )}
            </div>
          )}

          {log.error_message && (
            <p className="text-xs font-mono mt-1 text-red-400">
              ⚠️ {log.error_message}
            </p>
          )}
        </div>
      </div>

      <div className="text-right space-y-1.5 shrink-0 ml-auto">
        <p className="text-xs font-mono" style={{ color: "#AFA9EC" }} title="Horário de Brasília">
          {formatBrasiliaDate(log.created_at)}
        </p>
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <button
            type="button"
            data-testid={`delete-log-btn-${log.id}`}
            onClick={() => onDelete(log)}
            title="Excluir este registro do histórico"
            className="text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all flex items-center gap-1 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30"
          >
            <span>🗑️</span>
            <span>Excluir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
