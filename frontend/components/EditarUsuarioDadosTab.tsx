"use client";

import React from "react";

export type EditableUserRole = "client" | "internal_client" | "admin";

interface EditarUsuarioDadosTabProps {
  name: string;
  onNameChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
  whatsapp: string;
  onWhatsappChange: (val: string) => void;
  role: EditableUserRole;
  onRoleChange: (val: EditableUserRole) => void;
  isActive: boolean;
  onIsActiveChange: (val: boolean) => void;
}

export default function EditarUsuarioDadosTab({
  name,
  onNameChange,
  email,
  onEmailChange,
  whatsapp,
  onWhatsappChange,
  role,
  onRoleChange,
  isActive,
  onIsActiveChange,
}: EditarUsuarioDadosTabProps) {
  return (
    <div data-testid="edit-tab-panel-dados" className="space-y-4">
      {/* Nome */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
          Nome Completo *
        </label>
        <input
          data-testid="edit-user-name-input"
          type="text"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: João da Silva"
          className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-400"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(127, 119, 221, 0.3)",
            color: "#f0eeff",
          }}
        />
      </div>

      {/* E-mail */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
          E-mail *
        </label>
        <input
          data-testid="edit-user-email-input"
          type="email"
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="usuario@exemplo.com"
          className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-400"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(127, 119, 221, 0.3)",
            color: "#f0eeff",
          }}
        />
      </div>

      {/* WhatsApp */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
          WhatsApp / Telefone (Opcional)
        </label>
        <input
          data-testid="edit-user-whatsapp-input"
          type="text"
          value={whatsapp}
          onChange={(e) => onWhatsappChange(e.target.value)}
          placeholder="5511999999999"
          className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-400"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(127, 119, 221, 0.3)",
            color: "#f0eeff",
          }}
        />
      </div>

      {/* Tipo de Usuário (Role) */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
          Tipo de Acesso (Papel)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            data-testid="edit-role-client-btn"
            onClick={() => onRoleChange("client")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              role === "client" ? "ring-2 ring-purple-400" : "opacity-75"
            }`}
            style={{
              background: role === "client" ? "rgba(127, 119, 221, 0.2)" : "rgba(255, 255, 255, 0.03)",
              borderColor: role === "client" ? "#7F77DD" : "rgba(127, 119, 221, 0.2)",
            }}
          >
            <div className="font-semibold text-xs" style={{ color: "#f0eeff" }}>
              🎓 Aluno
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "#8b87b8" }}>
              Área de membros e mapa
            </div>
          </button>

          <button
            type="button"
            data-testid="edit-role-internal_client-btn"
            onClick={() => onRoleChange("internal_client")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              role === "internal_client" ? "ring-2 ring-sky-400" : "opacity-75"
            }`}
            style={{
              background: role === "internal_client" ? "rgba(56, 189, 248, 0.14)" : "rgba(255, 255, 255, 0.03)",
              borderColor: role === "internal_client" ? "#38bdf8" : "rgba(127, 119, 221, 0.2)",
            }}
          >
            <div className="font-semibold text-xs" style={{ color: "#38bdf8" }}>
              🧪 Aluno Interno
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "#8b87b8" }}>
              Visão aluno (fora do financeiro)
            </div>
          </button>

          <button
            type="button"
            data-testid="edit-role-admin-btn"
            onClick={() => onRoleChange("admin")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              role === "admin" ? "ring-2 ring-amber-400" : "opacity-75"
            }`}
            style={{
              background: role === "admin" ? "rgba(239, 159, 39, 0.15)" : "rgba(255, 255, 255, 0.03)",
              borderColor: role === "admin" ? "#EF9F27" : "rgba(127, 119, 221, 0.2)",
            }}
          >
            <div className="font-semibold text-xs" style={{ color: "#EF9F27" }}>
              🛡️ Administrador
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "#8b87b8" }}>
              Acesso completo ao painel
            </div>
          </button>
        </div>
      </div>

      {/* Status da Conta */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#AFA9EC" }}>
          Status da Conta
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="edit-status-active-btn"
            onClick={() => onIsActiveChange(true)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isActive ? "ring-2 ring-emerald-400" : "opacity-70"
            }`}
            style={{
              background: isActive ? "rgba(52, 211, 153, 0.2)" : "rgba(255, 255, 255, 0.03)",
              borderColor: isActive ? "#34d399" : "rgba(127, 119, 221, 0.2)",
              color: isActive ? "#34d399" : "#8b87b8",
            }}
          >
            ● Ativo
          </button>

          <button
            type="button"
            data-testid="edit-status-inactive-btn"
            onClick={() => onIsActiveChange(false)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              !isActive ? "ring-2 ring-rose-400" : "opacity-70"
            }`}
            style={{
              background: !isActive ? "rgba(244, 63, 94, 0.2)" : "rgba(255, 255, 255, 0.03)",
              borderColor: !isActive ? "#f43f5e" : "rgba(127, 119, 221, 0.2)",
              color: !isActive ? "#f43f5e" : "#8b87b8",
            }}
          >
            ✕ Inativo
          </button>
        </div>
      </div>
    </div>
  );
}
