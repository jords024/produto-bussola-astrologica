"use client";

import React from "react";

export type UserSortOrder = "desc" | "asc";

interface UsersFilterBarProps {
  search: string;
  onChangeSearch: (value: string) => void;
  roleFilter: string;
  onChangeRoleFilter: (value: string) => void;
  startDate: string;
  onChangeStartDate: (value: string) => void;
  endDate: string;
  onChangeEndDate: (value: string) => void;
  sortOrder: UserSortOrder;
  onChangeSortOrder: (value: UserSortOrder) => void;
  onClearFilters: () => void;
}

export default function UsersFilterBar({
  search,
  onChangeSearch,
  roleFilter,
  onChangeRoleFilter,
  startDate,
  onChangeStartDate,
  endDate,
  onChangeEndDate,
  sortOrder,
  onChangeSortOrder,
  onClearFilters,
}: UsersFilterBarProps) {
  const hasActiveFilters = Boolean(
    search.trim() || roleFilter || startDate || endDate || sortOrder !== "desc"
  );

  return (
    <div
      data-testid="users-filter-bar"
      className="p-4 rounded-2xl space-y-3"
      style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <input
            data-testid="search-users-input"
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => onChangeSearch(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-xs outline-none"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(127, 119, 221, 0.3)",
              color: "#f0eeff",
            }}
          />
        </div>

        <select
          data-testid="role-filter-select"
          aria-label="Filtrar por papel"
          value={roleFilter}
          onChange={(e) => onChangeRoleFilter(e.target.value)}
          className="rounded-xl px-3 py-2 text-xs outline-none cursor-pointer"
          style={{
            background: "#1a1535",
            border: "1px solid rgba(127, 119, 221, 0.3)",
            color: "#f0eeff",
          }}
        >
          <option value="">Todos os Papéis</option>
          <option value="admin">Administrador</option>
          <option value="client">Aluno</option>
          <option value="internal_client">Aluno Interno</option>
        </select>

        <select
          data-testid="sort-order-select"
          aria-label="Ordenar por data de criação"
          value={sortOrder}
          onChange={(e) => onChangeSortOrder(e.target.value as UserSortOrder)}
          className="rounded-xl px-3 py-2 text-xs outline-none cursor-pointer"
          style={{
            background: "#1a1535",
            border: "1px solid rgba(127, 119, 221, 0.3)",
            color: "#f0eeff",
          }}
        >
          <option value="desc">Mais recentes primeiro</option>
          <option value="asc">Mais antigos primeiro</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium" style={{ color: "#8b87b8" }}>
            Data de criação:
          </span>

          <label className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#8b87b8" }}>
            <span>De</span>
            <input
              data-testid="start-date-filter-input"
              type="date"
              aria-label="Data inicial de criação"
              value={startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="rounded-xl px-2.5 py-1.5 text-xs outline-none"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(127, 119, 221, 0.3)",
                color: "#f0eeff",
              }}
            />
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs" style={{ color: "#8b87b8" }}>
            <span>Até</span>
            <input
              data-testid="end-date-filter-input"
              type="date"
              aria-label="Data final de criação"
              value={endDate}
              onChange={(e) => onChangeEndDate(e.target.value)}
              className="rounded-xl px-2.5 py-1.5 text-xs outline-none"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(127, 119, 221, 0.3)",
                color: "#f0eeff",
              }}
            />
          </label>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            data-testid="clear-users-filters-btn"
            onClick={onClearFilters}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer hover:brightness-110"
            style={{
              background: "rgba(127, 119, 221, 0.16)",
              border: "1px solid rgba(127, 119, 221, 0.35)",
              color: "#d6d3ff",
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
