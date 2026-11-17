"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ItemHistorico } from "@/components/analise/analiseConstants";

interface HistoricoCompletoModalProps {
  isOpen: boolean;
  items: ItemHistorico[];
  ownerName?: string;
  areas: { id: string; rotulo: string }[];
  loading?: boolean;
  activeAnaliseId?: string | null;
  onClose: () => void;
  onSelectOpen: (item: ItemHistorico) => void;
}

function formatBrDate(iso?: string | null): string {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function HistoricoCompletoModal({
  isOpen,
  items,
  ownerName,
  areas,
  loading = false,
  activeAnaliseId,
  onClose,
  onSelectOpen,
}: HistoricoCompletoModalProps) {
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "dia" | "periodo">("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const mainLabel = ownerName ? `Meu Perfil (${ownerName.split(" ")[0]})` : "Meu Perfil (Principal)";

  const areaLabelMap = useMemo(() => {
    const defaults: Record<string, string> = {
      geral: "Panorama geral",
      carreira: "Carreira e trabalho",
      financas: "Dinheiro e valor",
      relacionamentos: "Relacionamentos",
      amor: "Amor e relacionamentos",
      autoconhecimento: "Autoconhecimento",
    };
    areas.forEach((a) => {
      defaults[a.id] = a.rotulo;
    });
    return defaults;
  }, [areas]);

  const areaOptions = useMemo(() => {
    const map = new Map<string, string>();
    areas.forEach((a) => map.set(a.id, a.rotulo));
    items.forEach((it) => {
      const aid = it.area || it.contexto?.area || "geral";
      if (!map.has(aid)) map.set(aid, areaLabelMap[aid] || aid);
    });
    return Array.from(map.entries()).map(([id, rotulo]) => ({ id, rotulo }));
  }, [areas, items, areaLabelMap]);

  const personOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((it) => {
      const pid = it.profile_id || it.contexto?.profile_id || "__main__";
      const pname = it.profile_name || it.contexto?.profile_name || mainLabel;
      if (!map.has(pid)) map.set(pid, pname);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items, mainLabel]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const pid = it.profile_id || it.contexto?.profile_id || "__main__";
      if (personFilter !== "all" && pid !== personFilter) return false;

      const fim = it.data_fim || it.contexto?.data_fim;
      const itemType = fim ? "periodo" : "dia";
      if (typeFilter !== "all" && itemType !== typeFilter) return false;

      const areaId = it.area || it.contexto?.area || "geral";
      if (areaFilter !== "all" && areaId !== areaFilter) return false;

      if (dateFilter) {
        const matchesExact = it.data === dateFilter;
        const matchesRange = Boolean(fim && it.data <= dateFilter && dateFilter <= fim);
        if (!matchesExact && !matchesRange) return false;
      }

      if (!q) return true;
      const areaLabel = areaLabelMap[areaId] || areaId;
      const pergunta = it.pergunta || it.contexto?.pergunta || "";
      const pName = it.profile_name || it.contexto?.profile_name || mainLabel;
      const dateStr = formatBrDate(it.data);
      const haystack = `${dateStr} ${areaLabel} ${pergunta} ${pName} ${it.sintese_preview || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search, personFilter, typeFilter, areaFilter, dateFilter, areaLabelMap, mainLabel]);

  if (!isOpen) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      data-testid="historico-completo-modal"
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-[#1a1535] border border-[#7f77dd]/35 shadow-2xl overflow-hidden text-[#f0eeff]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#7f77dd]/25 bg-[#14102b]/80">
          <div>
            <h4 className="text-base font-bold text-[#f0eeff]">
              Histórico Completo de Consultas ({items.length})
            </h4>
            <p className="text-[11px] text-[#8b87b8]">
              Pesquise e filtre suas leituras salvas sem custo adicional de IA
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#251f49] hover:bg-[#31295f] text-[#f0eeff] border border-[#7f77dd]/35 cursor-pointer"
          >
            Fechar
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-3 border-b border-[#7f77dd]/20 bg-[#14102b]/50 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              data-testid="historico-modal-search"
              placeholder="Buscar por pergunta, área, data ou pessoa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] rounded-xl px-3.5 py-2 text-xs outline-none bg-[#1a1535] border border-[#7f77dd]/30 text-[#f0eeff]"
            />

            {personOptions.length > 1 && (
              <select
                aria-label="Filtrar por pessoa"
                data-testid="historico-modal-person-filter"
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
                className="rounded-xl px-3 py-2 text-xs outline-none bg-[#1a1535] border border-[#7f77dd]/30 text-[#f0eeff] cursor-pointer"
              >
                <option value="all">Todas as pessoas</option>
                {personOptions.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.name}
                  </option>
                ))}
              </select>
            )}

            <select
              aria-label="Filtrar por tipo"
              data-testid="historico-modal-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | "dia" | "periodo")}
              className="rounded-xl px-3 py-2 text-xs outline-none bg-[#1a1535] border border-[#7f77dd]/30 text-[#f0eeff] cursor-pointer"
            >
              <option value="all">Dia e Período</option>
              <option value="dia">Leitura de 1 Dia</option>
              <option value="periodo">Previsão de Período</option>
            </select>

            <select
              aria-label="Filtrar por área"
              data-testid="historico-modal-area-filter"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="rounded-xl px-3 py-2 text-xs outline-none bg-[#1a1535] border border-[#7f77dd]/30 text-[#f0eeff] cursor-pointer"
            >
              <option value="all">Todas as áreas</option>
              {areaOptions.map((ao) => (
                <option key={ao.id} value={ao.id}>
                  {ao.rotulo}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                aria-label="Filtrar por data específica"
                data-testid="historico-modal-date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl px-3 py-1.5 text-xs outline-none bg-[#1a1535] border border-[#7f77dd]/30 text-[#f0eeff] font-mono"
              />
              {dateFilter && (
                <button
                  type="button"
                  data-testid="clear-historico-date-btn"
                  onClick={() => setDateFilter("")}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] bg-[#251f49] hover:bg-[#31295f] text-[#AFA9EC] cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-[#8b87b8]">
            Exibindo {filtered.length} de {items.length} consulta(s)
          </p>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#8b87b8]">
              Nenhuma consulta encontrada para os filtros aplicados.
            </div>
          ) : (
            filtered.map((it) => {
              const fim = it.data_fim || it.contexto?.data_fim || null;
              const areaId = it.area || it.contexto?.area || "geral";
              const areaLabel = areaLabelMap[areaId] || areaId || "Panorama geral";
              const pergunta = it.pergunta || it.contexto?.pergunta || "";
              const pName = it.profile_name || it.contexto?.profile_name || mainLabel;
              const isActive = activeAnaliseId === it.id;

              return (
                <div
                  key={it.id}
                  data-testid={`historico-modal-item-${it.id}`}
                  className={`rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 border transition ${
                    isActive
                      ? "bg-[#251f49] border-[#E2B857]/60"
                      : "bg-[#14102b]/80 border-[#7f77dd]/25 hover:border-[#7f77dd]/50"
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono font-bold text-[#E2B857]">
                        {formatBrDate(it.data)}
                        {fim ? ` → ${formatBrDate(fim)}` : ""}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#251f49] text-[#AFA9EC] text-[11px]">
                        👥 {pName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-200 text-[11px]">
                        {areaLabel}
                      </span>
                    </div>
                    {pergunta && (
                      <p className="text-xs text-[#e6e3ff] truncate">
                        “{pergunta}”
                      </p>
                    )}
                    {it.sintese_preview && (
                      <p className="text-[11px] text-[#8b87b8] line-clamp-1">
                        {it.sintese_preview}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onSelectOpen(it)}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#E2B857] hover:brightness-110 text-[#14102b] cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    Abrir Leitura
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalNode, document.body);
  }
  return modalNode;
}
