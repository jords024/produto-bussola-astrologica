"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import CityAutocomplete from "@/components/CityAutocomplete";
import BrazilStateSelect from "@/components/BrazilStateSelect";
import PerfisExtrasManager from "@/components/PerfisExtrasManager";
import { CityOption, BRAZIL_STATES, COUNTRIES } from "@/lib/locationConstants";

interface ColetaDadosBussolaProps {
  onSuccess?: (userData: any) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

const FOCUS_OPTIONS = [
  { id: "geral", rotulo: "Panorama Geral", desc: "Clareza ampla sobre forças ativas e momento de vida" },
  { id: "carreira", rotulo: "Carreira & Negócios", desc: "Timing profissional, projetos, autoridade e liderança" },
  { id: "financas", rotulo: "Finanças & Recursos", desc: "Fluxo material, investimentos e segurança patrimonial" },
  { id: "relacionamentos", rotulo: "Relacionamentos", desc: "Parcerias estratégicas, vínculos afetivos e acordos" },
  { id: "autoconhecimento", rotulo: "Autoconhecimento", desc: "Alinhamento interno, vitalidade e autodomínio" },
];

function resolveBrazilUf(rawState?: string | null): string {
  if (!rawState) return "";
  const norm = rawState
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const found = BRAZIL_STATES.find(
    (s) =>
      s.uf.toLowerCase() === norm ||
      s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === norm
  );
  return found ? found.uf : rawState.trim();
}

export default function ColetaDadosBussola({
  onSuccess,
  onCancel,
  title = "Calibrar Minha Bússola",
  subtitle = "Informe seus dados de nascimento exatos para desenhar sua mandala astronômica e desbloquear as leituras do dia.",
}: ColetaDadosBussolaProps) {
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [horaNascimento, setHoraNascimento] = useState("12:00");
  const [horaDesconhecida, setHoraDesconhecida] = useState(false);
  const [pais, setPais] = useState("Brasil");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [coords, setCoords] = useState<{ lat?: number | null; lng?: number | null } | null>(null);
  const [foco, setFoco] = useState("geral");

  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [etapaStatus, setEtapaStatus] = useState("");
  const [erro, setErro] = useState("");
  const [sucessoMsg, setSucessoMsg] = useState("");

  // Carrega dados existentes do usuário caso já possua
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await api.get<any>("/members/birth-data");
        if (ativo && dados) {
          if (dados.name) setNome(dados.name);
          if (dados.birth_date) setDataNascimento(dados.birth_date);
          if (dados.birth_time) {
            setHoraNascimento(dados.birth_time);
            if (dados.birth_time === "12:00" && !dados.has_data) {
              setHoraDesconhecida(true);
            }
          }
          if (dados.birth_city) setCidade(dados.birth_city);
          if (dados.birth_state) setEstado(resolveBrazilUf(dados.birth_state));
          if (dados.birth_country) setPais(dados.birth_country);
          if (dados.focus_areas && dados.focus_areas.length > 0) {
            setFoco(dados.focus_areas[0]);
          }
        }
      } catch {
        // Silencioso se não houver dados prévios
      } finally {
        if (ativo) setCarregandoDados(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const handleSelectCity = (opt: CityOption) => {
    setCidade(opt.city);
    if (opt.state) {
      setEstado(resolveBrazilUf(opt.state));
    }
    if (opt.country) setPais(opt.country);
    setCoords({ lat: opt.lat, lng: opt.lng });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucessoMsg("");

    if (!dataNascimento) {
      setErro("Por favor, informe sua data de nascimento.");
      return;
    }
    if (!cidade.trim()) {
      setErro("Por favor, informe a cidade onde você nasceu.");
      return;
    }

    setLoading(true);
    setEtapaStatus("Mapeando coordenadas e fuso horário...");

    try {
      const timer1 = setTimeout(() => {
        setEtapaStatus("Calculando posições planetárias (Swiss Ephemeris)...");
      }, 1200);

      const timer2 = setTimeout(() => {
        setEtapaStatus("Desenhando mandala e gerando cúspides natais...");
      }, 2500);

      const payload = {
        name: nome.trim() || undefined,
        birth_date: dataNascimento,
        birth_time: horaDesconhecida ? "12:00" : horaNascimento || "12:00",
        birth_city: cidade.trim(),
        birth_state: estado.trim() || undefined,
        birth_country: pais || "Brasil",
        lat: coords?.lat ?? undefined,
        lng: coords?.lng ?? undefined,
        focus_areas: foco ? [foco] : ["geral"],
      };

      const res = await api.post<any>("/members/birth-data", payload);

      clearTimeout(timer1);
      clearTimeout(timer2);

      setSucessoMsg("Bússola calibrada com sucesso!");
      setEtapaStatus("");

      if (onSuccess) {
        setTimeout(() => {
          onSuccess(res.user);
        }, 800);
      }
    } catch (err: any) {
      setErro(err?.message || "Erro ao salvar dados de nascimento. Verifique as informações.");
    } finally {
      setLoading(false);
    }
  };

  const isBrazil = pais === "Brasil";

  if (carregandoDados) {
    return (
      <div className="p-8 text-center bg-[#121215] border border-white/5 rounded-2xl animate-pulse">
        <p className="text-xs uppercase tracking-widest text-[#d4af37] font-mono">
          Carregando informações da bússola...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0f0f13] border border-white/[0.09] rounded-2xl p-6 sm:p-8 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.85)] relative backdrop-blur-sm">
      {/* Luz ambiente dourada suave no topo */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-[#d4af37]/[0.08] blur-3xl rounded-full" />
      </div>
      {/* Filete de iluminação dourado na borda superior */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />

      {/* Cabeçalho */}
      <div className="relative mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#d4af37]/[0.08] border border-[#d4af37]/25 text-[#d4af37] text-[10px] font-mono tracking-widest uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
            Calibração da Bússola
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
            {subtitle}
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-100 text-xs px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            Fechar
          </button>
        )}
      </div>

      {erro && (
        <div className="mb-5 p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{erro}</span>
        </div>
      )}

      {sucessoMsg && (
        <div className="mb-5 p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <span>✓</span>
          <span>{sucessoMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 relative">
        {/* Campo 1: Nome Completo */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            <span className="text-[#d4af37]/80 font-mono text-[11px] mr-1.5">01.</span>
            Nome Completo
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como você prefere ser chamado(a)"
            className="w-full h-11 bg-[#141418] border border-white/10 rounded-xl px-4 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#d4af37]/70 focus:ring-1 focus:ring-[#d4af37]/30 transition-all"
          />
        </div>

        {/* Linha 2: Data e Hora de Nascimento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              <span className="text-[#d4af37]/80 font-mono text-[11px] mr-1.5">02.</span>
              Data de Nascimento <span className="text-[#d4af37]">*</span>
            </label>
            <input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              required
              className="w-full h-11 bg-[#141418] border border-white/10 rounded-xl px-4 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-[#d4af37]/70 focus:ring-1 focus:ring-[#d4af37]/30 transition-all [color-scheme:dark]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300">
                <span className="text-[#d4af37]/80 font-mono text-[11px] mr-1.5">03.</span>
                Hora de Nascimento
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={horaDesconhecida}
                  onChange={(e) => {
                    setHoraDesconhecida(e.target.checked);
                    if (e.target.checked) setHoraNascimento("12:00");
                  }}
                  className="rounded border-zinc-700 bg-zinc-800 text-[#d4af37] focus:ring-0 cursor-pointer"
                />
                Não sei a hora exata
              </label>
            </div>
            <input
              type="time"
              value={horaNascimento}
              onChange={(e) => setHoraNascimento(e.target.value)}
              disabled={horaDesconhecida}
              className={`w-full h-11 bg-[#141418] border border-white/10 rounded-xl px-4 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-[#d4af37]/70 focus:ring-1 focus:ring-[#d4af37]/30 transition-all [color-scheme:dark] ${
                horaDesconhecida ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
            {horaDesconhecida && (
              <p className="text-[10px] text-zinc-500 mt-1">
                Usaremos o meio-dia (12:00) como referência solar.
              </p>
            )}
          </div>
        </div>

        {/* Linha 3: Local de Nascimento */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-medium text-zinc-300">
            <span className="text-[#d4af37]/80 font-mono text-[11px] mr-1.5">04.</span>
            Local de Nascimento <span className="text-[#d4af37]">*</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* País */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] text-zinc-400 mb-1">País</label>
              <div className="relative">
                <select
                  value={pais}
                  onChange={(e) => {
                    setPais(e.target.value);
                    setEstado("");
                    setCidade("");
                    setCoords(null);
                  }}
                  className="w-full h-11 bg-[#141418] border border-white/10 rounded-xl px-3.5 pr-8 text-xs text-zinc-100 focus:outline-none focus:border-[#d4af37]/70 focus:ring-1 focus:ring-[#d4af37]/30 transition-all appearance-none cursor-pointer"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name} className="bg-zinc-900 text-zinc-200">
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 text-[10px]">
                  ▼
                </div>
              </div>
            </div>

            {/* Estado (se Brasil) */}
            {isBrazil && (
              <div className="sm:col-span-3">
                <label className="block text-[11px] text-zinc-400 mb-1">Estado</label>
                <BrazilStateSelect
                  value={estado}
                  onChange={(uf) => {
                    setEstado(uf);
                    setCidade("");
                    setCoords(null);
                  }}
                />
              </div>
            )}

            {/* Cidade com Autocomplete */}
            <div className={isBrazil ? "sm:col-span-5" : "sm:col-span-8"}>
              <label className="block text-[11px] text-zinc-400 mb-1">Cidade</label>
              <CityAutocomplete
                city={cidade}
                coords={coords}
                state={estado}
                country={pais}
                onSelectCity={handleSelectCity}
                onChangeCity={(val) => {
                  setCidade(val);
                  setCoords(null);
                }}
                hideLabel={true}
                hideBadge={true}
                placeholder="Ex: Ribeirão Preto, São Paulo..."
                inputClassName="w-full h-11 bg-[#141418] border border-white/10 rounded-xl px-3.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#d4af37]/70 focus:ring-1 focus:ring-[#d4af37]/30 transition-all"
              />
            </div>
          </div>

          {coords && coords.lat && coords.lng && (
            <div className="flex items-center gap-2 text-[11px] text-[#e4d18c] bg-[#d4af37]/[0.08] px-3.5 py-2 rounded-xl border border-[#d4af37]/25 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse shrink-0" />
              <span className="font-mono">
                Coordenadas sincronizadas: {Number(coords.lat).toFixed(4)}°, {Number(coords.lng).toFixed(4)}°
              </span>
              <span className="text-[10px] text-zinc-400 ml-auto hidden sm:inline">
                Cúspides e fuso local prontos
              </span>
            </div>
          )}
        </div>

        {/* Loading ou Botão de Envio */}
        <div className="pt-3">
          {loading ? (
            <div className="w-full py-4 px-4 bg-[#141418] border border-[#d4af37]/30 rounded-xl text-center space-y-2">
              <div className="inline-block animate-spin text-lg text-[#d4af37]">🧭</div>
              <p className="text-xs font-mono text-[#d4af37]">{etapaStatus || "Processando cálculo..."}</p>
              <p className="text-[10px] text-zinc-500">Isto leva apenas alguns instantes.</p>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all bg-gradient-to-r from-[#d4af37] via-[#e5c463] to-[#c79d2f] hover:brightness-110 active:scale-[0.99] text-zinc-950 shadow-[0_4px_25px_rgba(212,175,55,0.22)] cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🧭</span>
              <span>Calibrar Minha Bússola & Gerar Mapa</span>
            </button>
          )}
        </div>
      </form>
      <PerfisExtrasManager />
    </div>
  );
}
