"use client";

import React from "react";
import PwaInstallGuideModal from "./PwaInstallGuideModal";

interface PwaInstallBannerProps {
  visible: boolean;
  isIos: boolean;
  showGuideModal: boolean;
  onInstall: () => void;
  onDismiss: () => void;
  onCloseGuide: () => void;
}

export default function PwaInstallBanner({
  visible,
  isIos,
  showGuideModal,
  onInstall,
  onDismiss,
  onCloseGuide,
}: PwaInstallBannerProps) {
  return (
    <>
      {visible && (
        <div
          data-testid="pwa-install-banner"
          className="mb-5 rounded-2xl border border-[#7f77dd]/35 bg-gradient-to-r from-[#1e1842] to-[#161133] p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7f77dd]/20 border border-[#7f77dd]/35 flex items-center justify-center text-lg shrink-0">
              📲
            </div>
            <div>
              <p className="text-sm font-semibold text-[#f0eeff]">
                Acesse mais rápido pelo celular
              </p>
              <p className="text-xs text-[#b4b0dc]">
                Adicione a Bússola Astrológica na sua tela inicial como um aplicativo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#b4b0dc] hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={onInstall}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#7f77dd] hover:bg-[#6d64cc] text-white transition cursor-pointer"
            >
              Instalar Atalho
            </button>
          </div>
        </div>
      )}

      <PwaInstallGuideModal
        isOpen={showGuideModal}
        isIos={isIos}
        onClose={onCloseGuide}
      />
    </>
  );
}
