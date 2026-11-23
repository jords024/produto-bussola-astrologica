"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import FinanceiroUserReportsModal from "./FinanceiroUserReportsModal";
import FinanceiroSelectionPopup from "./FinanceiroSelectionPopup";
import FinanceiroLoadingPopup from "./FinanceiroLoadingPopup";
import FinanceiroUserLimitBadge from "./FinanceiroUserLimitBadge";
import PaginationControls from "@/components/PaginationControls";

export interface FinanceiroUserItem {
  user_id: string | null;
  name: string;
  email: string;
  role: string;
  maps_count: number;
  readings_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cost_brl: number;
  last_activity_at?: string | null;
  limit_phase?: "max_limit" | "daily_limit" | "unlimited";
  limit_mode?: string;
  active_ai_model?: string;
  total_used?: number;
  max_total_requests?: number | null;
  daily_used?: number;
  daily_request_limit?: number | null;
}

export interface FinanceiroResponse {
  exchange_rate: number;
  period: string;
  summary: {
    total_cost_usd: number;
    total_cost_brl: number;
    month_cost_usd: number;
    month_cost_brl: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_tokens: number;
    avg_cost_per_user_usd: number;
    avg_cost_per_user_brl: number;
    users_count: number;
    maps_count: number;
    readings_count: number;
  };
  users: FinanceiroUserItem[];
}

const PERIOD_OPTIONS = [
  { id: "all", label: "Todo o período" },
  { id: "today", label: "Hoje" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "month", label: "Este mês" },
  { id: "last_month", label: "Mês passado" },
  { id: "custom", label: "Personalizado" },
];

const ROLE_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "client", label: "Alunos" },
  { id: "internal_client", label: "Alunos Internos" },
  { id: "admin", label: "Admins" },
  { id: "lead", label: "Leads" },
];

const SORT_OPTIONS = [
  { id: "newest", label: "Mais recente" },
  { id: "highest_cost", label: "Maior gasto" },
  { id: "lowest_cost", label: "Menor gasto" },
  { id: "oldest", label: "Mais antiga" },
];

