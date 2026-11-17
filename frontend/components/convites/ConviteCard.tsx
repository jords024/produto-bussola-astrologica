"use client";

import React from "react";
import type { PanelInvite } from "@/components/ListaConvites";

interface ConviteCardProps {
  inv: PanelInvite;
  isCopied: boolean;
  isSelected: boolean;
  fullUrl: string;
  formatBrasiliaDate: (dateStr?: string | null) => string;
  onToggleSelect: (id: string) => void;
  onCopy: (inv: PanelInvite) => void;
  onDelete: (inv: PanelInvite) => void;
}

export default function ConviteCard({
  inv,
  isCopied,
  isSelected,
  fullUrl,
  formatBrasiliaDate,
  onToggleSelect,
  onCopy,
  onDelete,
}: ConviteCardProps) {
  return (
    <div
      data-testid={`invite-card-${inv.id}`}
      className={`p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 transition-all hover:border-purple-500/40 ${
        isSelected ? "border-purple-500/60 bg-purple-500/5" : ""
      }`}
      style={{
        background: isSelected ? "rgba(127, 119, 221, 0.08)" : "#1a1535",
        border: isSelected ? "1px solid rgba(127, 119, 221, 0.5)" : "1px solid rgba(127, 119, 221, 0.2)",
      }}
    >
      {/* Lado Esquerdo: Checkbox, Badges e URL */}
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-[260px]">
        <input
          type="checkbox"
          data-testid={`select-invite-${inv.id}`}
          checked={isSelected}
          onChange={() => onToggleSelect(inv.id)}
          className="w-4 h-4 rounded cursor-pointer accent-purple-500 shrink-0 mt-1 sm:mt-0"
        />

        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"
              style={{
                background: inv.role === "admin" ? "rgba(239, 159, 39, 0.15)" : "rgba(52, 211, 153, 0.15)",
                color: inv.role === "admin" ? "#EF9F27" : "#34d399",
                border: `1px solid ${inv.role === "admin" ? "rgba(239, 159, 39, 0.3)" : "rgba(52, 211, 153, 0.3)"}`,
              }}
            >
              {inv.role === "admin" ? "🛡️ Administrador" : "🎓 Aluno"}
            </span>

            {inv.status === "active" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                ● Disponível
              </span>
            )}
            {inv.status === "used" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                ✓ Utilizado
              </span>
            )}
            {inv.status === "expired" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                ✕ Expirado
              </span>
            )}

            <span className="text-xs" style={{ color: "#8b87b8" }}>
              {inv.validity_type === "never" ? "♾️ Nunca expira" : `⏱️ Validade de ${inv.validity_type}`}
            </span>

            {inv.role === "client" && inv.access_days && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                ⏳ Acesso: {inv.access_days} dias
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              readOnly
              value={fullUrl}
              className="w-full text-xs font-mono px-3 py-1.5 rounded-xl select-all outline-none truncate"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(127, 119, 221, 0.25)",
                color: "#f0eeff",
              }}
            />
            <button
              type="button"
              onClick={() => onCopy(inv)}
              data-testid="copy-invite-url-btn"
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1"
              style={{
                background: isCopied ? "rgba(52, 211, 153, 0.2)" : "linear-gradient(135deg, #7F77DD, #534ab3)",
                color: isCopied ? "#34d399" : "#ffffff",
                border: isCopied ? "1px solid #34d399" : "none",
              }}
            >
              <span>{isCopied ? "✓" : "📋"}</span>
              <span>{isCopied ? "Copiado" : "Copiar"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lado Direito: Datas e Ação de Exclusão */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right space-y-1 text-xs" style={{ color: "#8b87b8" }}>
          <p>
            <strong style={{ color: "#AFA9EC" }}>Criado em:</strong> {formatBrasiliaDate(inv.created_at)}
          </p>
          {inv.is_used && inv.used_at && (
            <p className="text-purple-300">
              <strong>Utilizado em:</strong> {formatBrasiliaDate(inv.used_at)}
            </p>
          )}
          {!inv.is_used && inv.expires_at && (
            <p className={inv.status === "expired" ? "text-red-400" : "text-amber-300"}>
              <strong>Expira em:</strong> {formatBrasiliaDate(inv.expires_at)}
            </p>
          )}
        </div>

        <button
          type="button"
          data-testid={`delete-invite-btn-${inv.id}`}
          onClick={() => onDelete(inv)}
          className="p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all hover:bg-rose-500/25 active:scale-95 cursor-pointer"
          style={{
            background: "rgba(244, 63, 94, 0.12)",
            color: "#fda4af",
            border: "1px solid rgba(244, 63, 94, 0.3)",
          }}
          title="Excluir este convite"
        >
          <span>🗑️</span>
          <span className="hidden sm:inline">Excluir</span>
        </button>
      </div>
    </div>
  );
}
