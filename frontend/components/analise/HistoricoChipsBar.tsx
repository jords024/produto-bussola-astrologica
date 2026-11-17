"use client";

import React from "react";
import { curta, T, type Analise, type ItemHistorico } from "@/components/analise/analiseConstants";

interface HistoricoChipsBarProps {
  historico: ItemHistorico[];
  selectedProfileId: string;
  analise: Analise | null;
  onSelectChip: (item: ItemHistorico) => void;
  onOpenAll: () => void;
}

export default function HistoricoChipsBar({
  historico,
  selectedProfileId,
  analise,
  onSelectChip,
  onOpenAll,
}: HistoricoChipsBarProps) {
  if (historico.length === 0) return null;

  const filtradosPerfil = selectedProfileId
    ? historico.filter((h) => (h.profile_id || h.contexto?.profile_id || "") === selectedProfileId)
    : historico;
  const chipsRapidos = (filtradosPerfil.length > 0 ? filtradosPerfil : historico).slice(0, 6);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <p className="text-[11px] font-mono uppercase tracking-wider" style={{ color: T.textMuted }}>
          Histórico de Consultas{" "}
          {historico.length > 6 ? `(Últimas ${chipsRapidos.length} de ${historico.length})` : ""}
        </p>
        <button
          type="button"
          data-testid="open-all-historico-btn"
          onClick={onOpenAll}
          className="text-xs font-semibold text-[#AFA9EC] hover:text-white transition cursor-pointer"
        >
          Ver todo o histórico ({historico.length}) →
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {chipsRapidos.map((h) => {
          const fimHist = h.data_fim || h.contexto?.data_fim || null;
          const ativo = analise?.id
            ? analise.id === h.id
            : analise?.data === h.data && (analise?.data_fim || null) === fimHist;
          const pName = h.profile_name || h.contexto?.profile_name;
          return (
            <button
              key={h.id}
              type="button"
              data-testid={`historico-chip-${h.id}`}
              onClick={() => onSelectChip(h)}
              className="px-3 py-1 rounded-lg text-xs font-mono transition-all hover:border-white/30 cursor-pointer"
              style={{
                background: ativo ? T.surface3 : T.surface1,
                color: ativo ? "#ffffff" : T.textMuted,
                border: `1px solid ${ativo ? T.gold : T.border}`,
              }}
            >
              {fimHist ? `${curta(h.data)} → ${curta(fimHist)}` : curta(h.data)}
              {pName ? ` · ${pName.split(" ")[0]}` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