export default function Financeiro() {
  const [period, setPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedUser, setSelectedUser] = useState<FinanceiroUserItem | null>(null);
  const [selectedUserKeys, setSelectedUserKeys] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinanceiroResponse | null>(null);
  const pageSize = 10;

  const fetchFinanceiro = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      if (period === "custom") {
        if (startDate) params.set("start_date", startDate);
        if (endDate) params.set("end_date", endDate);
      }
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (sortBy !== "newest") params.set("sort", sortBy);

      const res = await api.get<FinanceiroResponse>(`/admin/financeiro?${params.toString()}`);
      setData(res);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Erro ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, search, roleFilter, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [period, startDate, endDate, search, roleFilter, sortBy]);

  useEffect(() => {
    fetchFinanceiro();
  }, [fetchFinanceiro]);

  const formatUsd = (val: number) => `$${(val || 0).toFixed(4)}`;
  const formatBrl = (val: number) => `R$ ${(val || 0).toFixed(2).replace(".", ",")}`;
  const formatTokens = (val: number) => (val || 0).toLocaleString("pt-BR");

  const summary = data?.summary;
  const users = data?.users || [];
  const getUserSelectionKey = (u: FinanceiroUserItem) => u.user_id || u.email;
  const toggleUserSelection = (key: string) => {
    setSelectedUserKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };
  const selectedUsersForPopup = users.filter((u) =>
    selectedUserKeys.includes(getUserSelectionKey(u))
  );
  const allUsersSelected =
    users.length > 0 &&
    users.every((u) => selectedUserKeys.includes(getUserSelectionKey(u)));
  const toggleSelectAllUsers = () => {
    if (allUsersSelected) {
      setSelectedUserKeys([]);
    } else {
      setSelectedUserKeys(users.map(getUserSelectionKey));
    }
  };
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = users.slice((safePage - 1) * pageSize, safePage * pageSize);

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(239, 159, 39, 0.15)", color: "#EF9F27", border: "1px solid rgba(239, 159, 39, 0.35)" }}>
          🛡️ Admin
        </span>
      );
    }
    if (role === "client") {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(52, 211, 153, 0.12)", color: "#34d399", border: "1px solid rgba(52, 211, 153, 0.35)" }}>
          🎓 Aluno
        </span>
      );
    }
    if (role === "internal_client") {
      return (
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(56, 189, 248, 0.14)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.35)" }}>
          🧪 Aluno Interno
        </span>
      );
    }
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(175, 169, 236, 0.12)", color: "#AFA9EC", border: "1px solid rgba(175, 169, 236, 0.3)" }}>
        ✨ Lead
      </span>
    );
  };

  return (
    <div
      data-testid="financeiro-container"
      className={`space-y-6 ${selectedUsersForPopup.length > 0 ? "pb-28" : ""}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: "#f0eeff" }}>
            <span>💰</span> Financeiro — Consumo de IA
          </h3>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "#8b87b8" }}>
            Gasto consolidado de OpenAI somando mapas astrais e leituras do dia por usuário (cotação fixa R$ {(data?.exchange_rate ?? 5.6).toFixed(2).replace(".", ",")}).
          </p>
        </div>

        <button
          type="button"
          onClick={fetchFinanceiro}
          disabled={loading}
          data-testid="refresh-financeiro-btn"
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, rgba(127, 119, 221, 0.3), rgba(60, 52, 137, 0.5))",
            color: "#f0eeff",
            border: "1px solid rgba(127, 119, 221, 0.4)",
          }}
        >
          <span>🔄</span>
          <span>{loading ? "Atualizando..." : "Atualizar"}</span>
        </button>
      </div>

      {/* Filtros de Período */}
      <div
        className="p-4 rounded-2xl space-y-3"
        style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              data-testid={`period-btn-${opt.id}`}
              onClick={() => setPeriod(opt.id)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: period === opt.id ? "linear-gradient(135deg, #7F77DD, #534ab3)" : "rgba(255, 255, 255, 0.04)",
                color: period === opt.id ? "#ffffff" : "#8b87b8",
                border: period === opt.id ? "1px solid rgba(127, 119, 221, 0.6)" : "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: "#8b87b8" }}>De:</label>
              <input
                type="date"
                data-testid="financeiro-start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl px-3 py-1.5 text-xs outline-none"
                style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(127, 119, 221, 0.3)", color: "#f0eeff" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: "#8b87b8" }}>Até:</label>
              <input
                type="date"
                data-testid="financeiro-end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl px-3 py-1.5 text-xs outline-none"
                style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(127, 119, 221, 0.3)", color: "#f0eeff" }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#7f77dd]/15">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "#8b87b8" }}>Perfil:</span>
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-testid={`role-btn-${opt.id}`}
                onClick={() => setRoleFilter(opt.id)}
                className="px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: roleFilter === opt.id ? "linear-gradient(135deg, #34d399, #059669)" : "rgba(255, 255, 255, 0.04)",
                  color: roleFilter === opt.id ? "#ffffff" : "#8b87b8",
                  border: roleFilter === opt.id ? "1px solid rgba(52, 211, 153, 0.6)" : "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="financeiro-sort-select" className="text-xs font-medium" style={{ color: "#8b87b8" }}>
              Ordenar por:
            </label>
            <select
              id="financeiro-sort-select"
              data-testid="financeiro-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer"
              style={{ background: "#14102b", border: "1px solid rgba(127, 119, 221, 0.35)", color: "#f0eeff" }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl space-y-1" style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), #1a1535)", border: "1px solid rgba(52, 211, 153, 0.3)" }}>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">Gasto Total (Período)</span>
          <div data-testid="financeiro-total-usd" className="text-2xl font-bold text-emerald-300">
            {formatUsd(summary?.total_cost_usd || 0)} <span className="text-xs font-normal">USD</span>
          </div>
          <div data-testid="financeiro-total-brl" className="text-xs text-emerald-200/70">
            ~{formatBrl(summary?.total_cost_brl || 0)}
          </div>
        </div>

        <div className="p-5 rounded-2xl space-y-1" style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.25)" }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#AFA9EC" }}>Gasto no Mês Atual</span>
          <div data-testid="financeiro-month-usd" className="text-2xl font-bold" style={{ color: "#f0eeff" }}>
            {formatUsd(summary?.month_cost_usd || 0)} <span className="text-xs font-normal">USD</span>
          </div>
          <div className="text-xs" style={{ color: "#8b87b8" }}>
            ~{formatBrl(summary?.month_cost_brl || 0)}
          </div>
        </div>

        <div className="p-5 rounded-2xl space-y-1" style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.25)" }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#AFA9EC" }}>Total de Tokens</span>
          <div data-testid="financeiro-total-tokens" className="text-2xl font-bold" style={{ color: "#f0eeff" }}>
            {formatTokens(summary?.total_tokens || 0)}
          </div>
          <div className="text-xs" style={{ color: "#8b87b8" }}>
            {formatTokens(summary?.total_prompt_tokens || 0)} entrada · {formatTokens(summary?.total_completion_tokens || 0)} saída
          </div>
        </div>

        <div className="p-5 rounded-2xl space-y-1" style={{ background: "#1a1535", border: "1px solid rgba(239, 159, 39, 0.3)" }}>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#EF9F27" }}>Custo Médio / Usuário</span>
          <div data-testid="financeiro-avg-usd" className="text-2xl font-bold" style={{ color: "#EF9F27" }}>
            {formatUsd(summary?.avg_cost_per_user_usd || 0)} <span className="text-xs font-normal">USD</span>
          </div>
          <div className="text-xs" style={{ color: "#8b87b8" }}>
            {summary?.maps_count || 0} mapas · {summary?.readings_count || 0} leituras
          </div>
        </div>
      </div>

      {/* Busca por usuário */}
      <div
        className="p-4 rounded-2xl flex items-center gap-3"
        style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
      >
        <input
          data-testid="financeiro-search-input"
          type="text"
          placeholder="Buscar usuário por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl px-4 py-2 text-xs outline-none"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(127, 119, 221, 0.3)",
            color: "#f0eeff",
          }}
        />
      </div>

      {users.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <label
            className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer select-none"
            style={{ color: "#AFA9EC" }}
          >
            <input
              type="checkbox"
              data-testid="financeiro-select-all"
              checked={allUsersSelected}
              onChange={toggleSelectAllUsers}
              className="w-4 h-4 rounded accent-[#7F77DD] cursor-pointer"
            />
            <span>
              {allUsersSelected
                ? `Desmarcar todos (${users.length})`
                : `Selecionar todos (${users.length})`}
            </span>
          </label>
          {selectedUsersForPopup.length > 0 && (
            <span className="text-xs" style={{ color: "#8b87b8" }}>
              {selectedUsersForPopup.length} de {users.length} selecionado(s)
            </span>
          )}
        </div>
      )}

      {/* Lista / Ranking de Consumo por Usuário */}
      <div className="space-y-3">
        {loading && !data ? (
          <div className="p-8 text-center rounded-2xl text-sm" style={{ background: "#1a1535", color: "#8b87b8" }}>
            Calculando consumo financeiro...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center rounded-2xl text-sm" style={{ background: "#1a1535", color: "#8b87b8" }}>
            Nenhum consumo registrado para os filtros selecionados.
          </div>
        ) : (
          paginatedUsers.map((u, idx) => {
            const globalPos = (safePage - 1) * pageSize + idx + 1;
            const selectionKey = getUserSelectionKey(u);
            const isSelected = selectedUserKeys.includes(selectionKey);
            return (
              <div
                key={`${selectionKey}-${globalPos}`}
                className="w-full p-4 rounded-2xl flex items-start md:items-center gap-3 transition-all hover:border-[#7F77DD]/60 hover:bg-[#211b44]"
                style={{
                  background: isSelected ? "rgba(127, 119, 221, 0.14)" : "#1a1535",
                  border: isSelected
                    ? "1px solid rgba(127, 119, 221, 0.7)"
                    : "1px solid rgba(127, 119, 221, 0.2)",
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleUserSelection(selectionKey)}
                  aria-label={`Selecionar ${u.name}`}
                  data-testid={`financeiro-select-user-${idx}`}
                  className="w-4 h-4 mt-2 md:mt-0 rounded accent-[#7F77DD] cursor-pointer shrink-0"
                />
                <button
                  type="button"
                  data-testid={`financeiro-user-row-${idx}`}
                  onClick={() => setSelectedUser(u)}
                  className="flex-1 text-left flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(127, 119, 221, 0.2)", color: "#AFA9EC" }}
                    >
                      #{globalPos}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate" style={{ color: "#f0eeff" }}>
                          {u.name}
                        </span>
                        {getRoleBadge(u.role)}
                      </div>
                      <div className="text-xs truncate mt-0.5" style={{ color: "#8b87b8" }}>
                        {u.email}
                      </div>
                      <FinanceiroUserLimitBadge user={u} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-2 pt-3 border-t border-[#7F77DD]/15 md:border-t-0 md:pt-0 md:flex md:items-center md:gap-6 text-xs w-full md:w-auto">
                    <div className="text-left md:text-right">
                      <div style={{ color: "#8b87b8" }}>Mapas / Leituras</div>
                      <div className="font-semibold" style={{ color: "#f0eeff" }}>
                        {u.maps_count} mapas · {u.readings_count} leituras
                      </div>
                    </div>

                    <div className="text-center md:text-right">
                      <div style={{ color: "#8b87b8" }}>Tokens</div>
                      <div className="font-semibold" style={{ color: "#AFA9EC" }}>
                        {formatTokens(u.total_tokens)}
                      </div>
                    </div>

                    <div className="text-right md:min-w-[110px]">
                      <div className="font-bold text-sm text-emerald-300">
                        {formatUsd(u.cost_usd)}
                      </div>
                      <div className="text-[11px] text-emerald-200/70">
                        ~{formatBrl(u.cost_brl)}
                      </div>
                      <div className="text-[10px] text-[#AFA9EC] mt-0.5">
                        Ver relatórios →
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>

      <PaginationControls
        currentPage={safePage}
        totalPages={totalPages}
        totalItems={users.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemName="usuários"
      />

      {selectedUser && (
        <FinanceiroUserReportsModal
          user={selectedUser}
          period={period}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <FinanceiroSelectionPopup
        selectedUsers={selectedUsersForPopup}
        onClearSelection={() => setSelectedUserKeys([])}
      />

      <FinanceiroLoadingPopup
        isOpen={loading}
        title="Atualizando Financeiro"
        message="Ordenando gastos e consolidando leituras do período..."
      />
    </div>
  );
}
