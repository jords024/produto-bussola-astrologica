"use client";

import React from "react";

export interface DateCountGroup {
  dateKey: string;
  label: string;
  count: number;
}

/**
 * Converte um timestamp ISO para a chave de data YYYY-MM-DD no fuso de Brasília.
 */
export function getBrasiliaDateKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Formata uma chave YYYY-MM-DD para DD/MM/AAAA.
 */
export function formatDateKeyBr(dateKey: string): string {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateKey;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Agrupa itens por data de criação (Brasília), ordenados da data mais recente para a mais antiga.
 */
export function groupCountsByBrasiliaDate<T extends { created_at: string | null }>(
  items: T[]
): DateCountGroup[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getBrasiliaDateKey(item.created_at);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, count]) => ({
      dateKey,
      label: formatDateKeyBr(dateKey),
      count,
    }));
}

/**
 * Filtra itens pela data selecionada (chip) ou pelo intervalo De/Até em Brasília.
 */
export function filterItemsByDate<T extends { created_at: string | null }>(
  items: T[],
  selectedDate: string | null,
  startDate: string,
  endDate: string
): T[] {
  if (!selectedDate && !startDate && !endDate) {
    return items;
  }

  return items.filter((item) => {
    const key = getBrasiliaDateKey(item.created_at);
    if (!key) return false;
    if (selectedDate) {
      return key === selectedDate;
    }
    if (startDate && key < startDate) return false;
    if (endDate && key > endDate) return false;
    return true;
  });
}

interface FinanceiroUserReportsDateFilterProps {
  totalCount: number;
  filteredCount: number;
  dateGroups: DateCountGroup[];
  selectedDate: string | null;
  startDate: string;
  endDate: string;
  onSelectDate: (dateKey: string | null) => void;
  onChangeStartDate: (value: string) => void;
  onChangeEndDate: (value: string) => void;
  onClear: () => void;
}

export default function FinanceiroUserReportsDateFilter({
  totalCount,
  filteredCount,
  dateGroups,
  selectedDate,
  startDate,
  endDate,
  onSelectDate,
  onChangeStartDate,
  onChangeEndDate,
  onClear,
}: FinanceiroUserReportsDateFilterProps) {
  const hasActiveFilter = Boolean(selectedDate || startDate || endDate);

  return (
    <div
      data-testid="financeiro-reports-date-filter"
      className="px-6 py-3 border-b border-[#7f77dd]/20 bg-[#14102b]/60 space-y-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#b4b0dc]">Filtrar por data:</span>

          <label className="inline-flex items-center gap-1.5 text-xs text-[#8b87b8]">
            <span>De</span>
            <input
              type="date"
              aria-label="Data inicial"
              value={startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#1a1535] border border-[#7f77dd]/30 text-xs text-[#f0eeff] focus:outline-none focus:border-[#AFA9EC]"
            />
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs text-[#8b87b8]">
            <span>Até</span>
            <input
              type="date"
              aria-label="Data final"
              value={endDate}
              onChange={(e) => onChangeEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#1a1535] border border-[#7f77dd]/30 text-xs text-[#f0eeff] focus:outline-none focus:border-[#AFA9EC]"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilter && (
            <>
              <span
                data-testid="financeiro-reports-filtered-count"
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#7f77dd]/20 text-[#d6d3ff] border border-[#7f77dd]/35"
              >
                Exibindo {filteredCount} de {totalCount}
              </span>
              <button
                type="button"
                onClick={onClear}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#251f49] hover:bg-[#31295f] text-[#d6d3ff] border border-[#7f77dd]/30 transition cursor-pointer"
              >
                Limpar filtro
              </button>
            </>
          )}
        </div>
      </div>

      {dateGroups.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={onClear}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
              !hasActiveFilter
                ? "bg-[#7f77dd] text-white border-[#AFA9EC]"
                : "bg-[#251f49] text-[#b4b0dc] border-[#7f77dd]/25 hover:bg-[#31295f]"
            }`}
          >
            Todas ({totalCount})
          </button>

          {dateGroups.map((group) => {
            const isSelected = selectedDate === group.dateKey;
            return (
              <button
                key={group.dateKey}
                type="button"
                data-testid={`date-chip-${group.dateKey}`}
                onClick={() => onSelectDate(isSelected ? null : group.dateKey)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                  isSelected
                    ? "bg-[#7f77dd] text-white border-[#AFA9EC]"
                    : "bg-[#251f49] text-[#d6d3ff] border-[#7f77dd]/25 hover:bg-[#31295f]"
                }`}
              >
                <span>{group.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isSelected ? "bg-white/20 text-white" : "bg-[#14102b] text-[#AFA9EC]"
                  }`}
                >
                  {group.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
