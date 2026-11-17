"use client";

import React from "react";
import { PanelUser } from "@/components/GestaoUsuarios";

interface UsuarioCardProps {
  user: PanelUser;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (user: PanelUser) => void;
  onResetPassword?: (user: PanelUser) => void;
  onDelete?: (user: PanelUser) => void;
  formatBrasiliaDate: (dateStr?: string) => string;
}

export default function UsuarioCard({
  user: u,
  isSelected,
  onToggleSelect,
  onEdit,
  onResetPassword,
  onDelete,
  formatBrasiliaDate,
}: UsuarioCardProps) {
  const isAdmin = u.role === "admin";

  return (
    <div
      data-testid={`user-row-${u.id}`}
      className={`p-4 sm:p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 transition-all hover:border-purple-500/40 w-full overflow-hidden ${
        isSelected ? "border-purple-500/60 bg-purple-500/5" : ""
      }`}
      style={{
        background: isSelected ? "rgba(127, 119, 221, 0.08)" : "#1a1535",
        border: isSelected ? "1px solid rgba(127, 119, 221, 0.5)" : "1px solid rgba(127, 119, 221, 0.2)",
      }}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {/* Checkbox de Seleção (Super Admin e Conta Atual protegidos) */}
        {!u.is_super_admin && !u.is_current_user ? (
          <input
            type="checkbox"
            data-testid={`select-user-${u.id}`}
            checked={isSelected}
            onChange={() => onToggleSelect(u.id)}
            className="w-4 h-4 rounded cursor-pointer accent-purple-500 shrink-0"
          />
        ) : u.is_super_admin ? (
          <span
            title="Super Admin protegido contra exclusão"
            className="w-4 h-4 flex items-center justify-center text-[11px] text-amber-400 select-none shrink-0"
          >
            👑
          </span>
        ) : (
          <span
            title="Sua conta atual (protegida contra exclusão)"
            className="w-4 h-4 flex items-center justify-center text-[11px] text-purple-300 select-none shrink-0"
          >
            👤
          </span>
        )}

        <div
          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
          style={{
            background: isAdmin ? "rgba(239, 159, 39, 0.15)" : "rgba(127, 119, 221, 0.2)",
            border: `1px solid ${isAdmin ? "rgba(239, 159, 39, 0.4)" : "rgba(127, 119, 221, 0.3)"}`,
            color: isAdmin ? "#EF9F27" : "#AFA9EC",
          }}
        >
          {u.name ? u.name.charAt(0).toUpperCase() : "U"}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm sm:text-base" style={{ color: "#f0eeff" }}>
              {u.name}
            </span>

            {/* Badge de Papel */}
            {u.is_super_admin ? (
              <span
                data-testid={`badge-super-admin-${u.id}`}
                className="text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"
                style={{
                  background: "linear-gradient(135deg, rgba(239, 159, 39, 0.25), rgba(217, 119, 6, 0.25))",
                  color: "#FBBF24",
                  border: "1px solid rgba(251, 191, 36, 0.4)",
                }}
              >
                👑 Super Admin
              </span>
            ) : (
              <span
                className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"
                style={{
                  background: isAdmin ? "rgba(239, 159, 39, 0.15)" : "rgba(52, 211, 153, 0.15)",
                  color: isAdmin ? "#EF9F27" : "#34d399",
                  border: `1px solid ${isAdmin ? "rgba(239, 159, 39, 0.3)" : "rgba(52, 211, 153, 0.3)"}`,
                }}
              >
                {isAdmin ? "🛡️ Administrador" : "🎓 Aluno"}
              </span>
            )}

            {/* Status */}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: u.is_active ? "rgba(52, 211, 153, 0.1)" : "rgba(239, 68, 68, 0.1)",
                color: u.is_active ? "#34d399" : "#f87171",
                border: `1px solid ${u.is_active ? "rgba(52, 211, 153, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
              }}
            >
              {u.is_active ? "Ativo" : "Inativo"}
            </span>

            {/* Badge Identificação Própria Conta */}
            {u.is_current_user && (
              <span
                data-testid={`badge-current-user-${u.id}`}
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                style={{
                  background: "rgba(127, 119, 221, 0.2)",
                  color: "#c4b5fd",
                  border: "1px solid rgba(127, 119, 221, 0.4)",
                }}
              >
                👤 Você
              </span>
            )}

            {/* Badge Tempo de Acesso (apenas Alunos com prazo) */}
            {!isAdmin && u.access_expires_at && (
              <span
                data-testid={`badge-access-${u.id}`}
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                style={{
                  background: u.access_expired ? "rgba(244, 63, 94, 0.15)" : "rgba(239, 159, 39, 0.12)",
                  color: u.access_expired ? "#fda4af" : "#fbbf24",
                  border: `1px solid ${u.access_expired ? "rgba(244, 63, 94, 0.35)" : "rgba(239, 159, 39, 0.3)"}`,
                }}
              >
                {u.access_expired
                  ? "⏰ Acesso Expirado"
                  : `⏳ Até ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(u.access_expires_at))}`}
              </span>
            )}
          </div>

          <div className="text-xs" style={{ color: "#8b87b8" }}>
            ✉️ {u.email} {u.whatsapp ? ` · 📱 ${u.whatsapp}` : ""}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-2.5 sm:gap-4 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
        <div className="text-left sm:text-right space-y-0.5 shrink-0">
          <p className="text-xs font-mono" style={{ color: "#AFA9EC" }} title="Data de Cadastro">
            Cadastrado em {formatBrasiliaDate(u.created_at)}
          </p>
          {u.birth_city && (
            <p className="text-[11px]" style={{ color: "#8b87b8" }}>
              📍 {u.birth_city} {u.sun_sign ? `· ☀️ ${u.sun_sign}` : ""}
            </p>
          )}
        </div>

        {/* Ações do Usuário */}
        {u.is_super_admin ? (
          <span
            data-testid={`super-admin-tag-${u.id}`}
            className="px-3 py-1.5 rounded-xl text-[11px] font-medium select-none self-start sm:self-auto"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              color: "#8b87b8",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
            title="Super Admin configurado na ENV não pode ser alterado"
          >
            🔒 Fixo (ENV)
          </span>
        ) : (
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
            {/* Botão Redefinir Senha (gera link) */}
            {onResetPassword && (
              <button
                type="button"
                data-testid={`reset-user-pwd-btn-${u.id}`}
                onClick={() => onResetPassword(u)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all hover:bg-purple-500/20 active:scale-95 cursor-pointer"
                style={{
                  background: "rgba(127, 119, 221, 0.15)",
                  color: "#c4b5fd",
                  border: "1px solid rgba(127, 119, 221, 0.35)",
                }}
                title="Gerar link para o usuário redefinir sua senha"
              >
                <span>🔑</span>
                <span>Redefinir Senha</span>
              </button>
            )}

            {/* Botão Editar Usuário */}
            <button
              type="button"
              data-testid={`edit-user-btn-${u.id}`}
              onClick={() => onEdit(u)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#f0eeff",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
              title="Editar informações do usuário"
            >
              <span>✏️</span>
              <span>Editar</span>
            </button>

            {/* Botão Excluir Usuário (protegido se for a própria conta) */}
            {onDelete && !u.is_current_user && (
              <button
                type="button"
                data-testid={`delete-user-btn-${u.id}`}
                onClick={() => onDelete(u)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all hover:bg-rose-500/25 active:scale-95 cursor-pointer"
                style={{
                  background: "rgba(244, 63, 94, 0.12)",
                  color: "#fda4af",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                }}
                title="Excluir este usuário permanentemente"
              >
                <span>🗑️</span>
                <span className="hidden sm:inline">Excluir</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
