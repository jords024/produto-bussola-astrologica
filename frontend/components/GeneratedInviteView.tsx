"use client";

import React from "react";

interface GeneratedInviteViewProps {
  role: string;
  validityType: string;
  inviteUrl: string;
  copied: boolean;
  onCopy: () => void;
  onReset: () => void;
  onClose: () => void;
}

export default function GeneratedInviteView({
  role,
  validityType,
  inviteUrl,
  copied,
  onCopy,
  onReset,
  onClose,
}: GeneratedInviteViewProps) {
  return (
    <div className="px-6 sm:px-8 py-5 overflow-y-auto space-y-6" data-testid="generated-invite-view">
      <div
        className="p-4 rounded-2xl border space-y-2"
        style={{
          background: "rgba(52, 211, 153, 0.1)",
          borderColor: "rgba(52, 211, 153, 0.3)",
        }}
      >
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <span>✨</span> Link de Convite Pronto!
        </div>
        <div className="text-xs space-y-1" style={{ color: "#f0eeff" }}>
          <p>
            <strong style={{ color: "#8b87b8" }}>Perfil:</strong>{" "}
            {role === "admin" ? "🛡️ Administrador" : "🎓 Aluno"}
          </p>
          <p>
            <strong style={{ color: "#8b87b8" }}>Validade:</strong>{" "}
            {validityType === "never"
              ? "♾️ Nunca se expira (permanente)"
              : `⏱️ Expira em ${validityType}`}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "#8b87b8" }}>
          Copie o link abaixo para enviar ao usuário:
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            data-testid="invite-link-input"
            className="flex-1 rounded-xl px-3 py-2.5 text-xs font-mono select-all outline-none truncate"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(127, 119, 221, 0.3)",
              color: "#f0eeff",
            }}
          />
          <button
            type="button"
            onClick={onCopy}
            data-testid="copy-invite-link-btn"
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md active:scale-95"
            style={{
              background: copied
                ? "rgba(52, 211, 153, 0.2)"
                : "linear-gradient(135deg, #7F77DD, #534ab3)",
              color: copied ? "#34d399" : "#ffffff",
              border: copied ? "1px solid #34d399" : "none",
            }}
          >
            <span>{copied ? "✓ Copiado!" : "📋 Copiar Link"}</span>
          </button>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between border-t" style={{ borderColor: "rgba(127, 119, 221, 0.2)" }}>
        <button
          type="button"
          onClick={onReset}
          className="text-xs transition-all hover:underline cursor-pointer"
          style={{ color: "#7F77DD" }}
          data-testid="generate-another-invite-btn"
        >
          + Gerar outro convite
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all hover:bg-white/10 cursor-pointer"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            color: "#f0eeff",
            border: "1px solid rgba(127, 119, 221, 0.3)",
          }}
          data-testid="done-invite-btn"
        >
          Concluir
        </button>
      </div>
    </div>
  );
}
