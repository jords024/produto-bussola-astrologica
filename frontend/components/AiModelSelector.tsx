"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

export interface AiModelCatalogItem {
  id: string;
  label: string;
  family: string;
  tier: string;
  input_price_usd?: number | null;
  output_price_usd?: number | null;
  available_in_openai?: boolean;
}

export function formatModelUsdPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || Number.isNaN(price)) return "—";
  return `$${price.toFixed(2)}`;
}

interface AiModelSelectorProps {
  id?: string;
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  catalog: AiModelCatalogItem[];
  allowGlobalDefault?: boolean;
  globalDefaultModel?: string;
  testId?: string;
}

const FAMILY_ORDER = ["GPT-6", "GPT-5", "GPT-4", "Outros"];

export default function AiModelSelector({
  id,
  label,
  description,
  value,
  onChange,
  catalog,
  allowGlobalDefault = false,
  globalDefaultModel,
  testId,
}: AiModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    searchInputRef.current?.focus();

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedItem = useMemo(
    () => catalog.find((m) => m.id === value) || null,
    [catalog, value]
  );

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.family.toLowerCase().includes(q) ||
        item.tier.toLowerCase().includes(q)
    );
  }, [catalog, search]);

  const groupedCatalog = useMemo(() => {
    const groups: Record<string, AiModelCatalogItem[]> = {};
    for (const item of filteredCatalog) {
      const fam = item.family || "Outros";
      if (!groups[fam]) groups[fam] = [];
      groups[fam].push(item);
    }
    return FAMILY_ORDER.filter((f) => groups[f]?.length).map((f) => ({
      family: f,
      items: groups[f],
    }));
  }, [filteredCatalog]);

  const trimmedSearch = search.trim();
  const hasExactMatch = useMemo(
    () => catalog.some((m) => m.id.toLowerCase() === trimmedSearch.toLowerCase()),
    [catalog, trimmedSearch]
  );

  const displayLabel = useMemo(() => {
    if (!value) {
      return allowGlobalDefault
        ? `Usar padrão global${globalDefaultModel ? ` (${globalDefaultModel})` : ""}`
        : "Selecione um modelo...";
    }
    if (selectedItem) {
      return `${selectedItem.label} (${selectedItem.id}) — ${selectedItem.tier}`;
    }
    return `${value} (Personalizado)`;
  }, [value, selectedItem, allowGlobalDefault, globalDefaultModel]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setSearch("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      <label htmlFor={id} className="block text-xs font-medium text-[#d6d3ff]">
        {label}
      </label>

      {description && <p className="text-[11px] text-[#8b87b8]">{description}</p>}

      <button
        id={id}
        type="button"
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#14102b] border border-[#7f77dd]/35 hover:border-[#AFA9EC]/60 text-xs text-[#f0eeff] text-left focus:outline-none focus:border-[#AFA9EC] transition cursor-pointer"
      >
        <span className="truncate">{displayLabel}</span>
        <span className="text-[#8b87b8] shrink-0 text-[10px]">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {selectedItem &&
        selectedItem.input_price_usd != null &&
        selectedItem.output_price_usd != null && (
          <p
            data-testid={testId ? `${testId}-pricing` : undefined}
            className="text-[11px] text-emerald-300/90 flex items-center gap-2 flex-wrap"
          >
            <span>
              Entrada: <strong>{formatModelUsdPrice(selectedItem.input_price_usd)}</strong> / 1M
            </span>
            <span className="text-[#8b87b8]">•</span>
            <span>
              Saída: <strong>{formatModelUsdPrice(selectedItem.output_price_usd)}</strong> / 1M
            </span>
          </p>
        )}

      {open && (
        <div
          data-testid={testId ? `${testId}-dropdown` : undefined}
          className="absolute left-0 right-0 z-50 mt-1 rounded-xl bg-[#14102b] border border-[#7f77dd]/50 shadow-2xl overflow-hidden"
        >
          <div className="p-2 border-b border-[#7f77dd]/20 bg-[#1a1535]/90">
            <input
              ref={searchInputRef}
              type="text"
              data-testid={testId ? `${testId}-search` : undefined}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar modelo (ex: gpt-5, 5.5, mini)..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0f0b1e] border border-[#7f77dd]/30 text-xs text-[#f0eeff] placeholder-[#8b87b8] focus:outline-none focus:border-[#AFA9EC]"
            />
          </div>

          <div
            role="listbox"
            className="max-h-52 overflow-y-auto overscroll-contain p-1.5 space-y-1"
          >
            {allowGlobalDefault && !trimmedSearch && (
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                onClick={() => handleSelect("")}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                  value === ""
                    ? "bg-[#7f77dd] text-white font-semibold"
                    : "text-[#d6d3ff] hover:bg-[#251f49]"
                }`}
              >
                Usar padrão global{globalDefaultModel ? ` (${globalDefaultModel})` : ""}
              </button>
            )}

            {groupedCatalog.map((group) => (
              <div key={group.family} className="space-y-0.5">
                <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#8b87b8]">
                  Família {group.family}
                </div>
                {group.items.map((item) => {
                  const isSelected = value === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-testid={testId ? `${testId}-option-${item.id}` : undefined}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition cursor-pointer ${
                        isSelected
                          ? "bg-[#7f77dd] text-white font-semibold"
                          : "text-[#f0eeff] hover:bg-[#251f49]"
                      }`}
                    >
                      <span className="truncate">
                        {item.label}{" "}
                        <span className={isSelected ? "text-white/80" : "text-[#8b87b8]"}>
                          ({item.id})
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {item.input_price_usd != null && item.output_price_usd != null && (
                          <span
                            className={`text-[10px] ${
                              isSelected ? "text-white/90" : "text-emerald-300/85"
                            }`}
                          >
                            {formatModelUsdPrice(item.input_price_usd)} /{" "}
                            {formatModelUsdPrice(item.output_price_usd)}
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-[#1a1535] text-[#AFA9EC]"
                          }`}
                        >
                          {item.tier}
                          {item.available_in_openai ? " ✓" : ""}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}

            {trimmedSearch && !hasExactMatch && (
              <button
                type="button"
                data-testid={testId ? `${testId}-use-custom` : undefined}
                onClick={() => handleSelect(trimmedSearch)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs bg-[#251f49] hover:bg-[#31295f] text-[#AFA9EC] border border-[#7f77dd]/30 transition cursor-pointer"
              >
                Usar ID personalizado: <strong>{trimmedSearch}</strong>
              </button>
            )}

            {groupedCatalog.length === 0 && !trimmedSearch && (
              <p className="text-center py-3 text-xs text-[#8b87b8]">
                Nenhum modelo encontrado.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
