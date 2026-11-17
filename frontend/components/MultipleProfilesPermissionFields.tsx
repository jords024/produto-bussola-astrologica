"use client";

import React from "react";

interface MultipleProfilesPermissionFieldsProps {
  role: "client" | "admin";
  allowMultiple: boolean;
  onAllowChange: (val: boolean) => void;
  unlimited: boolean;
  onUnlimitedChange: (val: boolean) => void;
  maxLimit: string;
  onMaxLimitChange: (val: string) => void;
}

export default function MultipleProfilesPermissionFields({
  role,
  allowMultiple,
  onAllowChange,
  unlimited,
  onUnlimitedChange,
  maxLimit,
  onMaxLimitChange,
}: MultipleProfilesPermissionFieldsProps) {
  if (role === "admin") {
    return (
      <div
        className="rounded-xl p-3 text-xs"
        style={{ background: "rgba(127, 119, 221, 0.08)", border: "1px solid rgba(127, 119, 221, 0.25)", color: "#b4b0dc" }}
      >
        🛡️ Administradores possuem cadastro de múltiplas pessoas <strong>ilimitado</strong> por padrão.
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-3.5 space-y-3"
      style={{ background: "rgba(127, 119, 221, 0.08)", border: "1px solid rgba(127, 119, 221, 0.25)" }}
    >
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <div>
          <span className="text-xs font-semibold block" style={{ color: "#f0eeff" }}>
            Permitir cadastrar múltiplas pessoas
          </span>
          <span className="text-[11px]" style={{ color: "#8b87b8" }}>
            Habilita coleta de dados e leitura para terceiros neste aluno.
          </span>
        </div>
        <input
          type="checkbox"
          data-testid="toggle-allow-multiple-profiles"
          checked={allowMultiple}
          onChange={(e) => onAllowChange(e.target.checked)}
          className="w-4 h-4 accent-[#7f77dd] cursor-pointer"
        />
      </label>

      {allowMultiple && (
        <div className="pt-2 border-t border-[#7f77dd]/20 space-y-2">
          <span className="text-[11px] font-medium block" style={{ color: "#AFA9EC" }}>
            Quantidade máxima de pessoas extras
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "#f0eeff" }}>
              <input
                type="radio"
                name="profiles-limit-mode"
                data-testid="limit-mode-unlimited"
                checked={unlimited}
                onChange={() => onUnlimitedChange(true)}
                className="accent-[#7f77dd]"
              />
              Ilimitado
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "#f0eeff" }}>
              <input
                type="radio"
                name="profiles-limit-mode"
                data-testid="limit-mode-capped"
                checked={!unlimited}
                onChange={() => onUnlimitedChange(false)}
                className="accent-[#7f77dd]"
              />
              Definir limite:
            </label>
            {!unlimited && (
              <input
                type="number"
                min={1}
                max={999}
                data-testid="max-extra-profiles-input"
                value={maxLimit}
                onChange={(e) => onMaxLimitChange(e.target.value)}
                className="w-20 rounded-lg px-2.5 py-1 text-xs outline-none"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(127, 119, 221, 0.4)",
                  color: "#f0eeff",
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
