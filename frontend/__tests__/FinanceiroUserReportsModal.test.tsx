import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import FinanceiroUserReportsModal from "@/components/FinanceiroUserReportsModal";
import {
  getBrasiliaDateKey,
  groupCountsByBrasiliaDate,
  filterItemsByDate,
} from "@/components/FinanceiroUserReportsDateFilter";
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
        model_used: "gpt-5.6-sol",
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

    // Horário de Brasília (13:30 UTC -> 10:30 BRT) e data alvo em dd/MM/yy
    expect(screen.getByText(/10:30/)).toBeDefined();
    expect(screen.getByText(/Alvo: 17\/11\/26/)).toBeDefined();
    expect(screen.getByText("Carreira")).toBeDefined();
    expect(screen.getByTestId("reading-model-badge-r1").textContent).toContain("gpt-5.6-sol");

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

  it("carrega o Mapa do Aluno sob demanda ao clicar na aba Mapa do Aluno", async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === "/admin/clients/u1") {
        return Promise.resolve({
          id: "u1",
          name: "Maria Silva",
          email: "maria@exemplo.com",
          birth_date: "1995-05-10",
          birth_time: "14:30",
          birth_city: "Curitiba",
          birth_state: "PR",
          sun_sign: "Touro",
          moon_sign: "Virgem",
          rising_sign: "Leão",
          chart: {
            id: "c1",
            status: "ready",
            svg_content: "<svg data-testid='mock-mandala'></svg>",
          },
        });
      }
      return Promise.resolve(mockReportsResponse);
    });

    render(
      <FinanceiroUserReportsModal
        user={mockUser}
        period="all"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("financeiro-modal-tab-chart")).toBeDefined();
    });

    // Não busca o mapa antes de clicar na aba
    expect(api.get).not.toHaveBeenCalledWith("/admin/clients/u1");

    fireEvent.click(screen.getByTestId("financeiro-modal-tab-chart"));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/clients/u1");
      expect(screen.getByTestId("financeiro-chart-tab")).toBeDefined();
    });

    expect(screen.getByTestId("financeiro-chart-sun").textContent).toBe("Touro");
    expect(screen.getByTestId("financeiro-chart-moon").textContent).toBe("Virgem");
    expect(screen.getByTestId("financeiro-chart-rising").textContent).toBe("Leão");
    expect(screen.getByTestId("financeiro-chart-svg")).toBeDefined();
    expect(screen.getByTestId("financeiro-chart-zoom-btn")).toBeDefined();
    expect(screen.getByTestId("financeiro-chart-pdf-btn")).toBeDefined();
  });

  it("exibe chips com contagem por data (Brasília) e filtra por chip e por intervalo De/Até", async () => {
    const multiDateReports = {
      ...mockReports,
      readings: [
        {
          ...mockReports.readings[0],
          id: "r-19",
          pergunta: "Leitura do dia 19",
          created_at: "2026-11-19T09:39:00Z", // 06:39 BRT (19/11/2026)
        },
        {
          ...mockReports.readings[0],
          id: "r-18a",
          pergunta: "Leitura do dia 18 manhã",
          created_at: "2026-11-18T14:00:00Z", // 11:00 BRT (18/11/2026)
        },
        {
          ...mockReports.readings[0],
          id: "r-18b",
          pergunta: "Leitura do dia 18 noite (UTC 19)",
          created_at: "2026-11-19T01:30:00Z", // 22:30 BRT do dia 18/11/2026
        },
      ],
    };
    (api.get as any).mockResolvedValue(multiDateReports);

    render(
      <FinanceiroUserReportsModal
        user={mockUser}
        period="all"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("financeiro-reports-date-filter")).toBeDefined();
    });

    // Chip "Todas (3)" e chips por data com contagem
    expect(screen.getByText("Todas (3)")).toBeDefined();
    const chip19 = screen.getByTestId("date-chip-2026-11-19");
    const chip18 = screen.getByTestId("date-chip-2026-11-18");
    expect(chip19.textContent).toContain("19/11/2026");
    expect(chip19.textContent).toContain("1");
    expect(chip18.textContent).toContain("18/11/2026");
    expect(chip18.textContent).toContain("2");

    // Filtra clicando no chip do dia 18
    fireEvent.click(chip18);
    expect(screen.getByTestId("financeiro-reports-filtered-count").textContent).toBe("Exibindo 2 de 3");
    expect(screen.queryByText(/Leitura do dia 19/)).toBeNull();
    expect(screen.getByText(/Leitura do dia 18 manhã/)).toBeDefined();
    expect(screen.getByText(/Leitura do dia 18 noite/)).toBeDefined();

    // Clica novamente no chip do dia 18 para desmarcar
    fireEvent.click(chip18);
    expect(screen.getByText(/Leitura do dia 19/)).toBeDefined();

    // Filtra por intervalo De / Até (apenas dia 19)
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-11-19" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-11-19" } });
    expect(screen.getByTestId("financeiro-reports-filtered-count").textContent).toBe("Exibindo 1 de 3");
    expect(screen.getByText(/Leitura do dia 19/)).toBeDefined();
    expect(screen.queryByText(/Leitura do dia 18 manhã/)).toBeNull();

    // Limpar filtro restaura tudo
    fireEvent.click(screen.getByText("Limpar filtro"));
    expect(screen.getByText(/Leitura do dia 18 manhã/)).toBeDefined();
  });

  it("mostra estado vazio ao filtrar intervalo sem leituras e permite limpar", async () => {
    render(
      <FinanceiroUserReportsModal
        user={mockUser}
        period="all"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Data inicial")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-12-01" } });
    expect(screen.getByText("Nenhuma leitura encontrada para a data selecionada.")).toBeDefined();

    fireEvent.click(screen.getByText("Limpar filtro de data"));
    expect(screen.getByText(/Devo aceitar a proposta\?/)).toBeDefined();
  });
});

