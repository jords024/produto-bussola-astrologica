"use client";

import React from "react";
import { C, Btn, Note, type CityOption, type DstInfo, type FormData } from "@/components/funil/FunilUi";

interface FunilStepCityProps {
  form: FormData;
  cityResults: CityOption[];
  cityLoading: boolean;
  showDropdown: boolean;
  dstInfo: DstInfo | null;
  onCityInput: (q: string) => void;
  setShowDropdown: (v: boolean) => void;
  selectCity: (c: CityOption) => void;
  onClearCity: () => void;
  onSelectDst: (v: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function FunilStepCity({
  form,
  cityResults,
  cityLoading,
  showDropdown,
  dstInfo,
  onCityInput,
  setShowDropdown,
  selectCity,
  onClearCity,
  onSelectDst,
  onBack,
  onNext,
}: FunilStepCityProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: C.light }}>Em qual cidade você nasceu?</h2>
      <p className="text-sm mb-6" style={{ color: C.muted }}>Funciona para qualquer cidade do mundo 🌍</p>

      <div className="relative mb-2">
        <input
          value={form.city_query}
          onChange={e => onCityInput(e.target.value)}
          onFocus={() => cityResults.length > 0 && setShowDropdown(true)}
          placeholder="Digite a cidade (ex: São Paulo, Buenos Aires, Lisboa...)"
          autoComplete="off"
          className="w-full px-4 py-3 rounded-xl outline-none text-base transition-all pr-10"
          style={{ background: C.card, color: C.text, border: `1px solid ${form.selected_city ? C.primary : C.border}` }}
        />
        {cityLoading && <span className="absolute right-3 top-3.5 text-lg animate-spin">⟳</span>}
        {form.selected_city && !cityLoading && <span className="absolute right-3 top-3.5 text-lg">✓</span>}

        {showDropdown && cityResults.length > 0 && (
          <div
            className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            {cityResults.map((c, i) => (
              <button
                key={i}
                onMouseDown={() => selectCity(c)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-b last:border-0"
                style={{ borderColor: C.border }}
              >
                <span className="text-xl flex-shrink-0">{c.flag}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: C.text }}>{c.city}</p>
                  <p className="text-xs truncate" style={{ color: C.muted }}>
                    {[c.state, c.country].filter(Boolean).join(", ")}
                    <span className="ml-2 opacity-60">{c.tz_str}</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {form.selected_city && (
        <div className="rounded-xl p-4 mb-4 flex items-center gap-3"
          style={{ background: `${C.primary}15`, border: `1px solid ${C.primary}40` }}>
          <span className="text-2xl">{form.selected_city.flag}</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: C.light }}>{form.selected_city.display}</p>
            <p className="text-xs" style={{ color: C.muted }}>🕐 Fuso: {form.selected_city.tz_str}</p>
          </div>
          <button
            onClick={onClearCity}
            className="ml-auto text-sm px-2 py-1 rounded-lg"
            style={{ color: C.muted, background: C.bg }}
          >✕ trocar</button>
        </div>
      )}

      {dstInfo?.ambiguous && form.selected_city && !form.no_birth_time && (
        <div className="rounded-xl p-4 mb-4" style={{ background: "#1a1000", border: "1px solid #f59e0b" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "#f59e0b" }}>
            ⚠️ Horário ambíguo — confirmação necessária
          </p>
          <p className="text-xs mb-3" style={{ color: "#d4a" }}>
            Em {form.birth_day}/{form.birth_month}/{form.birth_year}, o relógio foi atrasado em{" "}
            {form.selected_city.tz_str.includes("Brazil") || form.selected_city.tz_str.includes("America/Sao") ? "São Paulo" : form.selected_city.country}.
            A hora <strong>{form.birth_hour?.padStart(2, "0") || "?"}:{form.birth_minute?.padStart(2, "0") || "00"}</strong>{" "}
            ocorreu duas vezes. Como está na certidão de nascimento?
          </p>
          <div className="flex gap-2">
            {[
              { label: "Horário de Verão", value: true, hint: "Relógio adiantado (1h a mais)" },
              { label: "Horário Padrão", value: false, hint: "Após o relógio ser atrasado" },
            ].map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => onSelectDst(opt.value)}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: form.is_dst === opt.value ? "#f59e0b" : C.card,
                  color: form.is_dst === opt.value ? "#000" : C.muted,
                  border: `1px solid ${form.is_dst === opt.value ? "#f59e0b" : C.border}`,
                }}
              >
                {opt.label}<br /><span className="font-normal opacity-70">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {dstInfo?.active === true && !dstInfo.ambiguous && form.selected_city && !form.no_birth_time && (
        <div className="rounded-xl p-3 mb-4 flex gap-3 items-start"
          style={{ background: "#0a1a0a", border: "1px solid #34d399" }}>
          <span className="text-lg mt-0.5">🌞</span>
          <div>
            <p className="text-xs font-medium" style={{ color: "#34d399" }}>Horário de verão detectado</p>
            <p className="text-xs mt-0.5" style={{ color: "#a7f3d0" }}>
              Em {form.birth_day}/{form.birth_month}/{form.birth_year} havia horário de verão em{" "}
              {form.selected_city.country} ({dstInfo.utc_offset}). O sistema já considera isso automaticamente
              — a hora da certidão é o horário local correto.
            </p>
          </div>
        </div>
      )}

      <Note>A cidade é usada para calcular o Ascendente e posições das casas com precisão</Note>

      {form.city_query.trim().length >= 2 && !form.selected_city && !cityLoading && (
        <div className="mt-3 p-3 rounded-xl border text-left" style={{ borderColor: "#f59e0b", background: "#1a1200" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#f59e0b" }}>
            ⚠ Selecione a cidade na lista acima
          </p>
          <p className="text-xs" style={{ color: "#a87d30" }}>
            Clique em um resultado da lista para confirmar sua cidade. Se não aparecer, tente digitar o nome completo ou o nome em inglês (ex: &quot;Sao Paulo&quot;).
          </p>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <Btn onClick={onBack} variant="ghost">Voltar</Btn>
        <Btn
          onClick={onNext}
          disabled={!form.selected_city || (dstInfo?.ambiguous && form.is_dst === null)}
        >
          {dstInfo?.ambiguous && form.is_dst === null ? "Confirme o horário acima" : "Continuar"}
        </Btn>
      </div>
    </div>
  );
}
