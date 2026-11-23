"use client";

import React from "react";
import type { ReadingReportItem } from "./FinanceiroUserReportsModal";

interface FinanceiroUserReadingCardProps {
  reading: ReadingReportItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  formatShortDateBr: (isoDate: string | null | undefined) => string;
  formatBrasiliaDateTime: (iso: string | null | undefined) => string;
}

export default function FinanceiroUserReadingCard({
  reading: r,
  isExpanded,
  onToggleExpand,
  formatShortDateBr,
  formatBrasiliaDateTime,
}: FinanceiroUserReadingCardProps) {
  const textosEntries = Object.entries(r.textos || {});

  return (
    <div className="rounded-xl border border-[#7f77dd]/25 bg-[#14102b]/80 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap text-xs text-[#AFA9EC]">
            <span className="inline-flex items-center gap-1">
              <span>🕒</span>
              {formatBrasiliaDateTime(r.created_at)} (Brasília)
            </span>
            {r.data_alvo && (
              <span className="px-2 py-0.5 rounded bg-[#251f49] text-[#d6d3ff] text-[11px]">
                Alvo: {formatShortDateBr(r.data_alvo)}
                {r.data_fim ? ` até ${formatShortDateBr(r.data_fim)}` : ""}
              </span>
            )}
            {r.area && (
              <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-200 text-[11px]">
                {r.area}
              </span>
            )}
            {r.model_used && (
              <span
                data-testid={`reading-model-badge-${r.id}`}
                className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-200 border border-indigo-400/25 text-[11px] font-medium"
              >
                🤖 {r.model_used}
              </span>
            )}
          </div>
          {r.pergunta && (
            <p className="text-xs text-[#b4b0dc] italic truncate">
              “{r.pergunta}”
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-emerald-400">
              ${r.cost_usd.toFixed(4)}
            </p>
            <p className="text-[11px] text-[#8b87b8]">
              ~R$ {r.cost_brl.toFixed(2)} • {r.total_tokens.toLocaleString("pt-BR")} tokens
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#7f77dd]/20 hover:bg-[#7f77dd]/35 text-[#d6d3ff] border border-[#7f77dd]/40 transition cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>▲</span>
                Ocultar Relatório
              </>
            ) : (
              <>
                <span>📖</span>
                Ler Relatório
              </>
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pt-3 border-t border-[#7f77dd]/20 space-y-3 text-sm text-[#e6e3ff]">
          {r.pergunta && (
            <div className="rounded-lg bg-[#1a1535] p-3 border border-[#7f77dd]/20">
              <p className="text-[11px] uppercase tracking-wider text-[#8b87b8] mb-1">
                Contexto / Pergunta
              </p>
              <p className="text-xs text-[#d6d3ff] whitespace-pre-wrap">{r.pergunta}</p>
            </div>
          )}

          {r.sintese && (
            <div className="rounded-lg bg-[#1a1535] p-3 border border-[#7f77dd]/20">
              <p className="text-[11px] uppercase tracking-wider text-[#AFA9EC] font-semibold mb-1">
                Síntese da Leitura
              </p>
              <p className="text-xs leading-relaxed text-[#f0eeff] whitespace-pre-wrap">
                {r.sintese}
              </p>
            </div>
          )}

          {textosEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-[#8b87b8] font-semibold">
                Detalhamento por Ponto / Aspecto
              </p>
              <div className="grid grid-cols-1 gap-2">
                {textosEntries.map(([chave, texto]) => (
                  <div
                    key={chave}
                    className="rounded-lg bg-[#1a1535]/70 p-3 border border-[#7f77dd]/15"
                  >
                    <p className="text-xs font-semibold text-[#AFA9EC] mb-1">
                      {chave}
                    </p>
                    <p className="text-xs text-[#d6d3ff] whitespace-pre-wrap leading-relaxed">
                      {typeof texto === "string" ? texto : JSON.stringify(texto)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
