import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import FinanceiroUserReportsModal from "@/components/FinanceiroUserReportsModal";
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

describe("FinanceiroUserReportsModal", () => {
  const mockUser = {
    user_id: "u1",
    name: "Maria Silva",
    email: "maria@exemplo.com",
    role: "client",
    maps_count: 1,
    readings_count: 1,
    prompt_tokens: 1000,
    completion_tokens: 2000,
    total_tokens: 3000,
    cost_usd: 0.08,
    cost_brl: 0.448,
  };

  const mockReports = {
    user: { user_id: "u1", name: "Maria Silva", email: "maria@exemplo.com", role: "client" },
    period: "all",
    sort: "newest",
    readings: [
      {
        id: "r1",
        data_alvo: "2026-11-17",
        area: "Carreira",
        pergunta: "Devo aceitar a proposta?",
        sintese: "Momento favorável para decisões estratégicas.",
        textos: { "Sol na Casa 10": "Brilho profissional em destaque." },
        status: "concluido",
        prompt_tokens: 500,
        completion_tokens: 1000,
        total_tokens: 1500,
        cost_usd: 0.04,
        cost_brl: 0.224,
        created_at: "2026-11-17T13:30:00Z",
      },
    ],
    maps: [
      {
        id: "m1",
        name: "Maria Silva",
        email: "maria@exemplo.com",
        birth_city: "Curitiba",
        birth_date: "1992-08-20",
        birth_time: "09:15",
        model_used: "gpt-4o",
        status: "success",
        prompt_tokens: 500,
        completion_tokens: 1000,
        total_tokens: 1500,
        cost_usd: 0.04,
        cost_brl: 0.224,
        created_at: "2026-11-16T18:00:00Z",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue(mockReports);
  });

  it("carrega leituras e mapas, permite ler relatório completo e trocar de aba", async () => {
    const onClose = vi.fn();
    render(
      <FinanceiroUserReportsModal
        user={mockUser}
        period="all"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Leituras do Dia (1)")).toBeDefined();
      expect(screen.getByText("Mapas Astrais (1)")).toBeDefined();
    });

    // Horário de Brasília (13:30 UTC -> 10:30 BRT)
    expect(screen.getByText(/10:30/)).toBeDefined();
    expect(screen.getByText("Carreira")).toBeDefined();

    // Expande leitura completa
    fireEvent.click(screen.getByText("Ler Relatório"));
    expect(screen.getByText("Momento favorável para decisões estratégicas.")).toBeDefined();
    expect(screen.getByText("Brilho profissional em destaque.")).toBeDefined();

    // Troca para aba Mapas Astrais
    fireEvent.click(screen.getByText("Mapas Astrais (1)"));
    expect(screen.getByText(/Curitiba/)).toBeDefined();
    expect(screen.getByText("gpt-4o")).toBeDefined();
  });

  it("altera ordenação no popup e fecha apenas pelo botão Fechar", async () => {
    const onClose = vi.fn();
    render(
      <FinanceiroUserReportsModal
        user={mockUser}
        period="all"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Ordenar relatórios")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Ordenar relatórios"), {
      target: { value: "highest_cost" },
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining("sort=highest_cost")
      );
    });

    // Clicar no backdrop não deve fechar o modal
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    // Clicar no botão Fechar deve fechar
    fireEvent.click(screen.getByText("Fechar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
