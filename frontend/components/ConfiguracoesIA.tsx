"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import AiModelSelector, {
  formatModelUsdPrice,
  type AiModelCatalogItem,
} from "./AiModelSelector";

interface GlobalAiConfigResponse {
  max_limit_model: string;
  max_limit_fallback_model: string;
  daily_limit_model: string;
  daily_limit_fallback_model: string;
  updated_by?: string | null;
  updated_at?: string | null;
  catalog: AiModelCatalogItem[];
}

export default function ConfiguracoesIA() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [maxLimitModel, setMaxLimitModel] = useState("gpt-5.6-sol");
  const [maxLimitFallbackModel, setMaxLimitFallbackModel] = useState("gpt-5.6-luna");
  const [dailyLimitModel, setDailyLimitModel] = useState("gpt-4o-mini");
  const [dailyLimitFallbackModel, setDailyLimitFallbackModel] = useState("gpt-4o-mini");
  const [savedMaxModel, setSavedMaxModel] = useState("gpt-5.6-sol");
  const [savedMaxFallbackModel, setSavedMaxFallbackModel] = useState("gpt-5.6-luna");
  const [savedDailyModel, setSavedDailyModel] = useState("gpt-4o-mini");
  const [savedDailyFallbackModel, setSavedDailyFallbackModel] = useState("gpt-4o-mini");
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<AiModelCatalogItem[]>([]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<GlobalAiConfigResponse>("/admin/ai-models/config");
      setMaxLimitModel(res.max_limit_model);
      setMaxLimitFallbackModel(res.max_limit_fallback_model || "gpt-5.6-luna");
      setDailyLimitModel(res.daily_limit_model);
      setDailyLimitFallbackModel(res.daily_limit_fallback_model || "gpt-4o-mini");
      setSavedMaxModel(res.max_limit_model);
      setSavedMaxFallbackModel(res.max_limit_fallback_model || "gpt-5.6-luna");
      setSavedDailyModel(res.daily_limit_model);
      setSavedDailyFallbackModel(res.daily_limit_fallback_model || "gpt-4o-mini");
      setUpdatedBy(res.updated_by || null);
      setCatalog(res.catalog || []);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar configurações de IA.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !maxLimitModel.trim() ||
      !maxLimitFallbackModel.trim() ||
      !dailyLimitModel.trim() ||
      !dailyLimitFallbackModel.trim()
    ) {
      toast.error("Informe os modelos principais e de fallback antes de salvar.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put<GlobalAiConfigResponse>("/admin/ai-models/config", {
        max_limit_model: maxLimitModel.trim(),
        max_limit_fallback_model: maxLimitFallbackModel.trim(),
        daily_limit_model: dailyLimitModel.trim(),
        daily_limit_fallback_model: dailyLimitFallbackModel.trim(),
      });
      setSavedMaxModel(res.max_limit_model);
      setSavedMaxFallbackModel(res.max_limit_fallback_model || maxLimitFallbackModel.trim());
      setSavedDailyModel(res.daily_limit_model);
      setSavedDailyFallbackModel(res.daily_limit_fallback_model || dailyLimitFallbackModel.trim());
      setUpdatedBy(res.updated_by || null);
      toast.success("Modelos de IA atualizados com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar configurações de IA.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    const savedMaxInfo = catalog.find((m) => m.id === savedMaxModel);
  const savedDailyInfo = catalog.find((m) => m.id === savedDailyModel);

  return (
      <div className="flex items-center justify-center py-16 gap-2 text-sm text-[#8b87b8]">
        <span className="inline-block w-4 h-4 border-2 border-[#AFA9EC] border-t-transparent rounded-full animate-spin" />
        Carregando configurações de IA...
      </div>
    );
  }

  const savedMaxInfo = catalog.find((m) => m.id === savedMaxModel);
  const savedDailyInfo = catalog.find((m) => m.id === savedDailyModel);

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="configuracoes-ia-panel">
      {/* Cabeçalho */}
      <div className="rounded-2xl border border-[#7f77dd]/25 bg-[#1a1535]/80 p-6">
        <h2 className="text-lg font-bold text-[#f0eeff] flex items-center gap-2">
          <span>🤖</span> Modelos de IA por Fase de Limite
        </h2>
        <p className="text-xs text-[#8b87b8] mt-1">
          Defina o modelo padrão usado na fase de <strong>Limite Máximo / Franquia</strong> e um modelo mais econômico para a fase de <strong>Limite por Dia</strong>.
        </p>
      </div>

      {/* Cards de Status Atual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#7f77dd]/30 bg-[#14102b]/80 p-5 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-[#8b87b8] font-semibold">
            Ativo no Limite Máximo / Franquia
          </span>
          <p
            data-testid="active-max-model-badge"
            className="text-base font-bold text-[#f0eeff]"
          >
            {savedMaxModel}
          </p>
          {savedMaxInfo?.input_price_usd != null && savedMaxInfo?.output_price_usd != null && (
            <p className="text-xs text-emerald-300/90">
              Entrada: <strong>{formatModelUsdPrice(savedMaxInfo.input_price_usd)}</strong> / 1M • Saída:{" "}
              <strong>{formatModelUsdPrice(savedMaxInfo.output_price_usd)}</strong> / 1M
            </p>
          )}
          <p className="text-[11px] text-[#AFA9EC]" data-testid="active-max-fallback-badge">
            Fallback: <strong>{savedMaxFallbackModel}</strong>
          </p>
          <p className="text-[11px] text-[#8b87b8]">
            Usado enquanto o aluno está dentro da franquia ou no modo Bloquear no Total.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-[#14102b]/80 p-5 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-emerald-300/80 font-semibold">
            Ativo no Limite por Dia
          </span>
          <p
            data-testid="active-daily-model-badge"
            className="text-base font-bold text-emerald-300"
          >
            {savedDailyModel}
          </p>
          {savedDailyInfo?.input_price_usd != null && savedDailyInfo?.output_price_usd != null && (
            <p className="text-xs text-emerald-300/90">
              Entrada: <strong>{formatModelUsdPrice(savedDailyInfo.input_price_usd)}</strong> / 1M • Saída:{" "}
              <strong>{formatModelUsdPrice(savedDailyInfo.output_price_usd)}</strong> / 1M
            </p>
          )}
          <p className="text-[11px] text-emerald-200/80" data-testid="active-daily-fallback-badge">
            Fallback: <strong>{savedDailyFallbackModel}</strong>
          </p>
          <p className="text-[11px] text-[#8b87b8]">
            Usado após esgotar a franquia (Franquia → diário) ou quando há apenas limite/dia.
          </p>
        </div>
      </div>

      {/* Formulário de Configuração */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-[#7f77dd]/25 bg-[#1a1535]/80 p-6 space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 rounded-xl border border-[#7f77dd]/20 bg-[#14102b]/40 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AFA9EC]">
              Limite Máximo / Franquia
            </h3>
            <AiModelSelector
              id="global-max-limit-model"
              testId="select-global-max-model"
              label="Modelo Principal"
              description="Recomendado: modelos avançados (ex.: gpt-6.1-sol, gpt-5.6-sol)."
              value={maxLimitModel}
              onChange={setMaxLimitModel}
              catalog={catalog}
            />
            <AiModelSelector
              id="global-max-limit-fallback-model"
              testId="select-global-max-fallback-model"
              label="Modelo de Fallback"
              description="Usado automaticamente se o modelo principal falhar."
              value={maxLimitFallbackModel}
              onChange={setMaxLimitFallbackModel}
              catalog={catalog}
            />
          </div>

          <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-[#14102b]/40 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Limite por Dia
            </h3>
            <AiModelSelector
              id="global-daily-limit-model"
              testId="select-global-daily-model"
              label="Modelo Principal"
              description="Recomendado: modelos econômicos (ex.: gpt-6-luna, gpt-4o-mini)."
              value={dailyLimitModel}
              onChange={setDailyLimitModel}
              catalog={catalog}
            />
            <AiModelSelector
              id="global-daily-limit-fallback-model"
              testId="select-global-daily-fallback-model"
              label="Modelo de Fallback"
              description="Usado automaticamente se o modelo principal diário falhar."
              value={dailyLimitFallbackModel}
              onChange={setDailyLimitFallbackModel}
              catalog={catalog}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <span className="text-[11px] text-[#8b87b8]">
            {updatedBy ? `Última atualização por: ${updatedBy}` : "Usando configuração padrão do sistema"}
          </span>

          <button
            type="submit"
            data-testid="save-ai-models-btn"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#7f77dd] hover:bg-[#6d64cc] text-white transition cursor-pointer disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Modelos"}
          </button>
        </div>
      </form>
    </div>
  );
}
