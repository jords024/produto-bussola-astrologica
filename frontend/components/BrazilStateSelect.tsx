"use client";

import React, { useState, useRef, useEffect } from "react";
import { BRAZIL_STATES } from "@/lib/locationConstants";

interface BrazilStateSelectProps {
  value: string;
  onChange: (uf: string) => void;
}

function normalizeText(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function BrazilStateSelect({ value, onChange }: BrazilStateSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const selected = BRAZIL_STATES.find((st) => st.uf === value);
  const query = normalizeText(search);
  const filtered = BRAZIL_STATES.filter(
    (st) =>
      normalizeText(st.uf).includes(query) ||
      normalizeText(st.name).includes(query)
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-testid="state-select-button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-11 bg-[#141418] border border-white/10 rounded-xl px-3 text-xs text-zinc-100 focus:outline-none focus:border-[#d4af37]/70 focus:ring-1 focus:ring-[#d4af37]/30 transition-all flex items-center justify-between gap-2 cursor-pointer"
      >
        <span className={`truncate ${selected ? "text-zinc-100" : "text-zinc-400"}`}>
          {selected ? `${selected.uf} - ${selected.name}` : "UF"}
        </span>
        <span className="text-zinc-500 text-[10px] shrink-0">▼</span>
      </button>

      {isOpen && (
        <div
          data-testid="state-dropdown-menu"
          className="absolute left-0 top-full mt-1.5 w-60 z-50 rounded-xl bg-[#141418] border border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.85)] backdrop-blur-md overflow-hidden"
        >
          <div className="p-2 border-b border-white/10">
            <input
              ref={searchInputRef}
              type="text"
              data-testid="state-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar estado ou UF..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#1c1c22] border border-white/10 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-[#d4af37]/60"
            />
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-white/[0.04]">
            <button
              type="button"
              data-testid="state-option-empty"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              UF (Todos)
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-zinc-500 text-center">
                Nenhum estado encontrado
              </div>
            ) : (
              filtered.map((st) => (
                <button
                  key={st.uf}
                  type="button"
                  data-testid={`state-option-${st.uf}`}
                  onClick={() => {
                    onChange(st.uf);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                    value === st.uf
                      ? "bg-[#d4af37]/15 text-[#f5e6a3] font-semibold"
                      : "text-zinc-200 hover:bg-white/[0.06]"
                  }`}
                >
                  <span>{st.uf} - {st.name}</span>
                  {value === st.uf && <span className="text-[10px]">✓</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
