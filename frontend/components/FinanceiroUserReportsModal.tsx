"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import type { FinanceiroUserItem } from "./Financeiro";

export interface ReadingReportItem {
  id: string;
  data_alvo: string | null;
  data_fim?: string | null;
  area?: string | null;
  pergunta?: string | null;
  sintese: string;
  textos?: Record<string, string>;
  posicoes?: Record<string, unknown>;
  status: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cost_brl: number;
  created_at: string | null;
}

export interface MapReportItem {
  id: string;
  name: string;
  email: string;
  birth_city: string;
  birth_date: string;
  birth_time: string;
  model_used: string;
  status: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cost_brl: number;
  created_at: string | null;
}

export interface UserReportsResponse {
  user: {
    user_id: string | null;
    name: string;
    email: string;
    role: string;
  };
  period: string;
  sort: string;
  readings: ReadingReportItem[];
  maps: MapReportItem[];
}

interface FinanceiroUserReportsModalProps {
  user: FinanceiroUserItem;
  period: string;
  startDate?: string;
  endDate?: string;
  onClose: () => void;
}

const REPORT_SORT_OPTIONS = [
  { id: "newest", label: "Mais recentes" },
  { id: "oldest", label: "Mais antigas" },
  { id: "highest_cost", label: "Maior gasto" },
  { id: "lowest_cost", label: "Menor gasto" },
];

export function formatBrasiliaDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getRoleBadge(role: string) {
  const normalized = (role || "").toLowerCase();
  if (normalized === "admin" || normalized === "super_admin") {
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
        Admin
      </span>
    );
  }
  if (normalized === "lead") {
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
        Lead
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
      Aluno
    </span>
  );
}

