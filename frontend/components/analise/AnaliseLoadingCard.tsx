"use client";

import React from "react";
import { ETAPAS_LOADING, T } from "@/components/analise/analiseConstants";

interface AnaliseLoadingCardProps {
  etapaLoading: number;
}

export default function AnaliseLoadingCard({ etapaLoading }: AnaliseLoadingCardProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 p-6 sm:p-8 rounded-2xl relative overflow-hidden"
      style={{
        background: T.surface1,
        border: `1px solid ${T.borderGold}`,
        boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
      }}
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
          <div
            className="absolute inset-0 rounded-full border border-dashed border-white/20 animate-spin"
            style={{ animationDuration: "10s" }}
          />
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#E2B857] animate-spin"
            style={{ animationDuration: "3s" }}
          />
          <span className="text-xl" style={{ color: T.gold }}>
            ☉
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E2B857] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: T.gold }}>
              Processamento Tático em Tempo Real
            </span>
          </div>
          <p className="text-base font-semibold text-white">
            {ETAPAS_LOADING[etapaLoading]}
          </p>
          <div className="mt-3.5 h-1 w-full rounded-full overflow-hidden bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(95, ((etapaLoading + 1) / ETAPAS_LOADING.length) * 95)}%`,
                background: `linear-gradient(90deg, #6366F1, ${T.gold})`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
