"use client";

import React, { useState, useRef, useEffect } from "react";

export interface Country {
  name: string;
  code: string;
  ddi: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { name: "Brasil", code: "BR", ddi: "+55", flag: "🇧🇷" },
  { name: "Portugal", code: "PT", ddi: "+351", flag: "🇵🇹" },
  { name: "Estados Unidos", code: "US", ddi: "+1", flag: "🇺🇸" },
  { name: "Espanha", code: "ES", ddi: "+34", flag: "🇪🇸" },
  { name: "Argentina", code: "AR", ddi: "+54", flag: "🇦🇷" },
  { name: "Chile", code: "CL", ddi: "+56", flag: "🇨🇱" },
  { name: "Uruguai", code: "UY", ddi: "+598", flag: "🇺🇾" },
  { name: "Paraguai", code: "PY", ddi: "+595", flag: "🇵🇾" },
  { name: "México", code: "MX", ddi: "+52", flag: "🇲🇽" },
  { name: "Colômbia", code: "CO", ddi: "+57", flag: "🇨🇴" },
  { name: "Peru", code: "PE", ddi: "+51", flag: "🇵🇪" },
  { name: "Reino Unido", code: "GB", ddi: "+44", flag: "🇬🇧" },
  { name: "França", code: "FR", ddi: "+33", flag: "🇫🇷" },
  { name: "Alemanha", code: "DE", ddi: "+49", flag: "🇩🇪" },
  { name: "Itália", code: "IT", ddi: "+39", flag: "🇮🇹" },
  { name: "Canadá", code: "CA", ddi: "+1", flag: "🇨🇦" },
  { name: "Angola", code: "AO", ddi: "+244", flag: "🇦🇴" },
  { name: "Moçambique", code: "MZ", ddi: "+258", flag: "🇲🇿" },
  { name: "Japão", code: "JP", ddi: "+81", flag: "🇯🇵" },
  { name: "Suíça", code: "CH", ddi: "+41", flag: "🇨🇭" },
];

interface CountryPhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function CountryPhoneInput({
  value,
  onChange,
  placeholder = "(00) 00000-0000",
  disabled = false,
  "data-testid": testId = "input-whatsapp",
}: CountryPhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Brasil por padrão
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extrai número local caso o valor já comece com DDI
  const getPhoneNumberPart = () => {
    if (!value) return "";
    for (const c of COUNTRIES) {
      if (value.startsWith(c.ddi)) {
        return value.slice(c.ddi.length).trim();
      }
    }
    return value;
  };

  const [phonePart, setPhonePart] = useState(getPhoneNumberPart());

  // Sincroniza se o valor externo mudar
  useEffect(() => {
    setPhonePart(getPhoneNumberPart());
  }, [value]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchTerm("");
    const cleanPhone = phonePart.trim();
    if (cleanPhone) {
      onChange(`${country.ddi}${cleanPhone}`);
    } else {
      onChange("");
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPhonePart(raw);
    const clean = raw.trim();
    if (clean) {
      onChange(`${selectedCountry.ddi}${clean}`);
    } else {
      onChange("");
    }
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ddi.includes(searchTerm) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="flex items-center w-full rounded-xl border transition-all overflow-hidden focus-within:border-purple-400"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          borderColor: "rgba(127, 119, 221, 0.3)",
        }}
      >
        {/* Botão Seletor de País / Bandeira */}
        <button
          type="button"
          disabled={disabled}
          data-testid="country-select-button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] transition-colors border-r border-purple-500/20 text-xs text-[#f0eeff] shrink-0"
          title={`País selecionado: ${selectedCountry.name} (${selectedCountry.ddi})`}
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="font-semibold text-purple-200">{selectedCountry.ddi}</span>
          <span className="text-[10px] text-slate-400 ml-0.5">▼</span>
        </button>

        {/* Campo de Telefone */}
        <input
          type="tel"
          disabled={disabled}
          data-testid={testId}
          placeholder={placeholder}
          value={phonePart}
          onChange={handlePhoneChange}
          autoComplete="tel-national"
          data-lpignore="true"
          className="w-full px-3 py-2.5 text-xs outline-none bg-transparent text-[#f0eeff] placeholder-slate-500"
        />
      </div>

      {/* Dropdown Menu com Bandeiras */}
      {isOpen && (
        <div
          data-testid="country-dropdown-menu"
          className="absolute left-0 top-full mt-1.5 w-64 max-h-60 overflow-y-auto rounded-2xl border shadow-2xl z-50 p-1.5 space-y-1"
          style={{
            background: "#1a1535",
            borderColor: "rgba(127, 119, 221, 0.35)",
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.9), 0 0 20px rgba(127, 119, 221, 0.2)",
          }}
        >
          {/* Campo de busca rápida no dropdown */}
          <div className="p-1">
            <input
              type="text"
              autoFocus
              data-testid="country-search-input"
              placeholder="Buscar país ou DDI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white/[0.05] border border-purple-500/20 text-[#f0eeff] placeholder-slate-400 outline-none focus:border-purple-400"
            />
          </div>

          <div className="space-y-0.5 mt-1">
            {filteredCountries.length === 0 ? (
              <div className="p-2 text-center text-xs text-slate-400">Nenhum país encontrado</div>
            ) : (
              filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  data-testid={`country-option-${c.code.toLowerCase()}`}
                  onClick={() => handleSelectCountry(c)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left ${
                    selectedCountry.code === c.code
                      ? "bg-purple-600/30 text-purple-200 font-semibold"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.flag}</span>
                    <span className="truncate max-w-[130px]">{c.name}</span>
                  </div>
                  <span className="text-purple-300 font-mono text-[11px] shrink-0">{c.ddi}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
