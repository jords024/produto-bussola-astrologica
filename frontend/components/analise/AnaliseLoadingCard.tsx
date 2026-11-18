"use client";

import React from "react";
import { createPortal } from "react-dom";
import { ETAPAS_LOADING, T } from "@/components/analise/analiseConstants";

interface AnaliseLoadingCardProps {
  etapaLoading: number;
}

export default function AnaliseLoadingCard({ etapaLoading }: AnaliseLoadingCardProps) {
  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      data-testid="analise-loading-modal"
    >
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-md rounded-2xl p-7 text-center space-y-5 shadow-2xl"
        style={{
          background: T.surface1,
          border: `1px solid ${T.borderGold}`,
          boxShadow: "0 12px 48px rgba(0,0,0,0.75)",
        }}
      >
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border border-dashed border-white/20 animate-spin"
            style={{ animationDuration: "10s" }}
          />
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#E2B857] animate-spin"
            style={{ animationDuration: "3s" }}
          />
          <span className="text-2xl" style={{ color: T.gold }}>
            ☉
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E2B857] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: T.gold }}>
              Processamento Tático em Tempo Real
            </span>
          </div>
          <h4 className="text-base font-bold text-white">
            Gerando sua leitura...
          </h4>
          <p className="text-xs font-medium text-[#d6d3ff]">
            {ETAPAS_LOADING[etapaLoading]}
          </p>
        </div>

        <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(95, ((etapaLoading + 1) / ETAPAS_LOADING.length) * 95)}%`,
              background: `linear-gradient(90deg, #6366F1, ${T.gold})`,
            }}
          />
        </div>

        <p className="text-[11px] leading-relaxed" style={{ color: T.textMuted }}>
          Estamos cruzando os trânsitos planetários com o mapa selecionado. Não feche esta página.
        </p>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalNode, document.body);
  }
  return modalNode;
}
