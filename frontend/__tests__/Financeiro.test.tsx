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

  it("permite filtrar por papel (Alunos / Admins) e ordenar usuários", async () => {
    render(<Financeiro />);

    await waitFor(() => {
      expect(screen.getByTestId("role-btn-client")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("role-btn-client"));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/financeiro?period=all&role=client");
    });

    fireEvent.change(screen.getByTestId("financeiro-sort-select"), {
      target: { value: "newest" },
    });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/financeiro?period=all&role=client&sort=newest");
    });

    fireEvent.click(screen.getByTestId("role-btn-internal_client"));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/financeiro?period=all&role=internal_client&sort=newest");
    });
  });

  it("abre o popup de relatórios ao clicar em um usuário da lista", async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.startsWith("/admin/financeiro/user-reports")) {
        return Promise.resolve({
          user: { user_id: "u1", name: "Maria Silva", email: "maria@exemplo.com", role: "client" },
          period: "all",
          sort: "newest",
          readings: [],
          maps: [],
        });
      }
      return Promise.resolve(mockResponse);
    });

    render(<Financeiro />);

    await waitFor(() => {
      expect(screen.getByTestId("financeiro-user-row-0")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("financeiro-user-row-0"));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeDefined();
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining("/admin/financeiro/user-reports?period=all&sort=newest&user_id=u1")
      );
    });
  });

  it("pagina a lista de usuários de 10 em 10 usando PaginationControls", async () => {
    const manyUsers = Array.from({ length: 12 }, (_, idx) => ({
      user_id: `u-${idx + 1}`,
      name: `Usuário ${idx + 1}`,
      email: `user${idx + 1}@exemplo.com`,
      role: "client",
      maps_count: 1,
      readings_count: 1,
      prompt_tokens: 100,
      completion_tokens: 100,
      total_tokens: 200,
      cost_usd: 0.05,
      cost_brl: 0.28,
    }));

    (api.get as any).mockResolvedValue({
      ...mockResponse,
      users: manyUsers,
    });

    render(<Financeiro />);

    await waitFor(() => {
      expect(screen.getByText("Usuário 1")).toBeDefined();
      expect(screen.getByText("Usuário 10")).toBeDefined();
      expect(screen.queryByText("Usuário 11")).toBeNull();
      expect(screen.getByTestId("pagination-controls")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("next-page-btn"));

    await waitFor(() => {
      expect(screen.getByText("Usuário 11")).toBeDefined();
      expect(screen.getByText("Usuário 12")).toBeDefined();
      expect(screen.queryByText("Usuário 1")).toBeNull();
    });
  });

  it("permite selecionar pessoas e exibe popup inferior com soma de leituras, tokens, USD e BRL", async () => {
    render(<Financeiro />);

    await waitFor(() => {
      expect(screen.getByTestId("financeiro-select-user-0")).toBeDefined();
      expect(screen.getByTestId("financeiro-select-user-1")).toBeDefined();
    });

    // Inicialmente o popup não é exibido
    expect(screen.queryByTestId("financeiro-selection-popup")).toBeNull();

    // Seleciona a primeira pessoa (Maria Silva: 10 leituras, 50.000 tokens, $0.3000, R$ 1,68)
    fireEvent.click(screen.getByTestId("financeiro-select-user-0"));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("financeiro-selection-popup")).toBeDefined();
    expect(screen.getByTestId("selection-popup-count").textContent).toContain("1 selecionada");
    expect(screen.getByTestId("selection-popup-readings").textContent).toBe("10");
    expect(screen.getByTestId("selection-popup-tokens").textContent).toBe("50.000");
    expect(screen.getByTestId("selection-popup-usd").textContent).toBe("$0.3000");
    expect(screen.getByTestId("selection-popup-brl").textContent).toBe("R$ 1,68");

    // Seleciona a segunda pessoa (Admin Teste: 2 leituras, 20.000 tokens, $0.1250, R$ 0,70)
    fireEvent.click(screen.getByTestId("financeiro-select-user-1"));

    expect(screen.getByTestId("selection-popup-count").textContent).toContain("2 selecionadas");
    expect(screen.getByTestId("selection-popup-readings").textContent).toBe("12");
    expect(screen.getByTestId("selection-popup-tokens").textContent).toBe("70.000");
    expect(screen.getByTestId("selection-popup-usd").textContent).toBe("$0.4250");
    expect(screen.getByTestId("selection-popup-brl").textContent).toBe("R$ 2,38");

    // Limpa a seleção pelo botão Limpar do popup
    fireEvent.click(screen.getByTestId("financeiro-clear-selection-btn"));
    expect(screen.queryByTestId("financeiro-selection-popup")).toBeNull();
  });

  it("permite selecionar e desmarcar todos os contatos de uma só vez", async () => {
    render(<Financeiro />);

    await waitFor(() => {
      expect(screen.getByTestId("financeiro-select-all")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("financeiro-select-all"));

    expect(screen.getByTestId("financeiro-selection-popup")).toBeDefined();
    expect(screen.getByTestId("selection-popup-count").textContent).toContain("2 selecionadas");
    expect(screen.getByTestId("selection-popup-readings").textContent).toBe("12");
    expect(screen.getByTestId("selection-popup-tokens").textContent).toBe("70.000");
    expect(screen.getByTestId("selection-popup-usd").textContent).toBe("$0.4250");
    expect(screen.getByTestId("selection-popup-brl").textContent).toBe("R$ 2,38");

    fireEvent.click(screen.getByTestId("financeiro-select-all"));
    expect(screen.queryByTestId("financeiro-selection-popup")).toBeNull();
  });
});