export default function FinanceiroUserReportsModal({
  user,
  period,
  startDate,
  endDate,
  onClose,
}: FinanceiroUserReportsModalProps) {
  const [data, setData] = useState<UserReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState("newest");
  const [activeTab, setActiveTab] = useState<"readings" | "maps">(
    user.readings_count > 0 || user.maps_count === 0 ? "readings" : "maps"
  );
  const [expandedReadingId, setExpandedReadingId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period, sort });
      if (user.user_id) params.set("user_id", user.user_id);
      if (user.email && user.email !== "—") params.set("email", user.email);
      if (period === "custom") {
        if (startDate) params.set("start_date", startDate);
        if (endDate) params.set("end_date", endDate);
      }

      const res = await api.get(`/admin/financeiro/user-reports?${params.toString()}`);
      setData(res);
      if (res.readings.length === 0 && res.maps.length > 0) {
        setActiveTab("maps");
      }
    } catch (err: any) {
      const msg = err?.message || "Erro ao carregar relatórios do usuário.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user.user_id, user.email, period, startDate, endDate, sort]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const readings = data?.readings || [];
  const maps = data?.maps || [];

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="financeiro-reports-modal-title"
    >
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[#1a1535] border border-[#7f77dd]/35 shadow-2xl overflow-hidden text-[#f0eeff]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[#7f77dd]/25 bg-[#14102b]/80">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 id="financeiro-reports-modal-title" className="text-lg font-bold text-[#f0eeff] truncate">
                {user.name}
              </h3>
              {getRoleBadge(user.role)}
            </div>
            <p className="text-xs text-[#8b87b8] truncate mt-0.5">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#251f49] hover:bg-[#31295f] text-[#f0eeff] border border-[#7f77dd]/35 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

        {/* Subheader: Tabs + Ordenação */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-[#7f77dd]/20 bg-[#1a1535]/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("readings")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === "readings"
                  ? "bg-[#7f77dd] text-white"
                  : "bg-[#251f49] text-[#b4b0dc] hover:bg-[#31295f]"
              }`}
            >
              <span>✨</span>
              Leituras do Dia ({readings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("maps")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === "maps"
                  ? "bg-[#7f77dd] text-white"
                  : "bg-[#251f49] text-[#b4b0dc] hover:bg-[#31295f]"
              }`}
            >
              <span>🧭</span>
              Mapas Astrais ({maps.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="modal-reports-sort" className="text-xs text-[#8b87b8]">
              Ordenar:
            </label>
            <select
              id="modal-reports-sort"
              aria-label="Ordenar relatórios"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#14102b] border border-[#7f77dd]/30 text-xs text-[#f0eeff] focus:outline-none focus:border-[#AFA9EC]"
            >
              {REPORT_SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-sm text-[#8b87b8]">
              <span className="inline-block w-4 h-4 border-2 border-[#AFA9EC] border-t-transparent rounded-full animate-spin" />
              Carregando relatórios...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-300">
              {error}
            </div>
          ) : activeTab === "readings" ? (
            readings.length === 0 ? (
              <div className="text-center py-10 text-sm text-[#8b87b8]">
                Nenhuma leitura encontrada para este usuário no período selecionado.
              </div>
            ) : (
              readings.map((r) => {
                const isExpanded = expandedReadingId === r.id;
                const textosEntries = Object.entries(r.textos || {});
                return (
                  <div
                    key={r.id}
                    className="rounded-xl border border-[#7f77dd]/25 bg-[#14102b]/80 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs text-[#AFA9EC]">
                          <span className="inline-flex items-center gap-1">
                            <span>🕒</span>
                            {formatBrasiliaDateTime(r.created_at)} (Brasília)
                          </span>
                          {r.data_alvo && (
                            <span className="px-2 py-0.5 rounded bg-[#251f49] text-[#d6d3ff] text-[11px]">
                              Alvo: {r.data_alvo}
                              {r.data_fim ? ` até ${r.data_fim}` : ""}
                            </span>
                          )}
                          {r.area && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-200 text-[11px]">
                              {r.area}
                            </span>
                          )}
                        </div>
                        {r.pergunta && (
                          <p className="text-xs text-[#b4b0dc] italic truncate">
                            “{r.pergunta}”
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-400">
                            ${r.cost_usd.toFixed(4)}
                          </p>
                          <p className="text-[11px] text-[#8b87b8]">
                            ~R$ {r.cost_brl.toFixed(2)} • {r.total_tokens.toLocaleString("pt-BR")} tokens
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedReadingId(isExpanded ? null : r.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#7f77dd]/20 hover:bg-[#7f77dd]/35 text-[#d6d3ff] border border-[#7f77dd]/40 transition cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <span>▲</span>
                              Ocultar Relatório
                            </>
                          ) : (
                            <>
                              <span>📖</span>
                              Ler Relatório
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-3 border-t border-[#7f77dd]/20 space-y-3 text-sm text-[#e6e3ff]">
                        {r.pergunta && (
                          <div className="rounded-lg bg-[#1a1535] p-3 border border-[#7f77dd]/20">
                            <p className="text-[11px] uppercase tracking-wider text-[#8b87b8] mb-1">
                              Contexto / Pergunta
                            </p>
                            <p className="text-xs text-[#d6d3ff] whitespace-pre-wrap">{r.pergunta}</p>
                          </div>
                        )}

                        {r.sintese && (
                          <div className="rounded-lg bg-[#1a1535] p-3 border border-[#7f77dd]/20">
                            <p className="text-[11px] uppercase tracking-wider text-[#AFA9EC] font-semibold mb-1">
                              Síntese da Leitura
                            </p>
                            <p className="text-xs leading-relaxed text-[#f0eeff] whitespace-pre-wrap">
                              {r.sintese}
                            </p>
                          </div>
                        )}

                        {textosEntries.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[11px] uppercase tracking-wider text-[#8b87b8] font-semibold">
                              Detalhamento por Ponto / Aspecto
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                              {textosEntries.map(([chave, texto]) => (
                                <div
                                  key={chave}
                                  className="rounded-lg bg-[#1a1535]/70 p-3 border border-[#7f77dd]/15"
                                >
                                  <p className="text-xs font-semibold text-[#AFA9EC] mb-1">
                                    {chave}
                                  </p>
                                  <p className="text-xs text-[#d6d3ff] whitespace-pre-wrap leading-relaxed">
                                    {typeof texto === "string" ? texto : JSON.stringify(texto)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : maps.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#8b87b8]">
              Nenhum mapa astral encontrado para este usuário no período selecionado.
            </div>
          ) : (
            maps.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-[#7f77dd]/25 bg-[#14102b]/80 p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#f0eeff]">{m.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#251f49] text-[#AFA9EC]">
                      {m.model_used}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                      {m.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-[#8b87b8]">
                    <span className="inline-flex items-center gap-1 text-[#AFA9EC]">
                      <span>🕒</span>
                      {formatBrasiliaDateTime(m.created_at)} (Brasília)
                    </span>
                    <span>Nascimento: {m.birth_date} {m.birth_time}</span>
                    <span>Cidade: {m.birth_city}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">
                    ${m.cost_usd.toFixed(4)}
                  </p>
                  <p className="text-[11px] text-[#8b87b8]">
                    ~R$ {m.cost_brl.toFixed(2)} • {m.total_tokens.toLocaleString("pt-BR")} tokens
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
