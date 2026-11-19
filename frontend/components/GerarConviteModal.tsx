"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import RequestLimitsFields, { type RequestLimitMode } from "@/components/RequestLimitsFields";
import GeneratedInviteView from "@/components/GeneratedInviteView";

interface GerarConviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteCreated?: () => void;
}

interface GeneratedInviteData {
  token: string;
  role: string;
  role_label: string;
  validity_type: string;
  expires_at: string | null;
  invite_path: string;
}

type InviteTab = "geral" | "acesso" | "limites";

export default function GerarConviteModal({
  isOpen,
  onClose,
  onInviteCreated,
}: GerarConviteModalProps) {
  const [activeTab, setActiveTab] = useState<InviteTab>("geral");
  const [role, setRole] = useState<"client" | "admin">("client");
  const [validity, setValidity] = useState<"never" | "24h" | "48h" | "72h">("never");
  const [accessDays, setAccessDays] = useState<number | null>(null);
  const [limitMode, setLimitMode] = useState<RequestLimitMode>("strict");
  const [unlimitedDaily, setUnlimitedDaily] = useState(true);
  const [dailyLimit, setDailyLimit] = useState("8");
  const [unlimitedTotal, setUnlimitedTotal] = useState(true);
  const [totalLimit, setTotalLimit] = useState("100");
  const [loading, setLoading] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<GeneratedInviteData | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (role === "admin" && activeTab !== "geral") {
      setActiveTab("geral");
    }
  }, [role, activeTab]);

  if (!isOpen || !mounted) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post<GeneratedInviteData>("/admin/invites", {
        role,
        validity_type: validity,
        ...(role === "client" && accessDays ? { access_days: accessDays } : {}),
        ...(role === "client" && limitMode === "quota_then_daily"
          ? { request_limit_mode: "quota_then_daily" }
          : {}),
        ...(role === "client" && !unlimitedDaily
          ? { daily_request_limit: Math.max(1, Number(dailyLimit) || 1) }
          : {}),
        ...(role === "client" && !unlimitedTotal
          ? { max_total_requests: Math.max(1, Number(totalLimit) || 1) }
          : {}),
      });

      setGeneratedInvite(data);
      toast.success("Link de convite gerado com sucesso!");
      if (onInviteCreated) {
        onInviteCreated();
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err?.message || "Erro ao gerar link de convite.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const getFullInviteUrl = () => {
    if (!generatedInvite) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${generatedInvite.invite_path}`;
  };

  const handleCopy = async () => {
    const fullUrl = getFullInviteUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = fullUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Não foi possível copiar o link automaticamente.");
    }
  };

  const handleReset = () => {
    setGeneratedInvite(null);
    setCopied(false);
    setActiveTab("geral");
    setRole("client");
    setValidity("never");
    setAccessDays(null);
    setLimitMode("strict");
    setUnlimitedDaily(true);
    setDailyLimit("8");
    setUnlimitedTotal(true);
    setTotalLimit("100");
  };

  const hasCustomLimits = !unlimitedDaily || !unlimitedTotal;
  const tabs: { id: InviteTab; label: string; icon: string; badge?: boolean }[] =
    role === "admin"
      ? [{ id: "geral", label: "Tipo e Validade", icon: "🎟️" }]
      : [
          { id: "geral", label: "Tipo e Validade", icon: "🎟️" },
          { id: "acesso", label: "Tempo de Acesso", icon: "⏳", badge: accessDays !== null },
          { id: "limites", label: "Limites de IA", icon: "⚡", badge: hasCustomLimits },
        ];

  return createPortal(
    <div
      data-testid="gerar-convite-modal-backdrop"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
      }}
    >
      <div
        data-testid="gerar-convite-modal-card"
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #1d1838 0%, #130f26 100%)",
          borderColor: "rgba(127, 119, 221, 0.35)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(127, 119, 221, 0.2)",
          color: "#f0eeff",
        }}
      >
        {/* Cabeçalho fixo + Abas */}
        <div
          className="px-6 sm:px-8 pt-6 pb-4 border-b shrink-0 space-y-4"
          style={{ borderColor: "rgba(127, 119, 221, 0.2)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span>🎟️</span> Gerar Link de Convite
              </h3>
              <p className="text-xs sm:text-sm mt-1" style={{ color: "#8b87b8" }}>
                Crie um link exclusivo para que o novo usuário possa se cadastrar.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-xs transition-all hover:bg-white/10 cursor-pointer"
              style={{ color: "#8b87b8" }}
              title="Fechar modal"
              data-testid="close-invite-modal-btn"
            >
              ✕
            </button>
          </div>

          {!generatedInvite && (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5" role="tablist">
              {tabs.map((tab) => {
                const isActiveTab = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActiveTab}
                    data-testid={`invite-tab-${tab.id}`}
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
          )}
        </div>

        {/* Conteúdo: Formulário ou Link Gerado */}
        {!generatedInvite ? (
          <form onSubmit={handleGenerate} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 sm:px-8 py-5 overflow-y-auto flex-1 space-y-5">
              {activeTab === "geral" && (
                <div data-testid="invite-tab-panel-geral" className="space-y-5">
                  {/* 1. Tipo de Usuário */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "#8b87b8" }}>
                      1. Tipo de Usuário
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("client")}
                        data-testid="role-option-aluno"
                        className="p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1"
                        style={{
                          background: role === "client" ? "rgba(52, 211, 153, 0.15)" : "rgba(255, 255, 255, 0.03)",
                          borderColor: role === "client" ? "rgba(52, 211, 153, 0.6)" : "rgba(127, 119, 221, 0.2)",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: role === "client" ? "#34d399" : "#f0eeff" }}>
                            <span>🎓</span> Aluno
                          </span>
                          {role === "client" && <span className="text-xs text-emerald-400">● Selecionado</span>}
                        </div>
                        <span className="text-[11px]" style={{ color: "#8b87b8" }}>
                          Acesso a mapas astrais e leituras cósmicas.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole("admin")}
                        data-testid="role-option-admin"
                        className="p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1"
                        style={{
                          background: role === "admin" ? "rgba(239, 159, 39, 0.15)" : "rgba(255, 255, 255, 0.03)",
                          borderColor: role === "admin" ? "rgba(239, 159, 39, 0.6)" : "rgba(127, 119, 221, 0.2)",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: role === "admin" ? "#EF9F27" : "#f0eeff" }}>
                            <span>🛡️</span> Admin
                          </span>
                          {role === "admin" && <span className="text-xs text-amber-400">● Selecionado</span>}
                        </div>
                        <span className="text-[11px]" style={{ color: "#8b87b8" }}>
                          Acesso de gestão e permissões administrativas.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Validade do Convite */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "#8b87b8" }}>
                      2. Validade do Convite
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { value: "never", label: "Nunca expira", desc: "Permanente", icon: "♾️" },
                        { value: "24h", label: "24 Horas", desc: "1 dia", icon: "⏱️" },
                        { value: "48h", label: "48 Horas", desc: "2 dias", icon: "⏱️" },
                        { value: "72h", label: "72 Horas", desc: "3 dias", icon: "⏱️" },
                      ].map((item) => {
                        const selected = validity === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setValidity(item.value as any)}
                            data-testid={`validity-option-${item.value}`}
                            className="p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1"
                            style={{
                              background: selected ? "rgba(127, 119, 221, 0.25)" : "rgba(255, 255, 255, 0.03)",
                              borderColor: selected ? "rgba(127, 119, 221, 0.7)" : "rgba(127, 119, 221, 0.2)",
                              color: selected ? "#f0eeff" : "#8b87b8",
                            }}
                          >
                            <span className="text-sm">{item.icon}</span>
                            <span className="text-xs font-semibold">{item.label}</span>
                            <span className="text-[10px] opacity-75">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "acesso" && role === "client" && (
                <div data-testid="invite-tab-panel-acesso" className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "#8b87b8" }}>
                    Tempo de Acesso do Aluno (IA)
                  </label>
                  <p className="text-xs" style={{ color: "#8b87b8" }}>
                    Define por quanto tempo o aluno poderá gerar novas leituras após concluir o cadastro.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { value: null, label: "Vitalício" },
                      { value: 7, label: "7 dias" },
                      { value: 30, label: "30 dias" },
                      { value: 90, label: "90 dias" },
                      { value: 365, label: "1 ano" },
                    ].map((opt) => {
                      const selected = accessDays === opt.value;
                      return (
                        <button
                          key={String(opt.value)}
                          type="button"
                          data-testid={`invite-access-days-${opt.value ?? "lifetime"}`}
                          onClick={() => setAccessDays(opt.value)}
                          className="p-2.5 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer"
                          style={{
                            background: selected ? "rgba(52, 211, 153, 0.16)" : "rgba(255, 255, 255, 0.03)",
                            borderColor: selected ? "rgba(52, 211, 153, 0.6)" : "rgba(127, 119, 221, 0.2)",
                            color: selected ? "#34d399" : "#8b87b8",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "limites" && role === "client" && (
                <div data-testid="invite-tab-panel-limites">
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
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all hover:bg-white/5 cursor-pointer"
                style={{ color: "#8b87b8", border: "1px solid rgba(127, 119, 221, 0.2)" }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                data-testid="submit-generate-invite-btn"
                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #7F77DD, #534ab3)",
                  color: "#ffffff",
                }}
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Gerando link...</span>
                  </>
                ) : (
                  <>
                    <span>🔗</span>
                    <span>Gerar Link de Convite</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <GeneratedInviteView
            role={generatedInvite.role}
            validityType={generatedInvite.validity_type}
            inviteUrl={getFullInviteUrl()}
            copied={copied}
            onCopy={handleCopy}
            onReset={handleReset}
            onClose={onClose}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
