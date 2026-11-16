"use client";

import React from "react";
import { C, Btn, Textarea, type FormData } from "@/components/funil/FunilUi";

interface FunilStepQuestionsProps {
  form: FormData;
  loading: boolean;
  error: string;
  onChangeField: (k: "form_vida_agora" | "form_carrega_tempo" | "form_espera_descobrir", v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export default function FunilStepQuestions({
  form,
  loading,
  error,
  onChangeField,
  onBack,
  onSubmit,
}: FunilStepQuestionsProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: C.light }}>Antes de finalizar...</h2>
      <p className="text-sm mb-6" style={{ color: C.muted }}>
        Essas respostas personalizam profundamente a sua leitura
      </p>
      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: C.light }}>
            O que está acontecendo na sua vida agora?
          </label>
          <Textarea
            value={form.form_vida_agora}
            onChange={(v) => onChangeField("form_vida_agora", v)}
            placeholder="Compartilhe o que estiver no seu coração..."
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: C.light }}>
            Se você pudesse mudar uma coisa na sua vida hoje, o que seria?
          </label>
          <Textarea
            value={form.form_carrega_tempo}
            onChange={(v) => onChangeField("form_carrega_tempo", v)}
            placeholder="Pode ser uma decisão, situação, padrão..."
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: C.light }}>
            O que você espera descobrir através do seu Mapa Astral?
          </label>
          <Textarea
            value={form.form_espera_descobrir}
            onChange={(v) => onChangeField("form_espera_descobrir", v)}
            placeholder="Quais respostas você busca?"
          />
        </div>
      </div>
      {loading && (
        <div className="mt-4 p-4 rounded-xl text-sm text-center" style={{ background: "#1a1535", border: "1px solid rgba(127,119,221,0.3)", color: "#AFA9EC" }}>
          <div className="text-2xl mb-2 animate-pulse">✨</div>
          <p className="font-semibold mb-1">Gerando seu Mapa da Alma...</p>
          <p style={{ color: "#8b87b8" }}>Isso pode levar até 2 minutos. Não feche essa tela.</p>
        </div>
      )}
      {error && !loading && (
        <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: "#2a0f0f", color: "#ff8080", border: "1px solid #ff4040" }}>
          <p className="font-semibold mb-1">Não foi possível gerar o mapa</p>
          <p className="text-xs mb-2" style={{ color: "#ff6060" }}>{error}</p>
          <p className="text-xs" style={{ color: "#ff8080" }}>
            Verifique sua conexão e tente novamente. Se o problema persistir, aguarde 1 minuto e tente de novo.
          </p>
        </div>
      )}
      <div className="flex justify-between mt-8">
        <Btn onClick={onBack} variant="ghost">Voltar</Btn>
        <Btn onClick={onSubmit} disabled={loading}>
          {loading ? "Gerando..." : "Gerar Meu Mapa →"}
        </Btn>
      </div>
    </div>
  );
}
