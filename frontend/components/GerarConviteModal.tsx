import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";

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

export default function GerarConviteModal({
  isOpen,
  onClose,
  onInviteCreated,
}: GerarConviteModalProps) {
  const [role, setRole] = useState<"client" | "admin">("client");
  const [validity, setValidity] = useState<"never" | "24h" | "48h" | "72h">("never");
  const [accessDays, setAccessDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<GeneratedInviteData | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post("/admin/invites", {
        role,
        validity_type: validity,
        ...(role === "client" && accessDays ? { access_days: accessDays } : {}),
      });

      setGeneratedInvite(data);
      toast.success("Link de convite gerado com sucesso!");
      if (onInviteCreated) {
        onInviteCreated();
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Erro ao gerar link de convite.";
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
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success("Link de convite copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error("Não foi possível copiar o link automaticamente.");
    }
  };

  const handleReset = () => {
    setGeneratedInvite(null);
    setCopied(false);
    setRole("client");
    setValidity("never");
  };

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
        className="w-full max-w-lg p-6 sm:p-8 rounded-3xl shadow-2xl border flex flex-col space-y-6"
        style={{
          background: "#1a1535",
          borderColor: "rgba(127, 119, 221, 0.3)",
          color: "#f0eeff",
        }}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: "rgba(127, 119, 221, 0.2)" }}>
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

        {/* Conteúdo: Formulário ou Link Gerado */}
        {!generatedInvite ? (
          <form onSubmit={handleGenerate} className="space-y-6">
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

            {/* 3. Tempo de Acesso à Plataforma (apenas Aluno) */}
            {role === "client" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "#8b87b8" }}>
                  3. Tempo de Acesso do Aluno (IA)
                </label>
                <div className="grid grid-cols-5 gap-2">
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
                        className="p-2 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer"
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

            {/* Botão de Submissão */}
            <div className="pt-2 flex items-center justify-end gap-3">
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
          /* Visualização de Link Gerado */
          <div className="space-y-6" data-testid="generated-invite-view">
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
                  {generatedInvite.role === "admin" ? "🛡️ Administrador" : "🎓 Aluno"}
                </p>
                <p>
                  <strong style={{ color: "#8b87b8" }}>Validade:</strong>{" "}
                  {generatedInvite.validity_type === "never"
                    ? "♾️ Nunca se expira (permanente)"
                    : `⏱️ Expira em ${generatedInvite.validity_type}`}
                </p>
              </div>
            </div>

            {/* Campo com o link pronto e botão de cópia */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "#8b87b8" }}>
                Copie o link abaixo para enviar ao usuário:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getFullInviteUrl()}
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
                  onClick={handleCopy}
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

            {/* Ações Finais */}
            <div className="pt-2 flex items-center justify-between border-t" style={{ borderColor: "rgba(127, 119, 221, 0.2)" }}>
              <button
                type="button"
                onClick={handleReset}
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
        )}
      </div>
    </div>,
    document.body
  );
}
