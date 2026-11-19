"use client";

import React from "react";

interface UsersMetricsCardsProps {
  totalUsers: number;
  adminCount: number;
  clientCount: number;
  internalClientCount: number;
}

export default function UsersMetricsCards({
  totalUsers,
  adminCount,
  clientCount,
  internalClientCount,
}: UsersMetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        className="p-5 rounded-2xl space-y-1"
        style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
      >
        <span className="text-xs" style={{ color: "#8b87b8" }}>
          Total de Usuários
        </span>
        <div data-testid="metric-total-users" className="text-2xl font-bold" style={{ color: "#f0eeff" }}>
          {totalUsers}
        </div>
      </div>

      <div
        className="p-5 rounded-2xl space-y-1"
        style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
      >
        <span className="text-xs" style={{ color: "#8b87b8" }}>
          Administradores
        </span>
        <div data-testid="metric-admin-users" className="text-2xl font-bold" style={{ color: "#EF9F27" }}>
          {adminCount}
        </div>
      </div>

      <div
        className="p-5 rounded-2xl space-y-1"
        style={{ background: "#1a1535", border: "1px solid rgba(52, 211, 153, 0.25)" }}
      >
        <span className="text-xs" style={{ color: "#8b87b8" }}>
          Alunos Registrados
        </span>
        <div data-testid="metric-real-clients" className="text-2xl font-bold" style={{ color: "#34d399" }}>
          {clientCount}
        </div>
      </div>

      <div
        className="p-5 rounded-2xl space-y-1"
        style={{ background: "#1a1535", border: "1px solid rgba(56, 189, 248, 0.25)" }}
      >
        <span className="text-xs" style={{ color: "#8b87b8" }}>
          Alunos Internos
        </span>
        <div data-testid="metric-internal-clients" className="text-2xl font-bold" style={{ color: "#38bdf8" }}>
          {internalClientCount}
        </div>
      </div>
    </div>
  );
}
