"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import { PasswordInput } from "@/components/PasswordInput";
import { CountryPhoneInput } from "@/components/CountryPhoneInput";
import AccessExpirationSelector, { type AccessPreset } from "@/components/AccessExpirationSelector";
import MultipleProfilesPermissionFields from "@/components/MultipleProfilesPermissionFields";
import RequestLimitsFields, { type RequestLimitMode } from "@/components/RequestLimitsFields";

interface CriarUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

type CreateTab = "dados" | "acesso" | "limites";

export default function CriarUsuarioModal({
  isOpen,
  onClose,
  onUserCreated,
}: CriarUsuarioModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<CreateTab>("dados");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "internal_client" | "admin">("client");
  const [accessPreset, setAccessPreset] = useState<AccessPreset>("lifetime");
  const [customExpiresDate, setCustomExpiresDate] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [unlimitedProfiles, setUnlimitedProfiles] = useState(true);
  const [maxExtraProfiles, setMaxExtraProfiles] = useState("3");
  const [limitMode, setLimitMode] = useState<RequestLimitMode>("strict");
  const [unlimitedDaily, setUnlimitedDaily] = useState(true);
  const [dailyLimit, setDailyLimit] = useState("8");
  const [unlimitedTotal, setUnlimitedTotal] = useState(true);
  const [totalLimit, setTotalLimit] = useState("100");
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
      setActiveTab("dados");
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
      setLimitMode("strict");
      setUnlimitedDaily(true);
      setDailyLimit("8");
      setUnlimitedTotal(true);
      setTotalLimit("100");
    }
  }, [isOpen]);

  useEffect(() => {
    if (role === "admin" && activeTab !== "dados") {
      setActiveTab("dados");
    }
  }, [role, activeTab]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setActiveTab("dados");
      toast.error("Informe o nome completo.");
      return;
    }

    if (!email.trim()) {
      setActiveTab("dados");
      toast.error("Informe um e-mail válido.");
      return;
    }

    if (!isPasswordValid) {
      setActiveTab("dados");
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
      if (role !== "admin") {
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
        if (limitMode === "quota_then_daily") {
          payload.request_limit_mode = "quota_then_daily";
        }
        if (!unlimitedDaily) {
          payload.daily_request_limit = Math.max(1, Number(dailyLimit) || 1);
        }
        if (!unlimitedTotal) {
          payload.max_total_requests = Math.max(1, Number(totalLimit) || 1);
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

  const hasCustomLimits = !unlimitedDaily || !unlimitedTotal;
  const tabs: { id: CreateTab; label: string; icon: string; badge?: boolean }[] =
    role === "admin"
      ? [{ id: "dados", label: "Dados e Papel", icon: "👤" }]
      : [
          { id: "dados", label: "Dados e Papel", icon: "👤" },
          { id: "acesso", label: "Acesso e Perfis", icon: "⏳", badge: accessPreset !== "lifetime" || allowMultiple },
          { id: "limites", label: "Limites de IA", icon: "⚡", badge: hasCustomLimits },
        ];

  return createPortal(
    <div
      data-testid="criar-usuario-modal-backdrop"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }}
    >
      <div
        data-testid="criar-usuario-modal"
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden relative"
        style={{
          background: "linear-gradient(180deg, #1d1838 0%, #130f26 100%)",
          borderColor: "rgba(127, 119, 221, 0.35)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(127, 119, 221, 0.2)",
        }}
      >
        {/* Cabeçalho fixo + Abas */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-white/10 shrink-0 space-y-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: "#f0eeff" }}>
              <span>👤</span> Criar Usuário Manualmente
            </h3>
            <p className="text-xs sm:text-sm" style={{ color: "#8b87b8" }}>
              Cadastre um novo aluno ou administrador com acesso imediato ao sistema.
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5" role="tablist">
            {tabs.map((tab) => {
              const isActiveTab = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActiveTab}
                  data-testid={`create-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer"
                  style={{
                    background: isActiveTab
                      ? "linear-gradient(135deg, rgba(127, 119, 221, 0.32), rgba(60, 52, 137, 0.45))"
                      : "rgba(255, 255, 255, 0.04)",
                    color: isActiveTab ? "#f0eeff" : "#8b87b8",
                    border: isActiveTab
                      ? "1px solid rgba(127, 119, 221, 0.6)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#38bdf8" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col flex-1 min-h-0">
          {/* Conteúdo rolável da aba ativa */}
          <div className="px-6 sm:px-8 py-5 overflow-y-auto flex-1 space-y-4">
            {activeTab === "dados" && (
              <div data-testid="create-tab-panel-dados" className="space-y-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                        Área de membros
                      </div>
                    </button>

                    <button
                      type="button"
                      data-testid="create-user-role-internal_client"
                      onClick={() => setRole("internal_client")}
                      className="p-3 rounded-xl text-left transition-all cursor-pointer"
                      style={{
                        background: role === "internal_client" ? "rgba(56, 189, 248, 0.14)" : "rgba(255, 255, 255, 0.03)",
                        border: role === "internal_client" ? "1px solid rgba(56, 189, 248, 0.55)" : "1px solid rgba(255, 255, 255, 0.08)",
                        color: "#f0eeff",
                      }}
                    >
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        <span>🧪</span> Aluno Interno
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: "#8b87b8" }}>
                        Visão aluno (fora financeiro)
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
              </div>
            )}

            {activeTab === "acesso" && (
              <div data-testid="create-tab-panel-acesso" className="space-y-4">
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
              </div>
            )}

            {activeTab === "limites" && (
              <div data-testid="create-tab-panel-limites" className="space-y-4">
                <RequestLimitsFields
                  role={role}
                  limitMode={limitMode}
                  onLimitModeChange={setLimitMode}
                  unlimitedDaily={unlimitedDaily}
                  onUnlimitedDailyChange={setUnlimitedDaily}
                  dailyLimit={dailyLimit}
                  onDailyLimitChange={setDailyLimit}
                  unlimitedTotal={unlimitedTotal}
                  onUnlimitedTotalChange={setUnlimitedTotal}
                  totalLimit={totalLimit}
                  onTotalLimitChange={setTotalLimit}
                />
              </div>
            )}
          </div>

          {/* Rodapé fixo */}
          <div className="px-6 sm:px-8 py-4 border-t border-white/10 shrink-0 flex justify-end gap-3">
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
