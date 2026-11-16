import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Financeiro from "@/components/Financeiro";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Financeiro Component", () => {
  const mockResponse = {
    exchange_rate: 5.6,
    period: "all",
    summary: {
      total_cost_usd: 0.425,
      total_cost_brl: 2.38,
      month_cost_usd: 0.125,
      month_cost_brl: 0.7,
      total_prompt_tokens: 25000,
      total_completion_tokens: 45000,
      total_tokens: 70000,
      avg_cost_per_user_usd: 0.2125,
      avg_cost_per_user_brl: 1.19,
      users_count: 2,
      maps_count: 5,
      readings_count: 12,
    },
    users: [
      {
        user_id: "u1",
        name: "Maria Silva",
        email: "maria@exemplo.com",
        role: "client",
        maps_count: 3,
        readings_count: 10,
        prompt_tokens: 18000,
        completion_tokens: 32000,
        total_tokens: 50000,
        cost_usd: 0.3,
        cost_brl: 1.68,
      },
      {
        user_id: "u2",
        name: "Admin Teste",
        email: "admin@exemplo.com",
        role: "admin",
        maps_count: 2,
        readings_count: 2,
        prompt_tokens: 7000,
        completion_tokens: 13000,
        total_tokens: 20000,
        cost_usd: 0.125,
        cost_brl: 0.7,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue(mockResponse);
  });

  it("carrega e exibe os cards de resumo e o ranking de consumo por usuário", async () => {
    render(<Financeiro />);

    await waitFor(() => {
      expect(screen.getByText("Financeiro — Consumo de IA")).toBeDefined();
    });

    expect(api.get).toHaveBeenCalledWith("/admin/financeiro?period=all");
    expect(screen.getByTestId("financeiro-total-usd").textContent).toContain("$0.4250");
    expect(screen.getByTestId("financeiro-total-brl").textContent).toContain("R$ 2,38");
    expect(screen.getByTestId("financeiro-month-usd").textContent).toContain("$0.1250");
    expect(screen.getByTestId("financeiro-total-tokens").textContent).toContain("70.000");
    expect(screen.getByTestId("financeiro-avg-usd").textContent).toContain("$0.2125");

    expect(screen.getByText("Maria Silva")).toBeDefined();
    expect(screen.getByText("Admin Teste")).toBeDefined();
    expect(screen.getByText("3 mapas · 10 leituras")).toBeDefined();
  });

  it("permite filtrar por período e buscar por usuário", async () => {
    render(<Financeiro />);

    await waitFor(() => {
      expect(screen.getByText("Maria Silva")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("period-btn-month"));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/financeiro?period=month");
    });

    fireEvent.change(screen.getByTestId("financeiro-search-input"), { target: { value: "maria" } });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/financeiro?period=month&search=maria");
    });
  });

  it("exibe campos de data ao selecionar período personalizado", async () => {
    render(<Financeiro />);

    await waitFor(() => {
      expect(screen.getByTestId("period-btn-custom")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("period-btn-custom"));
    expect(screen.getByTestId("financeiro-start-date")).toBeDefined();
    expect(screen.getByTestId("financeiro-end-date")).toBeDefined();
  });
});
