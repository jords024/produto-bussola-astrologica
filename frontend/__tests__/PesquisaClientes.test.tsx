import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PesquisaClientes from "@/components/PesquisaClientes";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("PesquisaClientes", () => {
  const mockClients = [
    {
      id: "cli-1",
      name: "Aryaraj Alves Fernandes",
      email: "aryaraj@example.com",
      status: "pending",
      birth_date: "1998-03-09",
      birth_time: "18:35:00",
      birth_country: "Brasil",
      birth_state: "CE",
      birth_city: "Fortaleza",
      sun_sign: "Peixes",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes("/admin/clients")) {
        return Promise.resolve({ items: mockClients });
      }
      return Promise.resolve({});
    });
    (api.post as any).mockResolvedValue({
      generated_count: 1,
      skipped_missing_count: 0,
    });
  });

  it("não possui a opção 'Todas', oferecendo apenas 'Data Específica' e 'Período (Range)'", async () => {
    render(<PesquisaClientes onOpenClient={vi.fn()} onGoToHome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Data Específica/i })).toBeDefined();
    });

    // Não deve existir o botão 'Todas'
    expect(screen.queryByRole("button", { name: /^todas$/i })).toBeNull();

    // Deve possuir as opções 'Data Específica' e 'Período (Range)'
    expect(screen.getByRole("button", { name: /Data Específica/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Período \(Range\)/i })).toBeDefined();
  });

  it("permite alternar entre Data Específica e Período (Range) exibindo os campos de data correspondentes", async () => {
    render(<PesquisaClientes onOpenClient={vi.fn()} onGoToHome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Data Específica/i })).toBeDefined();
    });

    // Em Data Específica, há 1 input de data
    const specificDateButton = screen.getByRole("button", { name: /Data Específica/i });
    fireEvent.click(specificDateButton);
    expect(screen.queryByText(/até/i)).toBeNull();

    // Em Período (Range), exibe 'até' e inputs de início e fim
    const rangeButton = screen.getByRole("button", { name: /Período \(Range\)/i });
    fireEvent.click(rangeButton);
    expect(screen.getByText(/até/i)).toBeDefined();
  });

  it("exibe aviso de cadastros aguardando geração quando o cliente está pendente", async () => {
    render(<PesquisaClientes onOpenClient={vi.fn()} onGoToHome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("status-area")).toBeDefined();
    });

    // Exibe texto limpo de status
    expect(screen.getByText(/1 cadastro\(s\) aguardando geração para esta data\/período/i)).toBeDefined();
    expect(screen.getByText(/Clique no botão 'Gerar Mapa Astral' acima para criar o mapa cósmico/i)).toBeDefined();
  });

  it("exibe a seção de mapa gerado logo abaixo na tela quando o cliente possui status 'ready'", async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes("/admin/clients/cli-1")) {
        return Promise.resolve({
          id: "cli-1",
          name: "Aryaraj Alves Fernandes",
          sun_sign: "Peixes",
          moon_sign: "Câncer",
          rising_sign: "Virgem",
          birth_date: "1998-03-09",
          birth_time: "18:35",
          birth_city: "Fortaleza",
          birth_state: "CE",
          chart: {
            id: "chart-1",
            svg_content: `<svg><circle cx="50" cy="50" r="40"/></svg>`,
            status: "ready",
          },
        });
      }
      if (url.includes("/admin/clients")) {
        return Promise.resolve({
          items: [{ ...mockClients[0], status: "ready" }],
        });
      }
      return Promise.resolve({});
    });

    render(<PesquisaClientes onOpenClient={vi.fn()} onGoToHome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("generated-charts-section")).toBeDefined();
    });

    expect(screen.getByText(/Mapa Astral Gerado/i)).toBeDefined();
    expect(screen.getByTestId("header-date-range-badge")).toBeDefined();
    expect(await screen.findByText(/Mapa Astral de Aryaraj Alves Fernandes/i)).toBeDefined();
  });

  it("executa a geração do mapa astral ao clicar no botão 'Gerar Mapa Astral' mesmo com status 'ready'", async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes("/admin/clients/cli-1")) {
        return Promise.resolve({
          id: "cli-1",
          name: "Aryaraj Alves Fernandes",
          sun_sign: "Peixes",
          birth_date: "1998-03-09",
          birth_time: "18:35",
          chart: { id: "chart-1", svg_content: `<svg></svg>`, status: "ready" },
        });
      }
      if (url.includes("/admin/clients")) {
        return Promise.resolve({
          items: [{ ...mockClients[0], status: "ready" }],
        });
      }
      return Promise.resolve({});
    });

    render(<PesquisaClientes onOpenClient={vi.fn()} onGoToHome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Gerar Mapa Astral/i })).toBeDefined();
    });

    const generateBtn = screen.getByRole("button", { name: /Gerar Mapa Astral/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/clients/batch-generate",
        expect.objectContaining({
          client_ids: ["cli-1"],
        })
      );
    });

    expect(await screen.findByText(/1 mapa\(s\) astral\(is\) gerado\(s\) com sucesso/i)).toBeDefined();
  });

  it("pagina os mapas gerados de 5 em 5 e carrega apenas os itens da página atual", async () => {
    const sevenClients = Array.from({ length: 7 }, (_, i) => ({
      ...mockClients[0],
      id: `cli-${i + 1}`,
      name: `Cliente Paginado ${i + 1}`,
      email: `cli${i + 1}@example.com`,
      status: "ready",
    }));

    (api.get as any).mockImplementation((url: string) => {
      const detailMatch = url.match(/\/admin\/clients\/(cli-\d+)/);
      if (detailMatch) {
        const cid = detailMatch[1];
        const idx = cid.replace("cli-", "");
        return Promise.resolve({
          id: cid,
          name: `Cliente Paginado ${idx}`,
          sun_sign: "Peixes",
          birth_date: "1998-03-09",
          birth_time: "18:35",
          chart: { id: `chart-${idx}`, svg_content: `<svg></svg>`, status: "ready" },
        });
      }
      if (url.includes("/admin/clients")) {
        return Promise.resolve({ items: sevenClients });
      }
      return Promise.resolve({});
    });

    render(<PesquisaClientes onOpenClient={vi.fn()} onGoToHome={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("pagination-controls")).toBeDefined();
    });

    const pagination = screen.getByTestId("pagination-controls");
    expect(pagination.textContent).toContain("Exibindo 1 a 5 de 7 mapas (5 por página)");

    // Página 1: deve buscar apenas cli-1..cli-5, sem disparar cli-6 ou cli-7
    await waitFor(() => {
      expect(screen.getByText(/Mapa Astral de Cliente Paginado 1/i)).toBeDefined();
      expect(screen.getByText(/Mapa Astral de Cliente Paginado 5/i)).toBeDefined();
    });
    expect(api.get).not.toHaveBeenCalledWith("/admin/clients/cli-6");
    expect(api.get).not.toHaveBeenCalledWith("/admin/clients/cli-7");

    // Avança para página 2
    fireEvent.click(screen.getByTestId("next-page-btn"));

    await waitFor(() => {
      expect(screen.getByText(/Mapa Astral de Cliente Paginado 6/i)).toBeDefined();
      expect(screen.getByText(/Mapa Astral de Cliente Paginado 7/i)).toBeDefined();
    });
    expect(screen.getByTestId("pagination-controls").textContent).toContain(
      "Exibindo 6 a 7 de 7 mapas (5 por página)"
    );
  });
});
