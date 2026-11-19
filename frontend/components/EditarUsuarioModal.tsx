"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import AccessExpirationSelector, { type AccessPreset } from "@/components/AccessExpirationSelector";
import MultipleProfilesPermissionFields from "@/components/MultipleProfilesPermissionFields";
import RequestLimitsFields, { type RequestLimitMode } from "@/components/RequestLimitsFields";
import EditarUsuarioDadosTab, { type EditableUserRole } from "@/components/EditarUsuarioDadosTab";

export interface UserToEdit {
  id: string;
  name: string;
  email: string;
  whatsapp?: string | null;
  role: string;
  is_active: boolean;
  is_super_admin?: boolean;
  access_expires_at?: string | null;
  access_expired?: boolean;
  allow_multiple_profiles?: boolean;
  max_extra_profiles?: number | null;
  daily_request_limit?: number | null;
  max_total_requests?: number | null;
  request_limit_mode?: RequestLimitMode;
}

interface EditarUsuarioModalProps {
  isOpen: boolean;
  user: UserToEdit | null;
  onClose: () => void;
  onUserUpdated: () => void;
}

type EditTab = "dados" | "acesso" | "limites";

export default function EditarUsuarioModal({
  isOpen,
  user,
  onClose,
  onUserUpdated,
}: EditarUsuarioModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<EditTab>("dados");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState<EditableUserRole>("client");
  const [isActive, setIsActive] = useState(true);
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      setActiveTab("dados");
      setName(user.name || "");
      setEmail(user.email || "");
      setWhatsapp(user.whatsapp || "");
      setRole(user.role === "admin" ? "admin" : user.role === "internal_client" ? "internal_client" : "client");
      setIsActive(user.is_active ?? true);
      if (user.access_expires_at) {
        setAccessPreset("custom");
        setCustomExpiresDate(user.access_expires_at.slice(0, 10));
      } else {
        setAccessPreset("lifetime");
        setCustomExpiresDate("");
      }
      setAllowMultiple(Boolean(user.allow_multiple_profiles));
      if (user.max_extra_profiles && user.max_extra_profiles > 0) {
        setUnlimitedProfiles(false);
        setMaxExtraProfiles(String(user.max_extra_profiles));
      } else {
        setUnlimitedProfiles(true);
        setMaxExtraProfiles("3");
      }
      setLimitMode(user.request_limit_mode === "quota_then_daily" ? "quota_then_daily" : "strict");
      if (user.daily_request_limit && user.daily_request_limit > 0) {
        setUnlimitedDaily(false);
        setDailyLimit(String(user.daily_request_limit));
      } else {
        setUnlimitedDaily(true);
        setDailyLimit("8");
      }
      if (user.max_total_requests && user.max_total_requests > 0) {
        setUnlimitedTotal(false);
        setTotalLimit(String(user.max_total_requests));
      } else {
        setUnlimitedTotal(true);
        setTotalLimit("100");
      }
    }
  }, [user]);

  useEffect(() => {
    if (role === "admin" && activeTab !== "dados") {
      setActiveTab("dados");
    }
  }, [role, activeTab]);

  if (!isOpen || !mounted || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user.is_super_admin) {
      toast.error("O Super Admin não pode ser alterado.");
      return;
    }

    if (!name.trim()) {
      setActiveTab("dados");
      toast.error("Informe o nome do usuário.");
      return;
    }

    if (!email.trim()) {
      setActiveTab("dados");
      toast.error("Informe um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim() || null,
        role,
        is_active: isActive,
      };
      if (role === "admin" || accessPreset === "lifetime") {
        payload.clear_expiration = true;
      } else if (accessPreset === "custom" && customExpiresDate) {
        payload.access_expires_at = customExpiresDate;
      } else if (accessPreset !== "custom") {
        payload.access_days = Number(accessPreset);
      }

      if (role !== "admin") {
        payload.allow_multiple_profiles = allowMultiple;
        if (allowMultiple) {
          payload.unlimited_extra_profiles = unlimitedProfiles;
          if (!unlimitedProfiles) {
            payload.max_extra_profiles = Math.max(1, Number(maxExtraProfiles) || 1);
          }
        }
        payload.request_limit_mode = limitMode;
        payload.unlimited_daily_requests = unlimitedDaily;
        if (!unlimitedDaily) {
          payload.daily_request_limit = Math.max(1, Number(dailyLimit) || 1);
        }
        payload.unlimited_total_requests = unlimitedTotal;
        if (!unlimitedTotal) {
          payload.max_total_requests = Math.max(1, Number(totalLimit) || 1);
        }
      }

      await api.put(`/admin/users/${user.id}`, payload);
      toast.success("Usuário atualizado com sucesso!");
      onUserUpdated();
      onClose();
    } catch (err: any) {
      const detail = err?.message || err?.response?.data?.detail || "Erro ao atualizar usuário.";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const hasCustomLimits = !unlimitedDaily || !unlimitedTotal;

  const tabs: { id: EditTab; label: string; icon: string; badge?: boolean }[] =
    role === "admin"
      ? [{ id: "dados", label: "Dados e Papel", icon: "👤" }]
      : [
          { id: "dados", label: "Dados e Papel", icon: "👤" },
          { id: "acesso", label: "Acesso e Perfis", icon: "⏳" },
          { id: "limites", label: "Limites de IA", icon: "⚡", badge: hasCustomLimits },
        ];

  const modalContent = (
    <div
      data-testid="editar-usuario-modal-backdrop"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
      }}
    >
      <div
        data-testid="editar-usuario-modal-panel"
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #1d1838 0%, #130f26 100%)",
          borderColor: "rgba(127, 119, 221, 0.35)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(127, 119, 221, 0.2)",
        }}
      >
        {/* Cabeçalho fixo */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-white/10 shrink-0 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold tracking-tight" style={{ color: "#f0eeff" }}>
                Editar Usuário
              </h3>
              <p className="text-xs mt-1" style={{ color: "#8b87b8" }}>
                Atualize os dados cadastrais, cargo e permissões do usuário.
              </p>
            </div>

            <button
              type="button"
              data-testid="close-edit-user-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-xs transition-colors hover:bg-white/10 cursor-pointer"
              style={{ color: "#8b87b8" }}
              title="Fechar"
            >
              ✕
            </button>
          </div>

          {/* Barra de Abas */}
          {!user.is_super_admin && (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5" role="tablist">
              {tabs.map((tab) => {
                const isActiveTab = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActiveTab}
                    data-testid={`edit-tab-${tab.id}`}
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
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "#38bdf8" }}
                        title="Limite personalizado ativo"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {user.is_super_admin ? (
          <div className="p-6 sm:p-8">
            <div
              data-testid="super-admin-protected-warning"
              className="p-4 rounded-2xl border text-sm"
              style={{
                background: "rgba(239, 159, 39, 0.1)",
                borderColor: "rgba(239, 159, 39, 0.3)",
                color: "#EF9F27",
              }}
            >
              👑 <strong>Super Admin do Sistema:</strong> Este usuário é o administrador principal configurado nas variáveis de ambiente. Suas credenciais não podem ser alteradas pelo painel por motivos de integridade e segurança.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            {/* Conteúdo rolável da aba ativa */}
            <div className="px-6 sm:px-8 py-5 overflow-y-auto flex-1 space-y-4">
              {activeTab === "dados" && (
                <EditarUsuarioDadosTab
                  name={name}
                  onNameChange={setName}
                  email={email}
                  onEmailChange={setEmail}
                  whatsapp={whatsapp}
                  onWhatsappChange={setWhatsapp}
                  role={role}
                  onRoleChange={setRole}
                  isActive={isActive}
                  onIsActiveChange={setIsActive}
                />
              )}

              {activeTab === "acesso" && (
                <div data-testid="edit-tab-panel-acesso" className="space-y-4">
                  <AccessExpirationSelector
                    role={role}
                    preset={accessPreset}
                    customDate={customExpiresDate}
                    currentExpiresAt={user.access_expires_at}
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
                <div data-testid="edit-tab-panel-limites" className="space-y-4">
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
            <div className="px-6 sm:px-8 py-4 border-t border-white/10 shrink-0 flex items-center justify-end gap-3">
              <button
                type="button"
                data-testid="cancel-edit-user-btn"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-medium transition-colors hover:bg-white/10 cursor-pointer"
                style={{ color: "#8b87b8" }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                data-testid="save-edit-user-btn"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #7F77DD, #534ab3)",
                  color: "#ffffff",
                }}
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
