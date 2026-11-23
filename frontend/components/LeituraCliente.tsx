"use client";

/**
 * A leitura de trânsitos de um cliente, dentro do painel (dia único ou período).
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import LeituraResultado, { type Leitura } from "@/components/LeituraResultado";

const C = {
  card: "#1a1535",
  primary: "#7F77DD",
  light: "#AFA9EC",
  gold: "#EF9F27",
  text: "#f0eeff",
  muted: "#8b87b8",
  border: "rgba(127,119,221,0.2)",
};

function hoje(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function somaDias(dias: number, baseIso?: string): string {
  const d = baseIso ? new Date(`${baseIso}T12:00:00`) : new Date();
  d.setDate(d.getDate() + dias);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function LeituraCliente({
  clienteId,
  nome,
}: {
  clienteId: string;
  nome?: string;
}) {
  const [modo, setModo] = useState<"dia" | "periodo">("dia");
  const [data, setData] = useState(hoje());
  const [dataFim, setDataFim] = useState(() => somaDias(7));
  const [areas, setAreas] = useState<{ id: string; rotulo: string }[]>([]);
  const [area, setArea] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.get<{ id: string; rotulo: string }[]>("/members/areas")
      .then((res) => setAreas(Array.isArray(res) ? res : []))
      .catch(() => setAreas([]));
  }, []);

  const ler = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const payload: Record<string, unknown> = {
        data,
        area: area || undefined,
        pergunta: pergunta.trim() || undefined,
      };
      if (modo === "periodo" && dataFim > data) {
        payload.data_fim = dataFim;
      }
      setLeitura(await api.post<Leitura>(`/admin/clients/${clienteId}/analise`, payload));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler essa data.");
    } finally {
      setCarregando(false);
    }
  }, [clienteId, data, dataFim, modo, area, pergunta]);

  const primeiroNome = nome?.trim().split(" ")[0] || "";
  const exibido = primeiroNome
    ? primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1)
    : "este cliente";

  return (
    <div className="mt-6">
      <h4 className="text-base font-bold mb-1" style={{ color: "#ffffff" }}>
        Leitura de trânsitos e previsão de período
      </h4>
      <p className="text-xs mb-4" style={{ color: C.muted }}>
        O que o céu de uma data ou período faz no mapa de {exibido}. É a mesma leitura que
        a pessoa vê na área dela.
      </p>

      <div
        className="p-4 rounded-2xl flex flex-col gap-3"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        <div className="inline-flex p-1 rounded-xl self-start" style={{ background: "#120d28", border: `1px solid ${C.border}` }}>
          <button
            type="button"
            onClick={() => setModo("dia")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: modo === "dia" ? C.primary : "transparent",
              color: modo === "dia" ? "#ffffff" : C.light,
            }}
          >
            Dia único
          </button>
          <button
            type="button"
            onClick={() => setModo("periodo")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: modo === "periodo" ? C.primary : "transparent",
              color: modo === "periodo" ? "#ffffff" : C.light,
            }}
          >
            Período
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: C.light }}>
              Data
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "#120d28", color: C.text, border: `1px solid ${C.border}` }}
            />
          </div>
          {modo === "periodo" && (
            <div className="flex-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: C.light }}>
                Até a data
              </label>
              <input
                type="date"
                value={dataFim}
                min={somaDias(1, data)}
                max={somaDias(90, data)}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: "#120d28", color: C.text, border: `1px solid ${C.border}` }}
              />
            </div>
          )}
          <div className="flex-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: C.light }}>
              O que está em jogo
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "#120d28", color: C.text, border: `1px solid ${C.border}` }}
            >
              <option value="">Qualquer área</option>
              {(Array.isArray(areas) ? areas : []).map((a) => (
                <option key={a.id} value={a.id}>{a.rotulo}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.light }}>
              A pergunta ou momento que a pessoa trouxe
            </label>
            <span className="text-[10px] font-mono" style={{ color: C.muted }}>
              {pergunta.length}/300
            </span>
          </div>
          <textarea
            rows={3}
            value={pergunta}
            maxLength={300}
            placeholder="Ex.: Tenho uma reunião importante de negócios e sinto que preciso estar mais seguro sobre como direcionar essa conversa..."
            onChange={(e) => setPergunta(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y"
            style={{ background: "#120d28", color: C.text, border: `1px solid ${C.border}` }}
          />
        </div>

        <button
          onClick={ler}
          disabled={carregando || !data}
          className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-60 self-start"
          style={{ background: `linear-gradient(135deg, ${C.gold}, #c67c13)`, color: "#120b24" }}
        >
          {carregando
            ? "Lendo o céu..."
            : modo === "periodo"
            ? "Ler previsão do período"
            : "Ler essa data"}
        </button>
      </div>

      {carregando && (
        <div
          className="mt-4 p-4 rounded-xl flex items-center gap-3"
          style={{ background: "#120d28", border: `1px solid ${C.gold}44` }}
        >
          <span className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: C.gold, borderTopColor: "transparent" }} />
          <p className="text-xs font-medium" style={{ color: C.light }}>
            Gerando leitura profunda — já, já aparece...
          </p>
        </div>
      )}

      {erro && (
        <p className="mt-3 text-sm px-4 py-3 rounded-xl"
          style={{ color: "#ffb3b3", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.25)" }}>
          {erro}
        </p>
      )}

      {leitura && !carregando && (
        <div className="mt-6">
          <LeituraResultado leitura={leitura} />
        </div>
      )}
    </div>
  );
}
