"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface FinanceiroLoadingPopupProps {
  isOpen: boolean;
  title?: string;
  message?: string;
}

export default function FinanceiroLoadingPopup({
  isOpen,
  title = "Organizando dados financeiros",
  message = "Ordenando gastos e recalculando indicadores...",
}: FinanceiroLoadingPopupProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      data-testid="financeiro-loading-popup"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
      }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 sm:p-7 text-center space-y-4 border shadow-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(29, 24, 56, 0.96) 0%, rgba(19, 15, 38, 0.98) 100%)",
          borderColor: "rgba(127, 119, 221, 0.55)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 36px rgba(127, 119, 221, 0.3)",
        }}
      >
        <div className="relative mx-auto w-14 h-14 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
            style={{
              borderTopColor: "#7F77DD",
              borderRightColor: "#34d399",
            }}
          />
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{
              background: "rgba(127, 119, 221, 0.18)",
              border: "1px solid rgba(127, 119, 221, 0.35)",
            }}
          >
            💰
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-base font-bold tracking-tight" style={{ color: "#f0eeff" }}>
            {title}
          </h4>
          <p className="text-xs leading-relaxed" style={{ color: "#AFA9EC" }}>
            {message}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
