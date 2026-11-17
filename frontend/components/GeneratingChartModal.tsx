"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface GeneratingChartModalProps {
  isOpen: boolean;
  personName: string;
  isEditing?: boolean;
}

const STEPS = [
  "Localizando coordenadas e fuso horário...",
  "Calculando casas e posições planetárias...",
  "Gerando interpretações completas do Mapa Astral com IA...",
  "Finalizando e salvando o perfil...",
];

export default function GeneratingChartModal({
  isOpen,
  personName,
  isEditing = false,
}: GeneratingChartModalProps) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStepIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setStepIdx((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 4500);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      data-testid="generating-chart-modal"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#1a1535] border border-[#7f77dd]/40 p-7 text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center bg-[#7f77dd]/20 border border-[#7f77dd]/40">
          <span className="text-2xl animate-spin inline-block">🧭</span>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-base font-bold text-[#f0eeff]">
            {isEditing ? "Atualizando" : "Cadastrando"} {personName || "nova pessoa"}...
          </h4>
          <p className="text-xs font-medium text-[#E2B857]" data-testid="generating-chart-step">
            {STEPS[stepIdx]}
          </p>
        </div>

        <div className="w-full h-1.5 rounded-full bg-[#110d24] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${((stepIdx + 1) / STEPS.length) * 100}%`,
              background: "linear-gradient(90deg, #7F77DD, #E2B857)",
            }}
          />
        </div>

        <p className="text-[11px] text-[#8b87b8] leading-relaxed">
          O cálculo astronômico e a geração completa com IA levam alguns instantes (15 a 40 segundos). Não feche esta página.
        </p>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
