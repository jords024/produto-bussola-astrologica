"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";

function ConfirmarEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Validando seu e-mail e ativando sua conta...");
  const [targetPath, setTargetPath] = useState("/dashboard");
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;

    if (!token) {
      setStatus("error");
      setMessage("Link de confirmação ausente ou inválido.");
      return;
    }

    (async () => {
      try {
        const data = await api.post<{ token: string; role: string; name: string }>(
          "/auth/verify-register-link",
          { token }
        );

        if (typeof window !== "undefined" && data.token) {
          localStorage.setItem("bussola_token", data.token);
          localStorage.setItem("sirius_token", data.token);
        }

        const next = data.role === "admin" ? "/admin" : "/dashboard";
        setTargetPath(next);
        setStatus("success");
        setMessage("E-mail confirmado com sucesso! Sua conta foi ativada.");
        toast.success("E-mail confirmado! Bem-vindo(a) à Bússola Astrológica.");

        setTimeout(() => {
          router.push(next);
        }, 1200);
      } catch (err: any) {
        setStatus("error");
        setMessage(
          err?.response?.data?.detail ||
            err?.message ||
            "Link de confirmação inválido ou expirado."
        );
      }
    })();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0b1e] text-[#f0eeff]">
      <div
        data-testid="confirm-email-card"
        className="w-full max-w-md p-8 rounded-3xl text-center space-y-5 border shadow-2xl"
        style={{ background: "#1a1535", borderColor: "rgba(127, 119, 221, 0.3)" }}
      >
        {status === "loading" && (
          <>
            <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-[#f0eeff]">Confirmando E-mail</h2>
            <p className="text-xs text-slate-300">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl bg-emerald-500/15 border border-emerald-500/35">
              ✅
            </div>
            <h2 className="text-xl font-bold text-emerald-300">E-mail Validado!</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
            <button
              type="button"
              onClick={() => router.push(targetPath)}
              className="w-full py-3 rounded-xl text-xs font-bold bg-[#7F77DD] hover:brightness-110 text-white cursor-pointer"
            >
              Acessar Minha Conta
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl bg-red-500/15 border border-red-500/35">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-red-300">Link Inválido ou Expirado</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
            <button
              type="button"
              onClick={() => router.push("/admin/login")}
              className="w-full py-3 rounded-xl text-xs font-bold bg-[#251f49] hover:bg-[#31295f] text-white cursor-pointer"
            >
              Ir para o Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmarCadastroPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0b1e] text-[#f0eeff]">
          <p className="text-sm text-purple-200">Carregando...</p>
        </div>
      }
    >
      <ConfirmarEmailContent />
    </Suspense>
  );
}
