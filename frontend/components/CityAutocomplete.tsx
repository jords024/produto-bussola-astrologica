"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { BRAZIL_STATES, COUNTRIES, CityOption } from "@/lib/locationConstants";

interface CityAutocompleteProps {
  city: string;
  coords: { lat?: number | null; lng?: number | null } | null;
  state: string;
  country: string;
  onSelectCity: (option: CityOption) => void;
  onChangeCity: (text: string) => void;
  onAutoCoordsResolved?: (lat: number, lng: number) => void;
  inputStyle?: React.CSSProperties;
  inputClassName?: string;
  hideLabel?: boolean;
  hideBadge?: boolean;
  placeholder?: string;
}

export default function CityAutocomplete({
  city,
  coords,
  state,
  country,
  onSelectCity,
  onChangeCity,
  onAutoCoordsResolved,
  inputStyle,
  inputClassName,
  hideLabel = false,
  hideBadge = false,
  placeholder = "Ex: Fortaleza, Campinas, etc.",
}: CityAutocompleteProps) {
  const [cityResults, setCityResults] = useState<CityOption[]>([]);
  const [cityDropdown, setCityDropdown] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const cityDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (val: string) => {
    onChangeCity(val);
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    if (val.trim().length < 2) {
      setCityResults([]);
      setCityDropdown(false);
      return;
    }
    cityDebounceRef.current = setTimeout(async () => {
      setCityLoading(true);
      try {
        const results = await api.get<CityOption[]>(`/geocoding/search?q=${encodeURIComponent(val.trim())}`);
        setCityResults(results || []);
        setCityDropdown((results || []).length > 0);
      } catch {
        setCityResults([]);
      } finally {
        setCityLoading(false);
      }
    }, 300);
  };

  // Auto-resolve coordenadas se já houver cidade mas coords nulas
  useEffect(() => {
    let cancel = false;
    if (!coords && city && city.trim().length >= 2 && onAutoCoordsResolved) {
      (async () => {
        try {
          const res = await api.get<CityOption[]>(`/geocoding/search?q=${encodeURIComponent(city.trim())}`);
          if (!cancel && res && Array.isArray(res) && res.length > 0) {
            const m = res.find(r => !state || (r.state && r.state.toLowerCase().includes(state.toLowerCase()))) || res[0];
            if (m && m.lat != null && m.lng != null) {
              onAutoCoordsResolved(m.lat, m.lng);
            }
          }
        } catch {}
      })();
    }
    return () => { cancel = true; };
  }, [city, state, coords, onAutoCoordsResolved]);

  return (
    <div className={hideLabel ? "relative w-full" : "pt-2 relative w-full"}>
      {!hideLabel && (
        <label className="text-xs font-medium block mb-1 text-zinc-400">
          Cidade de Nascimento{" "}
          <span className="text-[10px] text-zinc-500">
            (Digite para escolher no dropdown e definir coordenadas)
          </span>
        </label>
      )}
      <div className="relative w-full">
        <input
          type="text"
          placeholder={placeholder}
          value={city}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (cityResults.length > 0) setCityDropdown(true); }}
          autoComplete="off"
          className={
            inputClassName ||
            "w-full bg-[#18181b] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#d4af37]/60 transition-colors"
          }
          style={inputStyle}
        />
        {cityLoading && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#d4af37]/80 flex items-center gap-1.5 pointer-events-none">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-ping" />
            buscando...
          </span>
        )}
      </div>

      {/* Dropdown de opções de cidades encontradas */}
      {cityDropdown && cityResults.length > 0 && (
        <div
          data-testid="city-dropdown"
          className="absolute right-0 z-50 mt-1.5 min-w-full sm:w-[400px] sm:max-w-[90vw] max-h-60 overflow-y-auto rounded-xl bg-[#141418] border border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.85)] backdrop-blur-md divide-y divide-white/[0.06]"
        >
          {cityResults.map((item, idx) => (
            <button
              key={`${item.city}-${item.lat}-${idx}`}
              type="button"
              onClick={() => {
                onSelectCity(item);
                setCityDropdown(false);
                setCityResults([]);
              }}
              className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.06] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0">{item.flag || "📍"}</span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-zinc-100 group-hover:text-white leading-snug">
                    {item.city}{item.state ? `, ${item.state}` : ""}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {item.country} {item.tz_str ? `• ${item.tz_str}` : ""}
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] font-mono shrink-0 text-[#d4af37]">
                {item.lat?.toFixed(2)}°, {item.lng?.toFixed(2)}°
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Badge de Latitude e Longitude (opcional se não ocultado) */}
      {!hideBadge && coords && coords.lat != null && coords.lng != null && (
        <div
          data-testid="lead-coordinates"
          className="mt-2.5 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 bg-[#d4af37]/[0.08] border border-[#d4af37]/25 text-[#f5e6a3]"
        >
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span>
              <strong>Latitude:</strong> {coords.lat} &nbsp;|&nbsp; <strong>Longitude:</strong> {coords.lng}
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            ✓ Definidas
          </span>
        </div>
      )}
    </div>
  );
}
