"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, clearToken } from "@/lib/api";
import { toast } from "@/components/Toast";
import { CountryPhoneInput } from "@/components/CountryPhoneInput";
import { PasswordInput } from "@/components/PasswordInput";

interface InviteInfo {
  valid: boolean;
  token: string;
  role: string;
  role_label: string;
  validity_type: string;
  expires_at: string | null;
}

function CadastroContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Etapa: "form" (dados cadastrais) ou "verify" (código OTP de 6 dígitos enviado por e-mail)
  const [step, setStep] = useState<"form" | "verify">("form");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  // Requisitos de senha forte
  const hasMinLength = password.length >= 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const isPasswordValid =
    hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1. Se já existir sessão ativa no navegador, entra direto no app
      const existingToken =
        typeof window !== "undefined"
          ? localStorage.getItem("bussola_token") || localStorage.getItem("sirius_token")
          : null;

      if (existingToken) {
        try {
          await api.get("/auth/me");
          if (!cancelled) {
            toast.success("Você já está conectado! Entrando no app...");
            router.replace("/admin");
          }
          return;
        } catch {
          clearToken();
        }
      }

      if (!token) {
        if (!cancelled) {
          setErrorMsg("Nenhum token de convite foi fornecido no link.");
          setLoading(false);
        }
        return;
      }

      // 2. Valida o convite; se já foi utilizado, redireciona direto para o login
      try {
        const data = await api.get<InviteInfo>(`/auth/invite/${encodeURIComponent(token)}`);
        if (!cancelled) {
          setInviteInfo(data);
          setLoading(false);
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail || err?.message || "Link de convite inválido ou expirado.";
        if (msg.toLowerCase().includes("já foi utilizado")) {
          if (!cancelled) {
            toast.success("Este convite já foi utilizado! Redirecionando para o login...");
            router.replace("/login?convite=usado");
          }
          return;
        }
        if (!cancelled) {
          setErrorMsg(msg);
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  // Etapa 1: Solicitar código de verificação via Brevo
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Por favor, preencha seu nome completo.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Por favor, forneça um e-mail válido.");
      return;
    }

    if (!isPasswordValid) {
      toast.error("A senha deve atender a todos os 5 requisitos de segurança.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/request-register-code", {
        token,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim() || undefined,
        password,
      });

      toast.success("Código de verificação enviado para o seu e-mail!");
      setStep("verify");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Erro ao processar solicitação de cadastro.";
      if (
        msg.toLowerCase().includes("já está cadastrado") ||
        msg.toLowerCase().includes("já cadastrado") ||
        msg.toLowerCase().includes("já existe")
      ) {
        toast.success("Você já possui cadastro! Redirecionando para o login...");
        router.replace(`/login?convite=usado&email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Etapa 2: Confirmar o código de 6 dígitos e concluir cadastro
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCode = verificationCode.trim();
    if (cleanCode.length !== 6) {
      toast.error("Por favor, informe o código de 6 dígitos enviado por e-mail.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.post<{ token: string; role: string; name: string }>(
        "/auth/verify-register-code",
        {
          token,
          email: email.trim().toLowerCase(),
          code: cleanCode,
        }
      );

      toast.success("E-mail verificado com sucesso! Bem-vindo(a) à Bússola Astrológica.");
      if (typeof window !== "undefined" && data.token) {
        localStorage.setItem("bussola_token", data.token);
        localStorage.setItem("sirius_token", data.token);
      }

      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Código de verificação inválido ou expirado.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Reenviar e-mail de confirmação via Brevo
  const handleResendCode = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-register-code", {
        token,
        email: email.trim().toLowerCase(),
      });
      toast.success("Um novo e-mail de confirmação foi enviado!");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Erro ao reenviar e-mail de confirmação.";
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(127, 119, 221, 0.3)",
    color: "#f0eeff",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0b1e] text-[#f0eeff]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-purple-200">Validando convite cósmico...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0b1e] text-[#f0eeff]">
        <div
          data-testid="invite-error-card"
          className="w-full max-w-md p-8 rounded-3xl text-center space-y-5 border shadow-2xl"
          style={{ background: "#1a1535", borderColor: "rgba(239, 68, 68, 0.3)" }}
        >
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl bg-red-500/10 border border-red-500/30">
            ⚠️
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-red-300">Convite Indisponível</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {errorMsg || "Este link de convite é inválido ou já expirou. Peça ao administrador um novo convite."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isRoleAdmin = inviteInfo.role === "admin";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#0f0b1e] text-[#f0eeff]">
      <div
        data-testid="cadastro-invite-card"
        className="w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6"
        style={{ background: "#1a1535", borderColor: "rgba(127, 119, 221, 0.3)" }}
      >
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl text-amber-400">🧭</span>
            <h1 className="text-lg font-bold tracking-tight text-[#f0eeff]">Bússola Astrológica</h1>
          </div>
          <h2 className="text-xl font-bold">
            {step === "form" ? "Criar Sua Conta" : "Validação de E-mail"}
          </h2>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
            style={{
              background: isRoleAdmin ? "rgba(239, 159, 39, 0.15)" : "rgba(52, 211, 153, 0.15)",
              borderColor: isRoleAdmin ? "rgba(239, 159, 39, 0.4)" : "rgba(52, 211, 153, 0.4)",
              color: isRoleAdmin ? "#EF9F27" : "#34d399",
            }}
          >
            <span>{isRoleAdmin ? "🛡️" : "🎓"}</span>
            <span>Convite para: {inviteInfo.role_label}</span>
          </div>
        </div>

        {/* ETAPA 1: Formulário de Dados Cadastrais com Senha Forte */}
        {step === "form" ? (
          <form onSubmit={handleRequestCode} autoComplete="off" className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Nome Completo *</label>
              <input
                type="text"
                required
                data-testid="input-name"
                autoComplete="off"
                data-lpignore="true"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-purple-400 transition-all"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">E-mail *</label>
              <input
                type="email"
                required
                data-testid="input-email"
                autoComplete="off"
                data-lpignore="true"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-purple-400 transition-all"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">WhatsApp (Opcional)</label>
              <CountryPhoneInput
                data-testid="input-whatsapp"
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChange={(val) => setWhatsapp(val)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Senha * (mínimo 12 caracteres, letras maiúsculas, minúsculas, números e caracteres especiais)
              </label>
              <PasswordInput
                required
                data-testid="input-password"
                minLength={12}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {/* Checklist de Validação de Senha Forte */}
              <div
                data-testid="password-requirements-box"
                className="p-3 rounded-xl border text-[11px] space-y-1 mt-1.5"
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

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Confirmar Senha *</label>
              <PasswordInput
                required
                data-testid="input-confirm-password"
                minLength={12}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="submit-register-btn"
              className="w-full mt-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7F77DD, #534ab3)",
                color: "#ffffff",
                boxShadow: "0 0 15px rgba(127, 119, 221, 0.4)",
              }}
            >
              {submitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Enviando e-mail de confirmação...</span>
                </>
              ) : (
                <span>Finalizar Cadastro</span>
              )}
            </button>
          </form>
        ) : (
          /* ETAPA 2: Aguardando clique no botão enviado por e-mail */
          <div data-testid="email-link-sent-box" className="space-y-5 text-center">
            <div
              className="p-5 rounded-2xl border text-xs space-y-3 text-left"
              style={{
                background: "rgba(127, 119, 221, 0.08)",
                borderColor: "rgba(127, 119, 221, 0.25)",
              }}
            >
              <div className="flex items-center gap-2 text-purple-300 font-semibold text-sm">
                <span>✉️</span>
                <span>Confirmação enviada para o seu e-mail</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Enviamos um e-mail com um botão de confirmação para:{" "}
                <strong className="text-white font-mono">{email}</strong>.
              </p>
              <p className="text-slate-300 leading-relaxed">
                Abra sua caixa de entrada e clique no botão{" "}
                <strong className="text-purple-200">Confirmar Meu E-mail e Ativar Conta</strong>{" "}
                para validar seu e-mail e concluir seu cadastro.
              </p>
              <p className="text-[11px] text-amber-300">
                ⏱️ O botão de confirmação é válido por 15 minutos. Verifique também sua caixa de spam.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                data-testid="back-to-form-btn"
                onClick={() => setStep("form")}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ← Corrigir dados
              </button>

              <button
                type="button"
                data-testid="resend-code-btn"
                disabled={resending}
                onClick={handleResendCode}
                className="text-purple-300 hover:text-purple-200 transition-colors cursor-pointer font-semibold disabled:opacity-50"
              >
                {resending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0b1e] text-[#f0eeff]">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-purple-200">Carregando...</p>
          </div>
        </div>
      }
    >
      <CadastroContent />
    </Suspense>
  );
}
