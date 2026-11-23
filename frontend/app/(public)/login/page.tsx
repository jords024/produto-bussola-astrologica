"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveToken, clearToken } from "@/lib/api";

const C = {
  bg: "#0f0b1e",
  card: "#1a1535",
  primary: "#7F77DD",
  light: "#AFA9EC",
  dark: "#3C3489",
  gold: "#EF9F27",
  text: "#f0eeff",
  muted: "#8b87b8",
  border: "rgba(127,119,221,0.2)",
};

interface LoginResponse {
  token: string;
  role: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isForgot, setIsForgot] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const conviteParam = params.get("convite");
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
    if (conviteParam === "usado") {
      setSuccessMsg("Você já concluiu seu cadastro! Entre com seu e-mail e senha para acessar.");
    }

    const existingToken =
      localStorage.getItem("bussola_token") || localStorage.getItem("sirius_token");
    if (existingToken) {
      api
        .get("/auth/me")
        .then(() => {
          router.replace("/admin");
        })
        .catch(() => {
          clearToken();
        });
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.post<LoginResponse>("/auth/login", {
        email: email.trim(),
        password: password.trim(),
      });

      saveToken(res.token);
      
      // Redireciona diretamente para o painel unificado da Bússola Astrológica
      router.push("/admin");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Credenciais inválidas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Por favor, digite seu e-mail.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.post<{ message: string }>("/auth/forgot-password", {
        email: email.trim(),
      });
      setSuccessMsg(res.message || "E-mail de recuperação enviado com sucesso!");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao enviar e-mail de recuperação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: C.bg }}
    >
      {/* Stars Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: (((i * 23) % 2) + 1) + "px",
              height: (((i * 23) % 2) + 1) + "px",
              top: ((i * 79) % 100) + "%",
              left: ((i * 47) % 100) + "%",
              animationDuration: (1.5 + (i % 3)) + "s",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Glow behind card */}
        <div 
          className="absolute -inset-1 rounded-2xl blur opacity-30 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${C.primary} 0%, transparent 80%)` }}
        />

        <div
          className="relative rounded-2xl p-8 shadow-2xl flex flex-col border"
          style={{ background: C.card, borderColor: C.border }}
        >
          {/* Logo / Icon */}
          <div className="text-center mb-6 flex flex-col items-center">
            <Link href="/" className="inline-block w-48 mb-3 hover:scale-105 transition-transform">
              <img
                src="/logo-bussola.webp"
                alt="Bússola Astrológica"
                className="w-full h-auto object-contain drop-shadow-[0_4px_16px_rgba(239,159,39,0.35)]"
              />
            </Link>
            <h1 className="text-2xl font-bold" style={{ color: C.light }}>
              {isForgot ? "Recuperar Senha" : "Acesse Sua Conta"}
            </h1>
            <p className="text-sm mt-1" style={{ color: C.muted }}>
              {isForgot ? "Enviaremos uma nova senha para o seu e-mail" : "Entre para ver seu Mapa Astral e Leituras"}
            </p>
          </div>

          {!isForgot ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: C.light }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Seu e-mail cadastrado"
                  className="w-full px-4 py-3 rounded-xl outline-none text-base transition-all"
                  style={{
                    background: C.bg,
                    color: C.text,
                    border: `1px solid ${C.border}`,
                  }}
                  onFocus={e => (e.target.style.borderColor = C.primary)}
                  onBlur={e => (e.target.style.borderColor = C.border)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: C.light }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha de acesso"
                  className="w-full px-4 py-3 rounded-xl outline-none text-base transition-all"
                  style={{
                    background: C.bg,
                    color: C.text,
                    border: `1px solid ${C.border}`,
                  }}
                  onFocus={e => (e.target.style.borderColor = C.primary)}
                  onBlur={e => (e.target.style.borderColor = C.border)}
                  required
                />
              </div>

              {error && (
                <div 
                  className="p-3 rounded-xl text-xs text-center border font-medium"
                  style={{ background: "#2a0f0f", color: "#ff8080", borderColor: "#ff4040" }}
                >
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2 cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${C.primary}, ${C.dark})`,
                  color: C.text,
                  boxShadow: `0 0 20px rgba(127,119,221,0.25)`,
                }}
              >
                {loading ? "Entrando..." : "Acessar Mapa →"}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setIsForgot(true); setError(""); setSuccessMsg(""); }}
                  className="text-xs hover:underline cursor-pointer"
                  style={{ color: C.light }}
                >
                  Esqueci minha senha 🔑
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-5">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: C.light }}>
                  E-mail cadastrado
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail de acesso"
                  className="w-full px-4 py-3 rounded-xl outline-none text-base transition-all"
                  style={{
                    background: C.bg,
                    color: C.text,
                    border: `1px solid ${C.border}`,
                  }}
                  onFocus={e => (e.target.style.borderColor = C.primary)}
                  onBlur={e => (e.target.style.borderColor = C.border)}
                  required
                />
              </div>

              {error && (
                <div 
                  className="p-3 rounded-xl text-xs text-center border font-medium"
                  style={{ background: "#2a0f0f", color: "#ff8080", borderColor: "#ff4040" }}
                >
                  ⚠️ {error}
                </div>
              )}

              {successMsg && (
                <div 
                  className="p-3 rounded-xl text-xs text-center border font-medium"
                  style={{ background: "rgba(100,220,140,0.15)", color: "#80ffaa", borderColor: "rgba(100,220,140,0.3)" }}
                >
                  ✨ {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${C.primary}, ${C.dark})`,
                  color: C.text,
                  boxShadow: `0 0 20px rgba(127,119,221,0.25)`,
                }}
              >
                {loading ? "Enviando..." : "Enviar E-mail de Recuperação"}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setIsForgot(false); setError(""); setSuccessMsg(""); }}
                  className="text-xs hover:underline cursor-pointer"
                  style={{ color: C.light }}
                >
                  ← Voltar para o Login
                </button>
              </div>
            </form>
          )}

          {/* Footer inside card */}
          <div className="mt-8 text-center border-t pt-4 space-y-2" style={{ borderColor: C.border }}>
            <p className="text-xs" style={{ color: C.muted }}>
              Ainda não tem um Mapa Astral?
            </p>
            <Link 
              href="/funil" 
              className="text-xs font-bold transition-colors hover:underline block"
              style={{ color: C.gold }}
            >
              Fazer a leitura do meu mapa agora ✨
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
