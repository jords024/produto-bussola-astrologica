"use client";

import React from "react";

interface MultiProfilesUpsellBannerProps {
  url?: string | null;
  variant?: "compact" | "card";
}

export default function MultiProfilesUpsellBanner({
  url,
  variant = "compact",
}: MultiProfilesUpsellBannerProps) {
  const cleanUrl = (url || "").trim();
  if (!cleanUrl) return null;

  const isCard = variant === "card";

  return (
    <a
      href={cleanUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="multi-profiles-upsell-banner"
      className={`group block rounded-2xl transition-all hover:brightness-110 active:scale-[0.995] ${
        isCard ? "p-5" : "px-4 py-3"
      }`}
      style={{
        background: isCard
          ? "linear-gradient(135deg, rgba(226, 184, 87, 0.14) 0%, rgba(127, 119, 221, 0.16) 100%)"
          : "linear-gradient(135deg, rgba(226, 184, 87, 0.12) 0%, rgba(127, 119, 221, 0.14) 100%)",
        border: "1px solid rgba(226, 184, 87, 0.42)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
            style={{
              background: "rgba(226, 184, 87, 0.18)",
              border: "1px solid rgba(226, 184, 87, 0.4)",
            }}
          >
            👥
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold leading-snug" style={{ color: "#f6e5b8" }}>
              {isCard ? "Quer cadastrar outras pessoas?" : "Cadastre múltiplas pessoas na sua Bússola"}
            </p>
            <p className="text-[11px] sm:text-xs mt-0.5 leading-relaxed" style={{ color: "#c9c4eb" }}>
              {isCard
                ? "Libere o cadastro de múltiplos perfis para gerar mapas astrais e leituras do dia para familiares, parceiro(a) ou clientes."
                : "Gere mapas e leituras do dia para parceiro(a), filhos ou clientes."}
            </p>
          </div>
        </div>

        <span
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{
            background: "linear-gradient(135deg, #e2b857, #c99a35)",
            color: "#14102b",
            boxShadow: "0 4px 14px rgba(226, 184, 87, 0.28)",
          }}
        >
          <span>{isCard ? "Liberar Múltiplos Perfis →" : "Liberar Agora →"}</span>
        </span>
      </div>
    </a>
  );
}
