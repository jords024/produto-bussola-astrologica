"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import Ajuda from "@/components/Ajuda";
import AnaliseResultado from "@/components/analise/AnaliseResultado";
import AstroProfileSelector from "@/components/AstroProfileSelector";
import HistoricoConsultaModal from "@/components/analise/HistoricoConsultaModal";
import HistoricoCompletoModal from "@/components/analise/HistoricoCompletoModal";
import HistoricoChipsBar from "@/components/analise/HistoricoChipsBar";
import AnaliseLoadingCard from "@/components/analise/AnaliseLoadingCard";
import {
  T, sanitizarEntradaTexto, hoje, somaDias, porExtenso, curta, type Analise, type ItemHistorico,
} from "@/components/analise/analiseConstants";

export default function AnaliseDoDia({
  nome,
  analiseIdInicial,
  dataInicial,
  onAnaliseGerada,
  accessExpired = false,
}: {
  nome?: string;
  analiseIdInicial?: string | null;
  dataInicial?: string | null;
  onAnaliseGerada?: () => void;
  accessExpired?: boolean;
}) {
  const [modo, setModo] = useState<"dia" | "periodo">("dia");
  const [data, setData] = useState(dataInicial || hoje());
  const [dataFim, setDataFim] = useState(() => somaDias(7, dataInicial || hoje()));
  const [areas, setAreas] = useState<{ id: string; rotulo: string }[]>([]);
  const [area, setArea] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [etapaLoading, setEtapaLoading] = useState(0);
  const [erro, setErro] = useState("");
  const [zoom, setZoom] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [previewHistorico, setPreviewHistorico] = useState<ItemHistorico | null>(null);
  const [historicoCompletoAberto, setHistoricoCompletoAberto] = useState(false);

  const carregarHistorico = useCallback(async () => {
    try {
      setHistorico(await api.get<ItemHistorico[]>("/members/analises"));
    } catch {
      // Histórico é conveniência.
    }
  }, []);

  useEffect(() => {
    carregarHistorico();
    api.get<{ id: string; rotulo: string }[]>("/members/areas")
      .then(setAreas)
      .catch(() => setAreas([]));
  }, [carregarHistorico]);

  // Carrega análise específica quando solicitado via histórico / Diário de bordo
  useEffect(() => {
    if (!analiseIdInicial) return;
    let ativo = true;
    (async () => {
      try {
        setCarregando(true);
        const a = await api.get<Analise>(`/members/analises/${analiseIdInicial}`);
        if (ativo && a) {
          setAnalise(a);
          setData(a.data);
          if (a.data_fim) {
            setDataFim(a.data_fim);
            setModo("periodo");
          } else {
            setModo("dia");
          }
          if (a.contexto?.area) setArea(a.contexto.area);
          if (a.contexto?.pergunta) setPergunta(a.contexto.pergunta);
        }
      } catch {
        // Silencioso se não carregar
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [analiseIdInicial]);

  useEffect(() => {
    if (!carregando) {
      setEtapaLoading(0);
      return;
    }
    const timer = setInterval(() => {
      setEtapaLoading((atual) => (atual < ETAPAS_LOADING.length - 1 ? atual + 1 : atual));
    }, 3500);
    return () => clearInterval(timer);
  }, [carregando]);

  const gerar = useCallback(async (dia: string, fimOpcional?: string | null) => {
    setCarregando(true);
    setErro("");
    try {
      const payload: Record<string, unknown> = {
        data: dia,
        area: area || undefined,
        pergunta: pergunta.trim() || undefined,
        profile_id: selectedProfileId || undefined,
      };
      const fimEfetivo = fimOpcional !== undefined ? fimOpcional : (modo === "periodo" ? dataFim : undefined);
      if (fimEfetivo && fimEfetivo > dia) {
        payload.data_fim = fimEfetivo;
      }

      const r = await api.post<Analise>("/members/analise", payload);
      setAnalise(r);
      setData(dia);
      if (r.data_fim) {
        setDataFim(r.data_fim);
        setModo("periodo");
      }
      carregarHistorico();
      onAnaliseGerada?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler essa data.");
    } finally {
      setCarregando(false);
    }
  }, [carregarHistorico, onAnaliseGerada, area, pergunta, modo, dataFim, selectedProfileId]);

  const abrirDoHistorico = useCallback(async (item: ItemHistorico) => {
    setCarregando(true);
    setErro("");
    try {
      const a = await api.get<Analise>(`/members/analises/${item.id}`);
      setAnalise(a);
      setData(a.data);
      if (a.data_fim) {
        setDataFim(a.data_fim);
        setModo("periodo");
      } else {
        setModo("dia");
      }
      setArea(a.contexto?.area || "");
      setPergunta(a.contexto?.pergunta || "");
      setSelectedProfileId(item.profile_id || item.contexto?.profile_id || "");
      setPreviewHistorico(null);
      setHistoricoCompletoAberto(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar essa leitura salva.");
    } finally {
      setCarregando(false);
    }
  }, []);

  const aplicarAtalhoPeriodo = (dias: number) => {
    const base = data || hoje();
    setModo("periodo");
    setDataFim(somaDias(dias, base));
  };

  const primeiroNome = nome?.split(" ")[0] || "";

  // Ordenação do Bento Grid: O planeta em destaque fica em 1º lugar
  const posicoesOrdenadas = analise?.posicoes
    ? [...analise.posicoes].sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0))
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Top Header Editorial ────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E2B857]" />
          <span className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: T.gold }}>
            Bússola Astrológica · Sistema de Decisão & Timing
          </span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Análise do Dia & Previsão de Período
          </h1>
          <Ajuda titulo="Como funciona a Bússola">
            Escolha um único dia ou um período inteiro (como os próximos 7, 15 ou 30 dias). O sistema cruza os 5 astros rápidos ativos no céu com os pontos exclusivos do seu nascimento para entregar um mapa de terreno prático, tático e sem rodeios.
          </Ajuda>
        </div>
        <p className="mt-2 text-sm leading-relaxed max-w-2xl" style={{ color: T.textMuted }}>
          Mapeamento cirúrgico de terreno: o que está a favor, onde o atrito exige postura e o passo concreto que você deve executar.
        </p>
      </div>

      {/* ── Painel de Controle Executivo (Selector) ──────────────────────── */}
      <div
        className="p-5 sm:p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm transition-all"
        style={{
          background: T.surface1,
          border: `1px solid ${T.border}`,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Toggle de Modo: Dia Único vs Período */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/[0.06]">
          <div
            className="inline-flex p-1 rounded-xl"
            style={{ background: T.surface2, border: `1px solid ${T.border}` }}
          >
            <button
              type="button"
              onClick={() => setModo("dia")}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all"
              style={{
                background: modo === "dia" ? T.surface3 : "transparent",
                color: modo === "dia" ? "#ffffff" : T.textMuted,
                border: modo === "dia" ? `1px solid ${T.border}` : "1px solid transparent",
              }}
            >
              Leitura de 1 Dia
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("periodo");
                if (!dataFim || dataFim <= data) {
                  setDataFim(somaDias(7, data));
                }
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all"
              style={{
                background: modo === "periodo" ? T.surface3 : "transparent",
                color: modo === "periodo" ? "#ffffff" : T.textMuted,
                border: modo === "periodo" ? `1px solid ${T.border}` : "1px solid transparent",
              }}
            >
              Previsão de Período
            </button>
          </div>

          {modo === "periodo" && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono mr-1 hidden sm:inline" style={{ color: T.textMuted }}>
                Atalhos:
              </span>
              {[
                { label: "+7 dias", dias: 7 },
                { label: "+15 dias", dias: 15 },
                { label: "+30 dias", dias: 30 },
              ].map((atalho) => (
                <button
                  key={atalho.dias}
                  type="button"
                  onClick={() => aplicarAtalhoPeriodo(atalho.dias)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono transition-all hover:bg-white/[0.08]"
                  style={{
                    background: T.surface2,
                    color: T.textLight,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  {atalho.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Datas */}
        <div className="mt-4"><AstroProfileSelector ownerName={nome} selectedProfileId={selectedProfileId} onChange={(id) => setSelectedProfileId(id)} label="Gerar leitura para:" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className={modo === "dia" ? "sm:col-span-2" : ""}>
            <label
              htmlFor="data-analise"
              className="block text-[11px] font-mono uppercase tracking-wider mb-2"
              style={{ color: T.textLight }}
            >
              Data Inicial / Alvo
            </label>
            <input
              id="data-analise"
              type="date"
              value={data}
              min={somaDias(-730)}
              max={somaDias(365)}
              onChange={(e) => {
                const nova = e.target.value;
                setData(nova);
                if (modo === "periodo" && dataFim <= nova) {
                  setDataFim(somaDias(7, nova));
                }
              }}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none transition-all focus:border-[#E2B857]/50"
              style={{ background: T.surface2, color: T.text, border: `1px solid ${T.border}` }}
            />
          </div>

          {modo === "periodo" && (
            <div>
              <label
                htmlFor="data-fim-analise"
                className="block text-[11px] font-mono uppercase tracking-wider mb-2"
                style={{ color: T.textLight }}
              >
                Data Final <span style={{ color: T.textMuted, textTransform: "none" }}>(fechamento do ciclo)</span>
              </label>
              <input
                id="data-fim-analise"
                type="date"
                value={dataFim}
                min={somaDias(1, data)}
                max={somaDias(90, data)}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none transition-all focus:border-[#E2B857]/50"
                style={{ background: T.surface2, color: T.text, border: `1px solid ${T.border}` }}
              />
            </div>
          )}
        </div>

        {/* Inputs de Contexto: Área e Pergunta */}
        <div className="grid grid-cols-1 gap-4 mt-4">
          <div>
            <label
              htmlFor="area-analise"
              className="block text-[11px] font-mono uppercase tracking-wider mb-2"
              style={{ color: T.textLight }}
            >
              Área em Foco <span style={{ color: T.textMuted, textTransform: "none" }}>(opcional)</span>
            </label>
            <select
              id="area-analise"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:border-[#E2B857]/50"
              style={{ background: T.surface2, color: T.text, border: `1px solid ${T.border}` }}
            >
              <option value="">Panorama geral de todas as áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.rotulo}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="pergunta-analise"
                className="block text-[11px] font-mono uppercase tracking-wider"
                style={{ color: T.textLight }}
              >
                Contexto Real / Pergunta do Momento <span style={{ color: T.textMuted, textTransform: "none" }}>(opcional)</span>
              </label>
              <span className="text-[11px] font-mono" style={{ color: T.textMuted }}>
                {pergunta.length}/300
              </span>
            </div>
            <textarea
              id="pergunta-analise"
              rows={2}
              value={pergunta}
              maxLength={300}
              placeholder="Ex.: Tenho uma reunião com cliente para fechar proposta e preciso saber como conduzir o preço..."
              onChange={(e) => setPergunta(sanitizarEntradaTexto(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-y transition-all focus:border-[#E2B857]/50"
              style={{ background: T.surface2, color: T.text, border: `1px solid ${T.border}` }}
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              const hj = hoje();
              setData(hj);
              if (modo === "periodo") {
                setDataFim(somaDias(7, hj));
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all hover:bg-white/[0.05]"
            style={{ color: T.textMuted, border: `1px solid ${T.border}` }}
          >
            Voltar para Hoje
          </button>

          <button
            type="button"
            onClick={() => gerar(data, modo === "periodo" ? dataFim : null)}
            disabled={carregando || !data || accessExpired}
            className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${T.gold}, #b88628)`,
              color: "#08090c",
              boxShadow: "0 4px 20px rgba(226, 184, 87, 0.25)",
            }}
          >
            {carregando
              ? "Calculando céu..."
              : modo === "periodo"
              ? "Ver Previsão do Período"
              : "Ver Leitura do Dia"}
          </button>
        </div>
        {accessExpired && (
          <div data-testid="access-expired-banner" className="mt-4 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 text-xs sm:text-sm space-y-1">
            <p className="font-bold">⏰ Sua conta expirou</p>
            <p className="text-rose-200/85">Seu tempo de acesso à plataforma terminou. Converse com o suporte para ativar novamente a sua conta.</p>
          </div>
        )}
      </div>

      {/* ── Loading State de Precisão ────────────────────────────────────── */}
      {carregando && <AnaliseLoadingCard etapaLoading={etapaLoading} />}

      {/* Erro */}
      {erro && (
        <div
          className="mt-4 px-4 py-3 rounded-xl text-xs font-mono"
          style={{ color: "#ff9999", background: "rgba(255, 60, 60, 0.08)", border: "1px solid rgba(255, 60, 60, 0.2)" }}
        >
          {erro}
        </div>
      )}

      {/* ── Histórico em Micro-Chips (Máx. 6 recentes + Ver Todo o Histórico) ── */}
      <HistoricoChipsBar
        historico={historico}
        selectedProfileId={selectedProfileId}
        analise={analise}
        onSelectChip={setPreviewHistorico}
        onOpenAll={() => setHistoricoCompletoAberto(true)}
      />

      <HistoricoConsultaModal
        item={previewHistorico}
        ownerName={nome}
        areas={areas}
        loading={carregando}
        onClose={() => setPreviewHistorico(null)}
        onConfirmOpen={abrirDoHistorico}
      />

      <HistoricoCompletoModal
        isOpen={historicoCompletoAberto}
        items={historico}
        ownerName={nome}
        areas={areas}
        loading={carregando}
        activeAnaliseId={analise?.id}
        onClose={() => setHistoricoCompletoAberto(false)}
        onSelectOpen={abrirDoHistorico}
      />

      {/* ── Resultado / Conteúdo Tático ──────────────────────────────────── */}

      {analise && !carregando && (
        <AnaliseResultado
          analise={analise}
          primeiroNome={primeiroNome}
          zoom={zoom}
          setZoom={setZoom}
        />
      )}
      {!analise && !carregando && !erro && (
        <div className="mt-8 p-6 rounded-2xl text-center border border-white/[0.06] bg-[#0c0d12]">
          <p className="text-xs font-mono uppercase tracking-widest text-[#E2B857] mb-1">
            ✦ Comece Agora
          </p>
          <p className="text-sm text-gray-400">
            Selecione uma data acima e clique em &ldquo;Ver Leitura do Dia&rdquo; ou configure um período para planejar seus próximos passos.
          </p>
        </div>
      )}
    </div>
  );
}
