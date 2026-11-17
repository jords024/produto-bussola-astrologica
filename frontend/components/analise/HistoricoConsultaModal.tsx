"use client";

import React from "react";
import { createPortal } from "react-dom";
import type { ItemHistorico } from "@/components/analise/analiseConstants";

interface HistoricoConsultaModalProps {
  item: ItemHistorico | null;
  ownerName?: string;
  areas: { id: string; rotulo: string }[];
  loading?: boolean;
  onClose: () => void;
  onConfirmOpen: (item: ItemHistorico) => void;
}

function formatBrDate(iso?: string | null): string {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function HistoricoConsultaModal({
  item,
  ownerName,
  areas,
  loading = false,
  onClose,
  onConfirmOpen,
}: HistoricoConsultaModalProps) {
  if (!item) return null;

  const fim = item.data_fim || item.contexto?.data_fim || null;
  const areaId = item.area || item.contexto?.area || "";
  const areaLabel =
    areas.find((a) => a.id === areaId)?.rotulo ||
    areaId ||
    "Panorama geral de todas as áreas";
  const pergunta = item.pergunta || item.contexto?.pergunta || "";
  const profileName =
    item.profile_name ||
    item.contexto?.profile_name ||
    (ownerName ? `Meu Perfil (${ownerName.split(" ")[0]})` : "Meu Perfil (Principal)");

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      data-testid="historico-consulta-modal"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#1a1535] border border-[#7f77dd]/35 p-6 space-y-4 shadow-2xl text-[#f0eeff]">
        <div className="flex items-center justify-between gap-3 border-b border-[#7f77dd]/20 pb-3">
          <div>
            <h4 className="text-base font-bold text-[#f0eeff]">
              Detalhes da Leitura Salva
            </h4>
            <p className="text-[11px] text-[#8b87b8]">
              Confira os dados desta consulta antes de abrir
            </p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[#251f49] text-[#E2B857] font-mono">
            {fim ? "Previsão de Período" : "Leitura de 1 Dia"}
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="rounded-xl p-3 bg-[#14102b] border border-[#7f77dd]/20">
            <span className="block text-[10px] uppercase tracking-wider text-[#8b87b8] mb-0.5">
              Leitura para
            </span>
            <span className="font-semibold text-[#AFA9EC]">👥 {profileName}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl p-3 bg-[#14102b] border border-[#7f77dd]/20">
              <span className="block text-[10px] uppercase tracking-wider text-[#8b87b8] mb-0.5">
                Data Inicial / Alvo
              </span>
              <span className="font-mono font-semibold text-[#f0eeff]">
                {formatBrDate(item.data)}
                {fim ? ` até ${formatBrDate(fim)}` : ""}
              </span>
            </div>

            <div className="rounded-xl p-3 bg-[#14102b] border border-[#7f77dd]/20">
              <span className="block text-[10px] uppercase tracking-wider text-[#8b87b8] mb-0.5">
                Área em Foco
              </span>
              <span className="font-semibold text-[#f0eeff]">{areaLabel}</span>
            </div>
          </div>

          <div className="rounded-xl p-3 bg-[#14102b] border border-[#7f77dd]/20">
            <span className="block text-[10px] uppercase tracking-wider text-[#8b87b8] mb-0.5">
              Contexto Real / Pergunta do Momento
            </span>
            <p className="text-[#d6d3ff] whitespace-pre-wrap leading-relaxed">
              {pergunta || "Nenhuma pergunta específica informada."}
            </p>
          </div>

          {item.sintese_preview && (
            <div className="rounded-xl p-3 bg-[#14102b]/70 border border-[#7f77dd]/15">
              <span className="block text-[10px] uppercase tracking-wider text-[#8b87b8] mb-0.5">
                Prévia da Síntese
              </span>
              <p className="text-[11px] text-[#b4b0dc] leading-relaxed">
                {item.sintese_preview}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-[#251f49] hover:bg-[#31295f] text-[#d6d3ff] cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            data-testid="confirm-open-historico-btn"
            disabled={loading}
            onClick={() => onConfirmOpen(item)}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#E2B857] hover:brightness-110 text-[#14102b] cursor-pointer disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Abrir Leitura"}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalNode, document.body);
  }
  return modalNode;
}
