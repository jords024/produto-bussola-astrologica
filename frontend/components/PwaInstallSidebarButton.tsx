"use client";

import React from "react";

interface PwaInstallSidebarButtonProps {
  visible: boolean;
  onClick: () => void;
}

export default function PwaInstallSidebarButton({
  visible,
  onClick,
}: PwaInstallSidebarButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      data-testid="pwa-install-sidebar-btn"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#d6d3ff] bg-[#7f77dd]/15 hover:bg-[#7f77dd]/25 border border-[#7f77dd]/30 transition-all cursor-pointer"
    >
      <span className="text-base leading-none">📲</span>
      <span>Instalar App no Celular</span>
    </button>
  );
}
