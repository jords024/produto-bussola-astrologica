"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import { PasswordInput } from "@/components/PasswordInput";
import { CountryPhoneInput } from "@/components/CountryPhoneInput";
import AccessExpirationSelector, { type AccessPreset } from "@/components/AccessExpirationSelector";
import MultipleProfilesPermissionFields from "@/components/MultipleProfilesPermissionFields";

interface CriarUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export default function CriarUsuarioModal({
  isOpen,
  onClose,
  onUserCreated,
}: CriarUsuarioModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "admin">("client");
  const [accessPreset, setAccessPreset] = useState<AccessPreset>("lifetime");
  const [customExpiresDate, setCustomExpiresDate] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [unlimitedProfiles, setUnlimitedProfiles] = useState(true);
  const [maxExtraProfiles, setMaxExtraProfiles] = useState("3");
  const [loading, setLoading] = useState(false);

  const hasMinLength = password.length >= 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const isPasswordValid =
    hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setWhatsapp("");
      setPassword("");
      setRole("client");
      setAccessPreset("lifetime");
      setCustomExpiresDate("");
      setAllowMultiple(false);
      setUnlimitedProfiles(true);
      setMaxExtraProfiles("3");
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Informe o nome do usuário.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    if (!isPasswordValid) {
      toast.error("A senha deve atender a todos os 5 requisitos de segurança.");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim() || null,
        password,
        role,
      };
      if (role === "client") {
        if (accessPreset === "custom" && customExpiresDate) {
          payload.access_expires_at = customExpiresDate;
        } else if (accessPreset !== "lifetime" && accessPreset !== "custom") {
          payload.access_days = Number(accessPreset);
        }
        if (allowMultiple) {
          payload.allow_multiple_profiles = true;
          payload.unlimited_extra_profiles = unlimitedProfiles;
          if (!unlimitedProfiles) {
            payload.max_extra_profiles = Math.max(1, Number(maxExtraProfiles) || 1);
          }
        }
      }

      await api.post("/admin/users", payload);

      toast.success("Usuário criado com sucesso!");
      onUserCreated();
      onClose();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || "Erro ao criar usuário.";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      data-testid="criar-usuario-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div
        data-testid="criar-usuario-modal"
        className="w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 relative overflow-y-auto max-h-[92vh]"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.35)",
          boxShadow: "0 0 50px rgba(127, 119, 221, 0.15)",
        }}
      >
        <div className="space-y-1 pb-3 border-b border-white/10">
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: "#f0eeff" }}>
            <span>👤</span> Criar Usuário Manualmente
          </h3>
          <p className="text-xs sm:text-sm" style={{ color: "#8b87b8" }}>
            Cadastre um novo aluno ou administrador com acesso imediato ao sistema.
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8b87b8" }}>
              Nome Completo *
            </label>
            <input
              type="text"
              name="manual_user_name"
              autoComplete="off"
              data-testid="create-user-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria Oliveira"
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-[#7F77DD]/50"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(127, 119, 221, 0.3)",
                color: "#f0eeff",
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8b87b8" }}>
              E-mail *
            </label>
            <input
              type="email"
              name="manual_user_email"
              autoComplete="off"
              data-testid="create-user-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-[#7F77DD]/50"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(127, 119, 221, 0.3)",
                color: "#f0eeff",
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8b87b8" }}>
              WhatsApp (Opcional)
            </label>
            <CountryPhoneInput
              data-testid="create-user-whatsapp-input"
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8b87b8" }}>
              Senha de Acesso *
            </label>
            <PasswordInput
              name="manual_user_password"
              autoComplete="new-password"
              data-testid="create-user-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              minLength={12}
              required
            />

            <div
              data-testid="password-requirements-box"
              className="p-3 rounded-xl border text-[11px] space-y-1 mt-2"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                borderColor: "rgba(127, 119, 221, 0.2)",
              }}
            >
              <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400" : "text-slate-400"}`}>
                <span>{hasMinLength ? "✓" : "●"}</span>
                <span>Mínimo de 12 caracteres</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald-400" : "text-slate-400"}`}>
                <span>{hasUpperCase ? "✓" : "●"}</span>
                <span>Pelo menos uma letra maiúscula (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowerCase ? "text-emerald-400" : "text-slate-400"}`}>
                <span>{hasLowerCase ? "✓" : "●"}</span>
                <span>Pelo menos uma letra minúscula (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-400" : "text-slate-400"}`}>
                <span>{hasNumber ? "✓" : "●"}</span>
                <span>Pelo menos um número (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecialChar ? "text-emerald-400" : "text-slate-400"}`}>
                <span>{hasSpecialChar ? "✓" : "●"}</span>
                <span>Pelo menos um caractere especial (!@#$%^&*...)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "#8b87b8" }}>
              Tipo de Usuário
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="create-user-role-client"
                onClick={() => setRole("client")}
                className="p-3 rounded-xl text-left transition-all cursor-pointer"
                style={{
                  background: role === "client" ? "rgba(52, 211, 153, 0.12)" : "rgba(255, 255, 255, 0.03)",
                  border: role === "client" ? "1px solid rgba(52, 211, 153, 0.55)" : "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#f0eeff",
                }}
              >
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <span>🎓</span> Aluno
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "#8b87b8" }}>
                  Acesso à área de membros
                </div>
              </button>

              <button
                type="button"
                data-testid="create-user-role-admin"
                onClick={() => setRole("admin")}
                className="p-3 rounded-xl text-left transition-all cursor-pointer"
                style={{
                  background: role === "admin" ? "rgba(127, 119, 221, 0.2)" : "rgba(255, 255, 255, 0.03)",
                  border: role === "admin" ? "1px solid rgba(127, 119, 221, 0.65)" : "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#f0eeff",
                }}
              >
                <div className="text-sm font-bold flex items-center gap-1.5">
                  <span>🛡️</span> Admin
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "#8b87b8" }}>
                  Permissões de gestão
                </div>
              </button>
            </div>
          </div>

          <AccessExpirationSelector
            role={role}
            preset={accessPreset}
            customDate={customExpiresDate}
            onChangePreset={setAccessPreset}
            onChangeCustomDate={setCustomExpiresDate}
          />

          <MultipleProfilesPermissionFields
            role={role}
            allowMultiple={allowMultiple}
            onAllowChange={setAllowMultiple}
            unlimited={unlimitedProfiles}
            onUnlimitedChange={setUnlimitedProfiles}
            maxLimit={maxExtraProfiles}
            onMaxLimitChange={setMaxExtraProfiles}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              data-testid="cancel-create-user-btn"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer hover:bg-white/10 disabled:opacity-50"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "#8b87b8",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              data-testid="submit-create-user-btn"
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7F77DD, #534ab3)",
                color: "#ffffff",
                boxShadow: "0 0 15px rgba(127, 119, 221, 0.35)",
              }}
            >
              {loading ? "Criando..." : "Criar Usuário"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
