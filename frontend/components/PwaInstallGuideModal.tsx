"use client";

import React from "react";
import { createPortal } from "react-dom";

interface PwaInstallGuideModalProps {
  isOpen: boolean;
  isIos: boolean;
  onClose: () => void;
}

export default function PwaInstallGuideModal({
  isOpen,
  isIos,
  onClose,
}: PwaInstallGuideModalProps) {
  if (!isOpen) return null;

  const content = (
    <div
      data-testid="pwa-install-guide-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#1a1535] border border-[#7f77dd]/35 shadow-2xl p-6 text-[#f0eeff] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7f77dd]/20 border border-[#7f77dd]/40 flex items-center justify-center text-xl">
            📲
          </div>
          <div>
            <h3 id="pwa-guide-title" className="text-base font-bold text-[#f0eeff]">
              Adicionar Bússola à Tela Inicial
            </h3>
            <p className="text-xs text-[#8b87b8]">
              {isIos ? "Instruções para iPhone / iPad (Safari)" : "Instruções para Android"}
            </p>
          </div>
        </div>

        {isIos ? (
          <ol className="space-y-2.5 text-xs text-[#d6d3ff] bg-[#14102b]/80 rounded-xl p-4 border border-[#7f77dd]/20">
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-[#AFA9EC]">1.</span>
              <span>
                Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta para cima ⬆️) na barra do Safari.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-[#AFA9EC]">2.</span>
              <span>
                Role até encontrar <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong> e toque em <strong>Adicionar</strong>.
              </span>
            </li>
          </ol>
        ) : (
          <ol className="space-y-2.5 text-xs text-[#d6d3ff] bg-[#14102b]/80 rounded-xl p-4 border border-[#7f77dd]/20">
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-[#AFA9EC]">1.</span>
              <span>
                Toque no menu do navegador (os <strong>3 pontinhos ⋮</strong> no canto superior direito).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-bold text-[#AFA9EC]">2.</span>
              <span>
                Selecione <strong>&ldquo;Adicionar à tela inicial&rdquo;</strong> ou <strong>&ldquo;Instalar aplicativo&rdquo;</strong>.
              </span>
            </li>
          </ol>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#7f77dd] hover:bg-[#6d64cc] text-white transition cursor-pointer"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
