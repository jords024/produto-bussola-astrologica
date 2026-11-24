"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { ZODIAC_SIGNS } from "@/lib/locationConstants";
import MissingInfoModal from "./MissingInfoModal";
import PesquisaClientesChartsList from "./PesquisaClientesChartsList";
import type { Client } from "./ClientCard";

interface PesquisaClientesProps {
  onOpenClient: (id: string) => void;
  onGoToHome: () => void;
}

export default function PesquisaClientes({ onOpenClient, onGoToHome }: PesquisaClientesProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [signFilter, setSignFilter] = useState("");

  // Filtros de Data: Apenas 1 data específica ou um período (range)
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Estado de geração individual e lote
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Modal de Validação de Dados Faltantes
  const [missingModalClient, setMissingModalClient] = useState<Client | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (signFilter) params.set("sign", signFilter);

      const res = await api.get<{ items: Client[] }>(`/admin/clients?${params.toString()}`);
      setClients(res.items || []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [search, signFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Ação para gerar o mapa de um lead individual
  const handleGenerateChart = async (client: Client) => {
    setFeedbackMessage(null);

    // Validação frontend de campos importantes
    const missing: string[] = [];
    if (!client.name?.trim()) missing.push("Nome completo");
    if (!client.birth_date) missing.push("Data de nascimento");
    if (!client.birth_time) missing.push("Horário de nascimento");
    if (!client.birth_country?.trim()) missing.push("País de nascimento");
    if (!client.birth_state?.trim()) missing.push("Estado");

    if (missing.length > 0) {
      setMissingModalClient({ ...client, missing_fields: missing });
      return;
    }

    setGeneratingId(client.id);
    try {
      const res = await api.post<{ message: string; sun_sign?: string }>(`/admin/clients/${client.id}/generate-chart`);
      setFeedbackMessage({ type: "success", text: res.message || "Mapa astral criado com sucesso!" });
      await fetchClients();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar mapa astral do lead.";
      if (msg.toLowerCase().includes("faltando informações") || msg.toLowerCase().includes("home")) {
        setMissingModalClient({
          ...client,
          missing_fields: client.missing_fields || ["Informações de nascimento"],
        });
      } else {
        setFeedbackMessage({ type: "error", text: msg });
      }
    } finally {
      setGeneratingId(null);
    }
  };

  // Ação principal acionada pelo botão "✨ Gerar Mapa Astral"
  const handleBatchGenerate = async () => {
    setFeedbackMessage(null);

    if (dateMode === "single" && !singleDate) {
      setFeedbackMessage({
        type: "error",
        text: "Por favor, selecione uma data específica antes de gerar o mapa astral.",
      });
      return;
    }

    if (dateMode === "range" && (!startDate || !endDate)) {
      setFeedbackMessage({
        type: "error",
        text: "Por favor, selecione a data de início e de término do período antes de gerar o mapa astral.",
      });
      return;
    }

    if (clients.length === 0) {
      setFeedbackMessage({
        type: "error",
        text: "Nenhum cadastro encontrado para a data/período selecionado. Verifique os dados cadastrados na aba Home.",
      });
      return;
    }

    // Filtra leads que possuem informações completas para cálculo astronômico
    const validClients = clients.filter(c => {
      return Boolean(c.name && c.birth_date && c.birth_time && c.birth_country && c.birth_state);
    });

    if (validClients.length === 0) {
      const incompleteLead = clients[0];
      const missing: string[] = [];
      if (!incompleteLead.name) missing.push("Nome completo");
      if (!incompleteLead.birth_date) missing.push("Data de nascimento");
      if (!incompleteLead.birth_time) missing.push("Horário de nascimento");
      if (!incompleteLead.birth_country) missing.push("País de nascimento");
      if (!incompleteLead.birth_state) missing.push("Estado");
      setMissingModalClient({ ...incompleteLead, missing_fields: missing });
      return;
    }

    setBatchLoading(true);
    try {
      const payload: Record<string, unknown> = {
        client_ids: validClients.map(c => c.id),
      };
      if (dateMode === "single" && singleDate) {
        payload.start_date = singleDate;
        payload.end_date = singleDate;
      } else if (dateMode === "range") {
        if (startDate) payload.start_date = startDate;
        if (endDate) payload.end_date = endDate;
      }

      const res = await api.post<{ generated_count: number; skipped_missing_count: number }>(
        "/admin/clients/batch-generate",
        payload
      );
      setFeedbackMessage({
        type: "success",
        text: `Sucesso: ${res.generated_count} mapa(s) astral(is) gerado(s) com sucesso!`,
      });
      await fetchClients();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar criação de mapa astral.";
      setFeedbackMessage({ type: "error", text: msg });
    } finally {
      setBatchLoading(false);
    }
  };

  const inputStyle = {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(127, 119, 221, 0.3)",
    color: "#f0eeff",
    borderRadius: "12px",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none",
  };

  const readyClients = clients.filter(c => c.status === "ready");
  const pendingClients = clients.filter(c => c.status !== "ready");
  const pendingCount = pendingClients.length;

  // Formatação amigável da data ou período selecionado
  const formattedDateSelection = (() => {
    const formatDateBr = (d: string) => {
      if (!d) return "";
      const [year, month, day] = d.split("-");
      return `${day}/${month}/${year}`;
    };

    if (dateMode === "single" && singleDate) {
      return `Data: ${formatDateBr(singleDate)}`;
    }
    if (dateMode === "range" && (startDate || endDate)) {
      if (startDate && endDate) {
        return `Período: ${formatDateBr(startDate)} até ${formatDateBr(endDate)}`;
      }
      if (startDate) return `A partir de ${formatDateBr(startDate)}`;
      if (endDate) return `Até ${formatDateBr(endDate)}`;
    }
    return "Todas as datas";
  })();

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedbackMessage && (
        <div
          className="p-4 rounded-xl text-sm flex items-center justify-between gap-3 shadow-lg"
          style={{
            background: feedbackMessage.type === "success" ? "rgba(52, 211, 153, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${feedbackMessage.type === "success" ? "rgba(52, 211, 153, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
            color: feedbackMessage.type === "success" ? "#34d399" : "#f87171",
          }}
        >
          <div className="flex items-center gap-2">
            <span>{feedbackMessage.type === "success" ? "✨" : "⚠️"}</span>
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-xs opacity-75 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Painel de Filtros e Pesquisa */}
      <div
        className="rounded-2xl p-5 backdrop-blur-md space-y-4"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.2)",
        }}
      >
        {/* Linha 1: Input de Busca, Signo e Botão Pesquisar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <input
              placeholder="Buscar por nome, email ou signo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchClients();
              }}
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>

          <select
            value={signFilter}
            onChange={(e) => setSignFilter(e.target.value)}
            style={{ ...inputStyle, width: "160px", cursor: "pointer" }}
          >
            <option value="" style={{ background: "#1a1535" }}>Todos os signos</option>
            {ZODIAC_SIGNS.map((s) => (
              <option key={s} value={s} style={{ background: "#1a1535" }}>{s}</option>
            ))}
          </select>

          {/* Botão de Pesquisa */}
          <button
            type="button"
            onClick={() => fetchClients()}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 hover:brightness-110 active:scale-95 shadow-md shrink-0"
            style={{
              background: "rgba(127, 119, 221, 0.25)",
              border: "1px solid rgba(127, 119, 221, 0.5)",
              color: "#f0eeff",
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-purple-300" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Pesquisar</span>
              </>
            )}
          </button>
        </div>

        {/* Linha 2: Filtro de Datas e Botão Gerar Mapa Astral */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-purple-900/30">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs" style={{ color: "#AFA9EC" }}>
              <span>📅 Data do Mapa:</span>
              <div className="flex rounded-lg overflow-hidden border border-purple-500/30">
                <button
                  type="button"
                  onClick={() => setDateMode("single")}
                  className="px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    background: dateMode === "single" ? "rgba(127, 119, 221, 0.4)" : "transparent",
                    color: dateMode === "single" ? "#f0eeff" : "#8b87b8",
                  }}
                >
                  Data Específica
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode("range")}
                  className="px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    background: dateMode === "range" ? "rgba(127, 119, 221, 0.4)" : "transparent",
                    color: dateMode === "range" ? "#f0eeff" : "#8b87b8",
                  }}
                >
                  Período (Range)
                </button>
              </div>
            </div>

            {dateMode === "single" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  style={inputStyle}
                />
                {singleDate && (
                  <button
                    type="button"
                    onClick={() => setSingleDate("")}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Limpar
                  </button>
                )}
              </div>
            )}

            {dateMode === "range" && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={inputStyle}
                />
                <span className="text-xs text-zinc-400">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={inputStyle}
                />
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => { setStartDate(""); setEndDate(""); }}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Limpar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Botão de Geração de Mapa Astral (Sempre Visível) */}
          <button
            type="button"
            onClick={handleBatchGenerate}
            disabled={batchLoading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 shrink-0"
            style={{
              background: "linear-gradient(135deg, #7F77DD, #3C3489)",
              color: "#ffffff",
              border: "1px solid rgba(175, 169, 236, 0.3)",
              boxShadow: "0 4px 15px rgba(127, 119, 221, 0.3)",
              opacity: batchLoading ? 0.7 : 1,
            }}
          >
            {batchLoading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Criando Mapa Astral...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Gerar Mapa Astral</span>
                {clients.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
                    {clients.length}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Área Inferior: Status / Feedback de Geração sem listar o nome do usuário */}
      {loading ? (
        <div className="py-12 text-center text-sm" style={{ color: "#8b87b8" }}>
          <div className="inline-block animate-spin text-xl mb-2">🧭</div>
          <p>Consultando base de dados...</p>
        </div>
      ) : clients.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center space-y-4"
          style={{ background: "#1a1535", border: "1px dashed rgba(127, 119, 221, 0.25)" }}
        >
          <div className="text-3xl">🌌</div>
          <h3 className="font-semibold text-base" style={{ color: "#f0eeff" }}>
            Nenhum cliente cadastrado encontrado
          </h3>
          <p className="text-xs max-w-sm mx-auto" style={{ color: "#8b87b8" }}>
            Acesse a aba Home para preencher as informações de nascimento de um novo cliente.
          </p>
          <button
            type="button"
            onClick={onGoToHome}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #7F77DD, #3C3489)" }}
          >
            👉 Ir para a Home e Preencher Informações
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seção de Mapas Astrais Gerados (paginada: 5 por página para evitar múltiplas requisições simultâneas) */}
          <PesquisaClientesChartsList
            readyClients={readyClients}
            formattedDateSelection={formattedDateSelection}
            onOpenClient={onOpenClient}
          />

          {/* Aviso quando ainda houver cadastros pendentes sem mapa gerado */}
          {pendingClients.length > 0 && (
            <div
              data-testid="status-area"
              className="rounded-2xl p-8 text-center space-y-3 backdrop-blur-md"
              style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
            >
              <div className="text-3xl">✨</div>
              <h3 className="font-semibold text-base" style={{ color: "#f0eeff" }}>
                {`${pendingClients.length} cadastro(s) aguardando geração para esta data/período`}
              </h3>
              <p className="text-xs max-w-md mx-auto" style={{ color: "#8b87b8" }}>
                Clique no botão &apos;Gerar Mapa Astral&apos; acima para criar o mapa cósmico.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal Centralizado de Confirmação / Aviso de Informações Faltantes */}
      <MissingInfoModal
        client={missingModalClient}
        onClose={() => setMissingModalClient(null)}
        onGoToHome={onGoToHome}
      />
    </div>
  );
}
