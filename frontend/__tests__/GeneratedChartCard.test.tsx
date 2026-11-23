import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GeneratedChartCard from "@/components/GeneratedChartCard";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    download: vi.fn(),
  },
}));

describe("GeneratedChartCard", () => {
  const mockClientDetail = {
    id: "cli-123",
    name: "Aryaraj Alves Fernandes",
    email: "aryaraj@bussola.local",
    whatsapp: "85999999999",
    birth_date: "1998-03-09",
    birth_time: "18:35",
    birth_city: "Fortaleza",
    birth_state: "CE",
    birth_country: "Brasil",
    lat: -3.7172,
    lng: -38.5431,
    sun_sign: "Peixes",
    moon_sign: "Leão",
    rising_sign: "Virgem",
    chart: {
      id: "chart-123",
      svg_content: `<svg data-testid="mock-svg"><circle cx="50" cy="50" r="40"/></svg>`,
      chart_data: {
        moon: { sign: "Leão", house: "11" },
        sun: { sign: "Peixes", house: "6" },
        mercury: { sign: "Áries", house: "6", retrograde: false },
        venus: { sign: "Aquário", house: "5" },
        mars: { sign: "Áries", house: "7" },
      },
      status: "ready",
    },
    sections: [
      { section_key: "portal", section_order: 0, content: "Bem-vindo ao seu portal cósmico." },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza o estado de carregamento inicial", () => {
    (api.get as any).mockReturnValue(new Promise(() => {})); // pending promise
    render(<GeneratedChartCard clientId="cli-123" />);

    expect(screen.getByTestId("loading-chart")).toBeDefined();
    expect(screen.getByText(/Carregando mandala e interpretação cósmica/i)).toBeDefined();
  });

  it("renderiza mandala SVG, signos e detalhes do mapa gerado com sucesso", async () => {
    (api.get as any).mockResolvedValueOnce(mockClientDetail);

    render(<GeneratedChartCard clientId="cli-123" onOpenClient={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Mapa Astral de Aryaraj Alves Fernandes/i)).toBeDefined();
    });

    // Signos do zodíaco no header e na lista
    expect(screen.getByText(/Sol em/i)).toBeDefined();
    expect(screen.getAllByText("Peixes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Lua em/i)).toBeDefined();
    expect(screen.getAllByText("Leão").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Ascendente em/i)).toBeDefined();
    expect(screen.getByText("Virgem")).toBeDefined();

    // Localidade e coordenadas
    expect(screen.getByText(/Fortaleza \(CE\) · Brasil/i)).toBeDefined();
    expect(screen.getByText(/\[-3.7172°, -38.5431°\]/i)).toBeDefined();

    // Mandala SVG
    expect(screen.getByTestId("chart-mandala-svg")).toBeDefined();

    // O PDF saiu do produto: o card entrega leitura, não arquivo para baixar.
    expect(screen.queryByRole("button", { name: /Baixar PDF/i })).toBeNull();
  });

  it("renderiza a lista dos 5 planetas (Lua, Sol, Mercúrio, Vênus, Marte) e suas respectivas casas logo abaixo da imagem", async () => {
    (api.get as any).mockResolvedValueOnce(mockClientDetail);
    const onOpenClientMock = vi.fn();

    render(<GeneratedChartCard clientId="cli-123" onOpenClient={onOpenClientMock} />);

    await waitFor(() => {
      expect(screen.getByTestId("planets-houses-list")).toBeDefined();
    });

    // Itens dos planetas
    expect(screen.getByTestId("planet-item-moon")).toBeDefined();
    expect(screen.getByTestId("planet-item-sun")).toBeDefined();
    expect(screen.getByTestId("planet-item-mercury")).toBeDefined();
    expect(screen.getByTestId("planet-item-venus")).toBeDefined();
    expect(screen.getByTestId("planet-item-mars")).toBeDefined();

    // Casas correspondentes
    expect(screen.getByTestId("planet-house-moon").textContent).toContain("Casa 11");
    expect(screen.getByTestId("planet-house-sun").textContent).toContain("Casa 6");
    expect(screen.getByTestId("planet-house-mercury").textContent).toContain("Casa 6");
    expect(screen.getByTestId("planet-house-venus").textContent).toContain("Casa 5");
    expect(screen.getByTestId("planet-house-mars").textContent).toContain("Casa 7");

    // Garante que o botão Síntese não existe na interface
    expect(screen.queryByTestId("open-sintese-btn")).toBeNull();
  });

  it("não oferece download de PDF: o card entrega leitura, não arquivo", async () => {
    (api.get as any).mockResolvedValueOnce(mockClientDetail);

    render(<GeneratedChartCard clientId="cli-123" />);

    await waitFor(() => {
      expect(screen.getByTestId("chart-mandala-svg")).toBeDefined();
    });

    expect(screen.queryByRole("button", { name: /Baixar PDF/i })).toBeNull();
    expect(api.download).not.toHaveBeenCalled();
  });

  it("abre o modal de zoom ao clicar no botão Maximizar da mandala", async () => {
    (api.get as any).mockResolvedValueOnce(mockClientDetail);

    render(<GeneratedChartCard clientId="cli-123" />);

    await waitFor(() => {
      expect(screen.getByTestId("maximize-chart-btn")).toBeDefined();
    });

    const maxBtn = screen.getByTestId("maximize-chart-btn");
    fireEvent.click(maxBtn);

    // Modal deve estar aberto na tela
    expect(screen.getByTestId("chart-zoom-modal-panel")).toBeDefined();
    expect(screen.getByTestId("close-chart-zoom-btn")).toBeDefined();

    // Fecha o modal
    fireEvent.click(screen.getByTestId("close-chart-zoom-btn"));
    expect(screen.queryByTestId("chart-zoom-modal-panel")).toBeNull();
  });

  it("renderiza o badge com a data real de criação do mapa astral", async () => {
    (api.get as any).mockResolvedValueOnce({
      ...mockClientDetail,
      chart: {
        ...mockClientDetail.chart,
        created_at: "2026-10-03T13:51:30Z",
      },
    });

    render(<GeneratedChartCard clientId="cli-123" />);

    await waitFor(() => {
      expect(screen.getByTestId("chart-real-creation-badge")).toBeDefined();
    });

    expect(screen.getByTestId("chart-real-creation-badge").textContent).toContain("Gerado em");
    expect(screen.getByText(/Data de Geração do Mapa:/i)).toBeDefined();
  });

  it("renderiza a seção de leitura de trânsitos ocupando toda a largura do grid", async () => {
    (api.get as any).mockResolvedValueOnce(mockClientDetail);

    render(<GeneratedChartCard clientId="cli-123" />);

    await waitFor(() => {
      expect(screen.getByTestId("generated-chart-leitura-section")).toBeDefined();
    });

    const section = screen.getByTestId("generated-chart-leitura-section");
    expect(section.className).toContain("col-span-full");
    expect(section.className).toContain("w-full");
  });
});
