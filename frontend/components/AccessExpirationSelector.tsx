"use client";

import React from "react";

export type AccessPreset = "lifetime" | "7" | "30" | "90" | "365" | "custom";

interface AccessExpirationSelectorProps {
  role: "client" | "admin";
  preset: AccessPreset;
  customDate: string;
  currentExpiresAt?: string | null;
  onChangePreset: (p: AccessPreset) => void;
  onChangeCustomDate: (d: string) => void;
}

const PRESETS: { id: AccessPreset; label: string }[] = [
  { id: "lifetime", label: "Vitalício" },
  { id: "7", label: "7 dias" },
  { id: "30", label: "30 dias" },
  { id: "90", label: "90 dias" },
  { id: "365", label: "1 ano" },
  { id: "custom", label: "Data exata" },
];

export default function AccessExpirationSelector({
  role,
  preset,
  customDate,
  currentExpiresAt,
  onChangePreset,
  onChangeCustomDate,
}: AccessExpirationSelectorProps) {
  if (role === "admin") {
    return (
      <div
        data-testid="admin-never-expires-note"
        className="p-3 rounded-xl text-xs flex items-center gap-2"
        style={{
          background: "rgba(239, 159, 39, 0.08)",
          border: "1px solid rgba(239, 159, 39, 0.25)",
          color: "#EF9F27",
        }}
      >
        <span>🛡️</span>
        <span>Administradores nunca expiram (acesso permanente).</span>
      </div>
    );
  }

  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8b87b8" }}>
          Tempo de Acesso (IA)
        </label>
        {currentExpiresAt && (
          <span className="text-[11px]" style={{ color: "#AFA9EC" }}>
            Atual: até {formatDate(currentExpiresAt)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            data-testid={`access-preset-${opt.id}`}
            onClick={() => onChangePreset(opt.id)}
            className="px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            style={{
              background: preset === opt.id ? "rgba(127, 119, 221, 0.25)" : "rgba(255, 255, 255, 0.03)",
              border: preset === opt.id ? "1px solid rgba(127, 119, 221, 0.65)" : "1px solid rgba(255, 255, 255, 0.08)",
              color: preset === opt.id ? "#f0eeff" : "#8b87b8",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <input
          type="date"
          data-testid="access-custom-date-input"
          value={customDate}
          onChange={(e) => onChangeCustomDate(e.target.value)}
          className="w-full rounded-xl px-4 py-2 text-xs outline-none"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(127, 119, 221, 0.3)",
            color: "#f0eeff",
          }}
        />
      )}
    </div>
  );
}