describe("FinanceiroUserReportsDateFilter helpers", () => {
  it("converte ISO para data de Brasília considerando virada de dia UTC", () => {
    expect(getBrasiliaDateKey("2026-11-19T01:30:00Z")).toBe("2026-11-18");
    expect(getBrasiliaDateKey("2026-11-19T09:30:00Z")).toBe("2026-11-19");
    expect(getBrasiliaDateKey(null)).toBeNull();
  });

  it("agrupa contagens por data ordenadas da mais recente para a mais antiga", () => {
    const groups = groupCountsByBrasiliaDate([
      { created_at: "2026-11-17T15:00:00Z" },
      { created_at: "2026-11-19T10:00:00Z" },
      { created_at: "2026-11-19T01:00:00Z" }, // 18/11 BRT
      { created_at: "2026-11-18T12:00:00Z" },
    ]);
    expect(groups).toEqual([
      { dateKey: "2026-11-19", label: "19/11/2026", count: 1 },
      { dateKey: "2026-11-18", label: "18/11/2026", count: 2 },
      { dateKey: "2026-11-17", label: "17/11/2026", count: 1 },
    ]);
  });

  it("filtra itens por data única ou intervalo", () => {
    const items = [
      { id: 1, created_at: "2026-11-17T15:00:00Z" },
      { id: 2, created_at: "2026-11-18T15:00:00Z" },
      { id: 3, created_at: "2026-11-19T15:00:00Z" },
    ];
    expect(filterItemsByDate(items, "2026-11-18", "", "").map((i) => i.id)).toEqual([2]);
    expect(filterItemsByDate(items, null, "2026-11-18", "2026-11-19").map((i) => i.id)).toEqual([2, 3]);
    expect(filterItemsByDate(items, null, "", "").map((i) => i.id)).toEqual([1, 2, 3]);
  });
});
