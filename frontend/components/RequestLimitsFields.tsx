"use client";

import React from "react";

export type RequestLimitMode = "strict" | "quota_then_daily";

interface RequestLimitsFieldsProps {
  role: string;
  limitMode?: RequestLimitMode;
  onLimitModeChange?: (val: RequestLimitMode) => void;
  unlimitedDaily: boolean;
  onUnlimitedDailyChange: (val: boolean) => void;
  dailyLimit: string;
  onDailyLimitChange: (val: string) => void;
  unlimitedTotal: boolean;
  onUnlimitedTotalChange: (val: boolean) => void;
  totalLimit: string;
  onTotalLimitChange: (val: string) => void;
}

export default function RequestLimitsFields({
  role,
  limitMode = "strict",
  onLimitModeChange,
  unlimitedDaily,
  onUnlimitedDailyChange,
  dailyLimit,
  onDailyLimitChange,
  unlimitedTotal,
  onUnlimitedTotalChange,
  totalLimit,
  onTotalLimitChange,
}: RequestLimitsFieldsProps) {
  if (role === "admin") {
    return null;
  }

  const isQuotaThenDaily = limitMode === "quota_then_daily";

  const handleSelectMode = (nextMode: RequestLimitMode) => {
    onLimitModeChange?.(nextMode);
    if (nextMode === "quota_then_daily") {
      if (unlimitedTotal) onUnlimitedTotalChange(false);
      if (unlimitedDaily) onUnlimitedDailyChange(false);
    }
  };

  return (
    <div
      data-testid="request-limits-fields"
      className="p-3.5 rounded-xl space-y-3"
      style={{
        background: "rgba(127, 119, 221, 0.06)",
        border: "1px solid rgba(127, 119, 221, 0.25)",
      }}
    >
      <div>
        <div className="text-xs font-semibold" style={{ color: "#f0eeff" }}>
          ⚡ Limites de Leituras do Dia (IA)
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: "#8b87b8" }}>
          Controla apenas novas gerações com IA (reset diário à meia-noite, horário de Brasília).
        </div>
      </div>

      {/* Modo de Limite */}
      {onLimitModeChange && (
        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <div className="text-[11px] font-medium" style={{ color: "#AFA9EC" }}>
            Regra ao atingir o total
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="limit-mode-strict-btn"
              onClick={() => handleSelectMode("strict")}
              className="p-2 rounded-lg text-left transition-all cursor-pointer"
              style={{
                background: !isQuotaThenDaily ? "rgba(127, 119, 221, 0.22)" : "rgba(255, 255, 255, 0.03)",
                border: !isQuotaThenDaily ? "1px solid rgba(127, 119, 221, 0.6)" : "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="text-xs font-semibold" style={{ color: !isQuotaThenDaily ? "#f0eeff" : "#8b87b8" }}>
                🔒 Bloquear no total
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "#8b87b8" }}>
                Aplica limite diário e trava ao atingir o máximo
              </div>
            </button>

            <button
              type="button"
              data-testid="limit-mode-quota-then-daily-btn"
              onClick={() => handleSelectMode("quota_then_daily")}
              className="p-2 rounded-lg text-left transition-all cursor-pointer"
              style={{
                background: isQuotaThenDaily ? "rgba(56, 189, 248, 0.16)" : "rgba(255, 255, 255, 0.03)",
                border: isQuotaThenDaily ? "1px solid rgba(56, 189, 248, 0.6)" : "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="text-xs font-semibold" style={{ color: isQuotaThenDaily ? "#38bdf8" : "#8b87b8" }}>
                🔄 Franquia → depois diário
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "#8b87b8" }}>
                Uso livre até a franquia (ex: 100), depois X/dia
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Limite Máximo Total / Franquia Inicial */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <div className="text-[11px] font-medium" style={{ color: "#AFA9EC" }}>
          {isQuotaThenDaily ? "1. Franquia inicial livre (total)" : "Limite máximo total (conta)"}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            data-testid="total-limit-unlimited-btn"
            onClick={() => onUnlimitedTotalChange(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
            style={{
              background: unlimitedTotal ? "rgba(52, 211, 153, 0.2)" : "rgba(255, 255, 255, 0.04)",
              color: unlimitedTotal ? "#34d399" : "#8b87b8",
              border: unlimitedTotal ? "1px solid rgba(52, 211, 153, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            ∞ Ilimitado
          </button>
          <button
            type="button"
            data-testid="total-limit-custom-btn"
            onClick={() => onUnlimitedTotalChange(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
            style={{
              background: !unlimitedTotal ? "rgba(127, 119, 221, 0.25)" : "rgba(255, 255, 255, 0.04)",
              color: !unlimitedTotal ? "#f0eeff" : "#8b87b8",
              border: !unlimitedTotal ? "1px solid rgba(127, 119, 221, 0.55)" : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {isQuotaThenDaily ? "Definir franquia" : "Definir máximo total"}
          </button>
          {!unlimitedTotal && (
            <input
              type="number"
              min={1}
              max={999999}
              data-testid="total-limit-input"
              value={totalLimit}
              onChange={(e) => onTotalLimitChange(e.target.value)}
              className="w-24 px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{
                background: "rgba(255, 255, 255, 0.07)",
                border: "1px solid rgba(127, 119, 221, 0.45)",
                color: "#f0eeff",
              }}
            />
          )}
        </div>
      </div>

      {/* Limite Diário */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <div className="text-[11px] font-medium" style={{ color: "#AFA9EC" }}>
          {isQuotaThenDaily ? "2. Limite diário após acabar a franquia" : "Limite por dia"}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            data-testid="daily-limit-unlimited-btn"
            onClick={() => onUnlimitedDailyChange(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
            style={{
              background: unlimitedDaily ? "rgba(52, 211, 153, 0.2)" : "rgba(255, 255, 255, 0.04)",
              color: unlimitedDaily ? "#34d399" : "#8b87b8",
              border: unlimitedDaily ? "1px solid rgba(52, 211, 153, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            ∞ Ilimitado
          </button>
          <button
            type="button"
            data-testid="daily-limit-custom-btn"
            onClick={() => onUnlimitedDailyChange(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
            style={{
              background: !unlimitedDaily ? "rgba(127, 119, 221, 0.25)" : "rgba(255, 255, 255, 0.04)",
              color: !unlimitedDaily ? "#f0eeff" : "#8b87b8",
              border: !unlimitedDaily ? "1px solid rgba(127, 119, 221, 0.55)" : "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            Definir limite/dia
          </button>
          {!unlimitedDaily && (
            <input
              type="number"
              min={1}
              max={9999}
              data-testid="daily-limit-input"
              value={dailyLimit}
              onChange={(e) => onDailyLimitChange(e.target.value)}
              className="w-24 px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{
                background: "rgba(255, 255, 255, 0.07)",
                border: "1px solid rgba(127, 119, 221, 0.45)",
                color: "#f0eeff",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
