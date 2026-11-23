import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ConfiguracoesIA from "@/components/ConfiguracoesIA";
import UserAiModelOverridesFields from "@/components/UserAiModelOverridesFields";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCatalog = [
  { id: "gpt-6.2-sol", label: "GPT-6.2 Sol", family: "GPT-6", tier: "Avançado", input_price_usd: 2.0, output_price_usd: 10.0 },
  { id: "gpt-6.1-sol", label: "GPT-6.1 Sol", family: "GPT-6", tier: "Avançado", input_price_usd: 2.0, output_price_usd: 10.0 },
  { id: "gpt-6-luna", label: "GPT-6 Luna", family: "GPT-6", tier: "Econômico", input_price_usd: 0.1, output_price_usd: 0.5 },
  { id: "gpt-6", label: "GPT-6", family: "GPT-6", tier: "Avançado", input_price_usd: 2.0, output_price_usd: 10.0 },
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol", family: "GPT-5", tier: "Avançado", input_price_usd: 4.0, output_price_usd: 20.0 },
  { id: "gpt-5.5", label: "GPT-5.5", family: "GPT-5", tier: "Avançado", input_price_usd: 5.0, output_price_usd: 30.0 },
  { id: "gpt-5.1", label: "GPT-5.1", family: "GPT-5", tier: "Avançado", input_price_usd: 2.0, output_price_usd: 10.0 },
  { id: "gpt-5-mini", label: "GPT-5 Mini", family: "GPT-5", tier: "Econômico", input_price_usd: 0.25, output_price_usd: 2.0 },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", family: "GPT-4", tier: "Econômico", input_price_usd: 0.15, output_price_usd: 0.6 },
];

describe("ConfiguracoesIA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === "/admin/ai-models/config") {
        return Promise.resolve({
          max_limit_model: "gpt-5.6-sol",
          max_limit_fallback_model: "gpt-5.6-luna",
          daily_limit_model: "gpt-4o-mini",
          daily_limit_fallback_model: "gpt-6-luna",
          updated_by: "admin@bussola.com",
          catalog: mockCatalog,
        });
      }
      if (url === "/admin/ai-models/catalog?sync=true") {
        return Promise.resolve({
          synced_from_openai: true,
          models: mockCatalog.map((m) => ({ ...m, available_in_openai: true })),
        });
      }
      return Promise.reject(new Error("URL inesperada"));
    });
    (api.put as any).mockResolvedValue({
      max_limit_model: "gpt-6",
      max_limit_fallback_model: "gpt-6.1-sol",
      daily_limit_model: "gpt-5-mini",
      daily_limit_fallback_model: "gpt-6-luna",
      updated_by: "admin@bussola.com",
    });
  });

  it("exibe modelos ativos, valores em USD e permite salvar alteração com fallbacks", async () => {
    render(<ConfiguracoesIA />);

    await waitFor(() => {
      expect(screen.getByTestId("active-max-model-badge").textContent).toBe("gpt-5.6-sol");
      expect(screen.getByTestId("active-max-fallback-badge").textContent).toContain("gpt-5.6-luna");
      expect(screen.getByTestId("active-daily-model-badge").textContent).toBe("gpt-4o-mini");
      expect(screen.getByTestId("active-daily-fallback-badge").textContent).toContain("gpt-6-luna");
      expect(screen.getByTestId("select-global-max-model-pricing").textContent).toContain("$4.00");
      expect(screen.getByTestId("select-global-max-model-pricing").textContent).toContain("$20.00");
      expect(screen.getByTestId("select-global-daily-model-pricing").textContent).toContain("$0.15");
      expect(screen.getByTestId("select-global-daily-model-pricing").textContent).toContain("$0.60");
    });

    expect(screen.queryByTestId("sync-openai-models-btn")).toBeNull();

    // Abre dropdown do Limite Máximo, filtra por "gpt-6" e seleciona
    fireEvent.click(screen.getByTestId("select-global-max-model"));
    fireEvent.change(screen.getByTestId("select-global-max-model-search"), {
      target: { value: "gpt-6" },
    });
    expect(screen.queryByTestId("select-global-max-model-option-gpt-5.1")).toBeNull();
    fireEvent.click(screen.getByTestId("select-global-max-model-option-gpt-6"));

    // Seleciona fallback do Limite Máximo
    fireEvent.click(screen.getByTestId("select-global-max-fallback-model"));
    fireEvent.change(screen.getByTestId("select-global-max-fallback-model-search"), {
      target: { value: "gpt-6.1-sol" },
    });
    fireEvent.click(screen.getByTestId("select-global-max-fallback-model-option-gpt-6.1-sol"));

    // Abre dropdown do Limite por Dia, filtra por "gpt-5-mini" e seleciona
    fireEvent.click(screen.getByTestId("select-global-daily-model"));
    fireEvent.change(screen.getByTestId("select-global-daily-model-search"), {
      target: { value: "gpt-5-mini" },
    });
    fireEvent.click(screen.getByTestId("select-global-daily-model-option-gpt-5-mini"));

    fireEvent.click(screen.getByTestId("save-ai-models-btn"));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/admin/ai-models/config", {
        max_limit_model: "gpt-6",
        max_limit_fallback_model: "gpt-6.1-sol",
        daily_limit_model: "gpt-5-mini",
        daily_limit_fallback_model: "gpt-6-luna",
      });
      expect(screen.getByTestId("active-max-model-badge").textContent).toBe("gpt-6");
      expect(screen.getByTestId("active-max-fallback-badge").textContent).toContain("gpt-6.1-sol");
      expect(screen.getByTestId("active-daily-model-badge").textContent).toBe("gpt-5-mini");
    });
  });
});

describe("UserAiModelOverridesFields", () => {
  it("exibe o modelo em uso para o aluno e permite sobrescrever", () => {
    const onMax = vi.fn();
    const onDaily = vi.fn();

    render(
      <UserAiModelOverridesFields
        role="client"
        loading={false}
        activeModel="gpt-4o-mini"
        activePhase="daily_limit"
        globalMaxModel="gpt-5.6-sol"
        globalDailyModel="gpt-4o-mini"
        aiModelMax=""
        aiModelDaily=""
        onChangeAiModelMax={onMax}
        onChangeAiModelDaily={onDaily}
        catalog={mockCatalog}
      />
    );

    expect(screen.getByTestId("user-active-ai-model-badge").textContent).toContain("gpt-4o-mini");
    expect(screen.getByTestId("user-active-ai-model-badge").textContent).toContain("Limite por dia");

    fireEvent.click(screen.getByTestId("select-user-ai-model-max"));
    fireEvent.change(screen.getByTestId("select-user-ai-model-max-search"), {
      target: { value: "5.5" },
    });
    fireEvent.click(screen.getByTestId("select-user-ai-model-max-option-gpt-5.5"));
    expect(onMax).toHaveBeenCalledWith("gpt-5.5");
  });
});
