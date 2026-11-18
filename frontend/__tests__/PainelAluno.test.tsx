import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import PainelAluno from "@/components/PainelAluno";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/components/AnaliseDoDia", () => ({
  default: ({ onAnaliseGerada }: { onAnaliseGerada?: () => void }) => (
    <div data-testid="analise-do-dia">
      <button onClick={() => onAnaliseGerada?.()}>Simular Nova Analise</button>
    </div>
  ),
}));

vi.mock("@/components/ColetaDadosBussola", () => ({
  default: () => <div>ColetaDadosBussola</div>,
}));

vi.mock("@/components/ChartZoomModal", () => ({
  default: () => <div>ChartZoomModal</div>,
}));

const MAPA_MOCK = {
  svg: "<svg>mapa</svg>",
  sun_sign: "Peixes",
  moon_sign: "Leão",
  rising_sign: "Virgem",
  status: "ready",
};

const DIARIO_MOCK = [
  {
    id: "item-1",
    data: "2026-10-30",
    data_fim: null,
    tipo: "dia",
    pergunta: "Como será o dia?",
    area: "relacao",
    sintese_preview: "Dia favorável para parcerias e decisões práticas.",
    planeta_destaque: "Marte",
    status: "ok",
    tem_sintese: true,
    contexto: {
      area: "relacao",
      pergunta: "Como será o dia?",
    },
    created_at: "2026-10-16T00:24:21.791011",
  },
];

// Gera 45 itens para testar paginação (máximo 20 por página -> 3 páginas)
const DIARIO_MOCK_45 = Array.from({ length: 45 }, (_, idx) => ({
  id: `item-${idx + 1}`,
  data: `2026-10-${String((idx % 28) + 1).padStart(2, "0")}`,
  data_fim: null,
  tipo: "dia" as const,
  pergunta: `Pergunta teste número ${idx + 1}`,
  area: "relacao",
  sintese_preview: `Preview da síntese ${idx + 1}`,
  planeta_destaque: "Marte",
  status: "ok",
  tem_sintese: true,
  contexto: {
    area: "relacao",
    pergunta: `Pergunta teste número ${idx + 1}`,
  },
  created_at: "2026-10-16T00:24:21.791011",
}));

describe("PainelAluno", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/members/chart") return Promise.resolve(MAPA_MOCK);
      if (url === "/members/analises") return Promise.resolve(DIARIO_MOCK);
      return Promise.resolve([]);
    });
  });

  it("recarrega as análises do diário ao abrir a aba diario", async () => {
    render(
      <PainelAluno
        area="diario"
        usuario={{ name: "Aryaraj Fernandes", email: "aryarajunity@gmail.com" }}
        onIrPara={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/members/analises");
    });

    expect(await screen.findByText("Diário de bordo")).toBeDefined();
    expect(await screen.findByText(/Como será o dia\?/)).toBeDefined();
    expect(screen.getByText("🤝 Relação e parceria")).toBeDefined();
    expect(screen.getByText(/Dia favorável para parcerias/)).toBeDefined();
  });

  it("atualiza o diário quando uma nova análise é gerada na leitura", async () => {
    render(
      <PainelAluno
        area="leitura"
        usuario={{ name: "Aryaraj Fernandes", email: "aryarajunity@gmail.com" }}
        onIrPara={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("analise-do-dia")).toBeDefined();
    });

    // Simula disparo da geração de análise dentro de AnaliseDoDia
    fireEvent.click(screen.getByText("Simular Nova Analise"));

    expect(api.get).toHaveBeenCalledWith("/members/analises");
  });

  it("pagina o diário de bordo com no máximo 20 itens por página", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/members/chart") return Promise.resolve(MAPA_MOCK);
      if (url === "/members/analises") return Promise.resolve(DIARIO_MOCK_45);
      return Promise.resolve([]);
    });

    // Mock scrollTo
    window.scrollTo = vi.fn();

    render(
      <PainelAluno
        area="diario"
        usuario={{ name: "Aryaraj Fernandes", email: "aryarajunity@gmail.com" }}
        onIrPara={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("pagination-controls")).toBeDefined();
    });

    // Página 1: itens 1 a 20 devem aparecer, item 21 não
    expect(screen.getByText(/"Pergunta teste número 1"/)).toBeDefined();
    expect(screen.getByText(/"Pergunta teste número 20"/)).toBeDefined();
    expect(screen.queryByText(/"Pergunta teste número 21"/)).toBeNull();

    // Indicador de página 1 / 3
    expect(screen.getByTestId("page-indicator").textContent).toContain("1 / 3");

    // Clica para próxima página
    fireEvent.click(screen.getByTestId("next-page-btn"));

    // Página 2: itens 21 a 40
    expect(await screen.findByText(/"Pergunta teste número 21"/)).toBeDefined();
    expect(screen.queryByText(/"Pergunta teste número 1"/)).toBeNull();
    expect(screen.getByTestId("page-indicator").textContent).toContain("2 / 3");
  });

  it("exibe o botão Ler um dia à direita de Editar Meus Dados", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.startsWith("/members/chart")) return Promise.resolve(MAPA_MOCK);
      if (url === "/members/analises") return Promise.resolve(DIARIO_MOCK);
      return Promise.resolve({ profiles: [] });
    });

    const onIrPara = vi.fn();
    render(
      <PainelAluno
        area="bussola"
        usuario={{ name: "Aryaraj Fernandes", email: "aryarajunity@gmail.com" }}
        onIrPara={onIrPara}
      />
    );

    const editarBtn = await screen.findByText("⚙️ Editar Meus Dados");
    const lerBtn = screen.getByText("Ler um dia →");
    expect(editarBtn.parentElement).toBe(lerBtn.parentElement);

    fireEvent.click(lerBtn);
    expect(onIrPara).toHaveBeenCalledWith("leitura");
  });
});
