import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ColetaDadosBussola from "@/components/ColetaDadosBussola";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/components/CityAutocomplete", () => ({
  default: ({
    onChangeCity,
    onSelectCity,
  }: {
    onChangeCity: (val: string) => void;
    onSelectCity: (opt: any) => void;
  }) => (
    <div>
      <input
        data-testid="city-input"
        placeholder="Cidade"
        onChange={(e) => onChangeCity(e.target.value)}
      />
      <button
        type="button"
        data-testid="mock-select-city-btn"
        onClick={() =>
          onSelectCity({
            display: "Governador Archer, Maranhão, Brasil",
            flag: "🇧🇷",
            city: "Governador Archer",
            state: "Maranhão",
            country: "Brasil",
            country_code: "BR",
            lat: -5.0222,
            lng: -44.2711,
            tz_str: "America/Fortaleza",
          })
        }
      >
        Selecionar Cidade
      </button>
    </div>
  ),
}));

describe("ColetaDadosBussola", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({
      name: "João Silva",
      birth_date: "1990-05-15",
      birth_time: "14:30",
      birth_city: "São Paulo",
      birth_state: "SP",
      birth_country: "Brasil",
      has_data: true,
    });
  });

  it("renderiza os 4 passos principais de coleta de dados e não exibe a etapa 05", async () => {
    render(<ColetaDadosBussola />);

    await waitFor(() => {
      expect(screen.getByText("01.")).toBeDefined();
    });

    expect(screen.getByText("02.")).toBeDefined();
    expect(screen.getByText("03.")).toBeDefined();
    expect(screen.getByText("04.")).toBeDefined();

    // Garante que a etapa 05 (foco principal) foi completamente removida
    expect(screen.queryByText("05.")).toBeNull();
    expect(screen.queryByText(/Qual o seu foco principal no momento\?/i)).toBeNull();
  });

  it("submete o formulário com sucesso sem exigir o campo de foco", async () => {
    vi.mocked(api.post).mockResolvedValue({
      success: true,
      user: { name: "João Silva" },
    });

    const onSuccess = vi.fn();
    render(<ColetaDadosBussola onSuccess={onSuccess} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("João Silva")).toBeDefined();
    });

    fireEvent.submit(screen.getByRole("button", { name: /Calibrar Minha Bússola/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/members/birth-data",
        expect.objectContaining({
          birth_date: "1990-05-15",
          birth_city: "São Paulo",
          birth_time: "14:30",
        })
      );
    });
  });

  it("converte o nome completo do estado retornado pela cidade (ex: Maranhão) para a UF correspondente (MA)", async () => {
    render(<ColetaDadosBussola />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("João Silva")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("mock-select-city-btn"));

    const stateBtn = screen.getByTestId("state-select-button");
    expect(stateBtn.textContent).toContain("MA - Maranhão");
  });
});
