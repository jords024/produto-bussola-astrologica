"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import type { FinanceiroUserItem } from "./Financeiro";
import FinanceiroUserChartTab from "./FinanceiroUserChartTab";
import FinanceiroUserReportsDateFilter, {
  groupCountsByBrasiliaDate,
  filterItemsByDate,
} from "./FinanceiroUserReportsDateFilter";
import FinanceiroUserReadingCard from "./FinanceiroUserReadingCard";

export interface ReadingReportItem {
  id: string;
  data_alvo: string | null;
  data_fim?: string | null;
  area?: string | null;
  pergunta?: string | null;
  model_used?: string | null;
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

export function formatShortDateBr(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year.slice(-2)}`;
  }
  return isoDate;
}

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
  if (normalized === "internal_client") {
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
        Aluno Interno
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
  const [activeTab, setActiveTab] = useState<"readings" | "maps" | "chart">(
    user.readings_count > 0 || user.maps_count === 0 ? "readings" : "maps"
  );
  const [expandedReadingId, setExpandedReadingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  const clearDateFilter = useCallback(() => {
    setSelectedDate(null);
    setFilterStartDate("");
    setFilterEndDate("");
  }, []);

  const handleTabChange = (tab: "readings" | "maps" | "chart") => {
    setActiveTab(tab);
    clearDateFilter();
  };

  const handleSelectDate = (dateKey: string | null) => {
    setSelectedDate(dateKey);
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const handleChangeStartDate = (value: string) => {
    setSelectedDate(null);
    setFilterStartDate(value);
  };

  const handleChangeEndDate = (value: string) => {
    setSelectedDate(null);
    setFilterEndDate(value);
  };

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

      const res = await api.get<UserReportsResponse>(`/admin/financeiro/user-reports?${params.toString()}`);
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

  const dateGroups = useMemo(
    () =>
      activeTab === "readings"
        ? groupCountsByBrasiliaDate(readings)
        : groupCountsByBrasiliaDate(maps),
    [activeTab, readings, maps]
  );

  const filteredReadings = useMemo(
    () => filterItemsByDate(readings, selectedDate, filterStartDate, filterEndDate),
    [readings, selectedDate, filterStartDate, filterEndDate]
  );

  const filteredMaps = useMemo(
    () => filterItemsByDate(maps, selectedDate, filterStartDate, filterEndDate),
    [maps, selectedDate, filterStartDate, filterEndDate]
  );

  const activeTotalCount = activeTab === "readings" ? readings.length : maps.length;
  const activeFilteredCount =
    activeTab === "readings" ? filteredReadings.length : filteredMaps.length;

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
              onClick={() => handleTabChange("readings")}
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
              onClick={() => handleTabChange("maps")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === "maps"
                  ? "bg-[#7f77dd] text-white"
                  : "bg-[#251f49] text-[#b4b0dc] hover:bg-[#31295f]"
              }`}
            >
              <span>🧭</span>
              Mapas Astrais ({maps.length})
            </button>
            <button
              type="button"
              data-testid="financeiro-modal-tab-chart"
              onClick={() => handleTabChange("chart")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === "chart"
                  ? "bg-[#7f77dd] text-white"
                  : "bg-[#251f49] text-[#b4b0dc] hover:bg-[#31295f]"
              }`}
            >
              <span>🪐</span>
              Mapa do Aluno
            </button>
          </div>

          {activeTab !== "chart" && (
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
          )}
        </div>

        {activeTab !== "chart" && !loading && !error && activeTotalCount > 0 && (
          <FinanceiroUserReportsDateFilter
            totalCount={activeTotalCount}
            filteredCount={activeFilteredCount}
            dateGroups={dateGroups}
            selectedDate={selectedDate}
            startDate={filterStartDate}
            endDate={filterEndDate}
            onSelectDate={handleSelectDate}
            onChangeStartDate={handleChangeStartDate}
            onChangeEndDate={handleChangeEndDate}
            onClear={clearDateFilter}
          />
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {activeTab === "chart" ? (
            <FinanceiroUserChartTab userId={user.user_id} userName={user.name} />
          ) : loading ? (
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
            ) : filteredReadings.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <p className="text-sm text-[#8b87b8]">
                  Nenhuma leitura encontrada para a data selecionada.
                </p>
                <button
                  type="button"
                  onClick={clearDateFilter}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#251f49] hover:bg-[#31295f] text-[#d6d3ff] border border-[#7f77dd]/30 transition cursor-pointer"
                >
                  Limpar filtro de data
                </button>
              </div>
            ) : (
              filteredReadings.map((r) => (
                <FinanceiroUserReadingCard
                  key={r.id}
                  reading={r}
                  isExpanded={expandedReadingId === r.id}
                  onToggleExpand={() =>
                    setExpandedReadingId(expandedReadingId === r.id ? null : r.id)
                  }
                  formatShortDateBr={formatShortDateBr}
                  formatBrasiliaDateTime={formatBrasiliaDateTime}
                />
              ))
            )
          ) : maps.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#8b87b8]">
              Nenhum mapa astral encontrado para este usuário no período selecionado.
            </div>
          ) : filteredMaps.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-sm text-[#8b87b8]">
                Nenhum mapa astral encontrado para a data selecionada.
              </p>
              <button
                type="button"
                onClick={clearDateFilter}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#251f49] hover:bg-[#31295f] text-[#d6d3ff] border border-[#7f77dd]/30 transition cursor-pointer"
              >
                Limpar filtro de data
              </button>
            </div>
          ) : (
            filteredMaps.map((m) => (
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
