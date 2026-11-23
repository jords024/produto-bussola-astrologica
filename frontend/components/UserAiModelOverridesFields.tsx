"use client";

import React from "react";
import AiModelSelector, { type AiModelCatalogItem } from "./AiModelSelector";

interface UserAiModelOverridesFieldsProps {
  role: string;
  loading: boolean;
  activeModel: string;
  activePhase: "max_limit" | "daily_limit";
  globalMaxModel: string;
  globalDailyModel: string;
  aiModelMax: string;
  aiModelDaily: string;
  onChangeAiModelMax: (val: string) => void;
  onChangeAiModelDaily: (val: string) => void;
  catalog: AiModelCatalogItem[];
}

export default function UserAiModelOverridesFields({
  role,
  loading,
  activeModel,
  activePhase,
  globalMaxModel,
  globalDailyModel,
  aiModelMax,
  aiModelDaily,
  onChangeAiModelMax,
  onChangeAiModelDaily,
  catalog,
}: UserAiModelOverridesFieldsProps) {
  if (role === "admin") return null;

  return (
    <div
      data-testid="user-ai-model-overrides"
      className="rounded-2xl border border-[#7f77dd]/25 bg-[#14102b]/70 p-4 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-[#f0eeff] flex items-center gap-1.5">
            <span>🤖</span> Modelo de IA para este Aluno
          </h4>
          <p className="text-[11px] text-[#8b87b8]">
            Deixe em &ldquo;Usar padrão global&rdquo; para seguir a configuração geral do sistema.
          </p>
        </div>

        {!loading && activeModel && (
          <span
            data-testid="user-active-ai-model-badge"
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              activePhase === "daily_limit"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-[#7f77dd]/20 text-[#d6d3ff] border-[#7f77dd]/40"
            }`}
          >
            Em uso: {activeModel} ({activePhase === "daily_limit" ? "Limite por dia" : "Limite máximo"})
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-[#8b87b8]">Carregando modelos do aluno...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AiModelSelector
            id="user-ai-model-max"
            testId="select-user-ai-model-max"
            label="Modelo no Limite Máximo / Franquia"
            value={aiModelMax}
            onChange={onChangeAiModelMax}
            catalog={catalog}
            allowGlobalDefault
            globalDefaultModel={globalMaxModel}
          />

          <AiModelSelector
            id="user-ai-model-daily"
            testId="select-user-ai-model-daily"
            label="Modelo no Limite por Dia"
            value={aiModelDaily}
            onChange={onChangeAiModelDaily}
            catalog={catalog}
            allowGlobalDefault
            globalDefaultModel={globalDailyModel}
          />
        </div>
      )}
    </div>
  );
}
