import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AnaliseDoDia from "@/components/AnaliseDoDia";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from "@/lib/api";

const ANALISE = {
  id: "a1",
  data: "2026-10-06",
  sintese: "O dia junta duas coisas que costumam brigar.",
  svg: '<svg data-testid="roda"><circle cx="5" cy="5" r="4" /></svg>',
  status: "ok",
  hora_de_nascimento_conhecida: true,
  posicoes: [
    {
      planeta: "Moon", planeta_pt: "Lua", casa: 5, signo: "Leão",
      retrogrado: false, ate: "2026-10-07",
      texto: "O sentimento pede saída criativa.",
    },
    {
      planeta: "Venus", planeta_pt: "Vênus", casa: 7, signo: "Escorpião",
      retrogrado: true, ate: null,
      texto: "Facilita o encontro com o outro.",
    },
  ],
};

describe("AnaliseDoDia", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue([]);
    vi.mocked(api.post).mockReset().mockResolvedValue(ANALISE);
  });

  it("abre com o seletor de data e sem leitura nenhuma", async () => {
    render(<AnaliseDoDia nome="Jordão Silva" />);
    expect(screen.getByLabelText(/Data Inicial/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /ver leitura do dia/i })).toBeDefined();
    expect(screen.queryByText(/sentimento pede/)).toBeNull();
  });

  it("pede a análise da data escolhida e mostra as posições", async () => {
    render(<AnaliseDoDia nome="Jordão Silva" />);

    fireEvent.change(screen.getByLabelText(/Data Inicial/i), { target: { value: "2026-10-06" } });
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      "/members/analise", { data: "2026-10-06" },
    ));

    expect(await screen.findByText(/O dia junta duas coisas/)).toBeDefined();
    expect(screen.getByText("O sentimento pede saída criativa.")).toBeDefined();
    expect(screen.getByText("Facilita o encontro com o outro.")).toBeDefined();
  });

  it("mostra a área da vida, e o termo técnico só como legenda", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));

    expect(await screen.findByText("criar e se expor")).toBeDefined();
    expect(screen.getByText("o outro e parcerias")).toBeDefined();
    const legenda = screen.getByText(/Leão, casa 5/);
    expect(legenda.textContent).toContain("Leão, casa 5");
  });

  it("escreve por extenso a data lida e a validade de cada posição", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));

    expect(await screen.findByText(/6 de outubro de 2026/)).toBeDefined();
    expect(screen.getByText("até 07/10")).toBeDefined();
  });

  it("explica o retrógrado sem usar a palavra no lugar da explicação", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));

    expect(await screen.findByText(/retrógrado/i)).toBeDefined();
  });

  it("avisa quando a hora de nascimento não é conhecida", async () => {
    vi.mocked(api.post).mockResolvedValue({ ...ANALISE, hora_de_nascimento_conhecida: false });
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));

    expect(await screen.findByText(/usamos meio-dia padrão/i)).toBeDefined();
  });

  it("mostra as posições mesmo quando a síntese não foi escrita", async () => {
    vi.mocked(api.post).mockResolvedValue({ ...ANALISE, sintese: "", status: "sem_ia" });
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));

    expect(await screen.findByText("O sentimento pede saída criativa.")).toBeDefined();
    expect(screen.getByText(/As cinco posições do dia estão calculadas/i)).toBeDefined();
  });

  it("mostra o erro do servidor em vez de uma tela vazia", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Faltam dados de nascimento para calcular: latitude."));
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));

    expect(await screen.findByText(/Faltam dados de nascimento/)).toBeDefined();
  });

  it("o desenho fica atrás de um clique, não aberto na cara da pessoa", async () => {
    render(<AnaliseDoDia nome="Jordão" />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));

    const abrir = await screen.findByText(/Visualizar Mapa Técnico/i);
    expect(screen.queryByTestId("roda")).toBeNull();

    fireEvent.click(abrir);
    expect(screen.getByTestId("roda")).toBeDefined();
  });
});

describe("AnaliseDoDia — os aspectos ao mapa da pessoa", () => {
  const COM_ASPECTOS = {
    ...ANALISE,
    posicoes: [
      {
        planeta: "Venus", planeta_pt: "Vênus", casa: 10, signo: "Escorpião",
        grau: 6, retrogrado: true, ate: "2026-10-19",
        texto: "Seu trabalho é bem visto agora.",
        prioridade: 19.6, destaque: true,
        aspectos: [
          {
            aspecto: "square", aspecto_pt: "em atrito com", faz: "cria atrito, e atrito obriga a decidir",
            ponto: "Ascendant", ponto_pt: "seu Ascendente",
            ponto_significa: "como você se apresenta e o seu corpo",
            orbe: 0.8, aplicando: true, exato: true, forca: 19.6,
          },
        ],
      },
      {
        planeta: "Mars", planeta_pt: "Marte", casa: 7, signo: "Leão",
        grau: 8, retrogrado: false, ate: null,
        texto: "O atrito é com o outro.",
        prioridade: 0, destaque: false, aspectos: [],
      },
    ],
  };

  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue([]);
    vi.mocked(api.post).mockReset().mockResolvedValue(COM_ASPECTOS);
  });

  it("mostra o que o trânsito bate no mapa dela, em linguagem de vida", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));

    expect(await screen.findByText(/No seu mapa, isso bate em/i)).toBeDefined();
    expect(screen.getByText(/como você se apresenta e o seu corpo/)).toBeDefined();
    expect(screen.getByText(/em atrito com seu Ascendente/)).toBeDefined();
  });

  it("marca o planeta mais forte do dia", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));
    expect(await screen.findByText(/O Mais Forte de Hoje/i)).toBeDefined();
  });

  it("diz se o aspecto está no pico, apertando ou afrouxando", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));
    expect(await screen.findByText(/no pico/i)).toBeDefined();
  });

  it("mostra o grau exato do planeta", async () => {
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));
    expect(await screen.findByText(/6° de Escorpião, casa 10/)).toBeDefined();
  });

  it("não quebra numa análise gravada antes dos aspectos existirem", async () => {
    const antiga = {
      ...ANALISE,
      posicoes: [{
        planeta: "Moon", planeta_pt: "Lua", casa: 5, signo: "Leão",
        retrogrado: false, ate: null, texto: "O sentimento pede saída criativa.",
      }],
    };
    vi.mocked(api.post).mockResolvedValue(antiga);
    render(<AnaliseDoDia />);
    fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));

    expect(await screen.findByText("O sentimento pede saída criativa.")).toBeDefined();
    expect(screen.queryByText(/No seu mapa, isso bate em/i)).toBeNull();
  });

  it("bloqueia o uso da IA e exibe aviso para falar com o suporte quando a conta expirou", () => {
    render(<AnaliseDoDia accessExpired={true} />);

    const banner = screen.getByTestId("access-expired-banner");
    expect(banner.textContent).toContain("Sua conta expirou");
    expect(banner.textContent).toContain("suporte");

    const submitBtn = screen.getByRole("button", { name: /ver leitura do dia/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it("abre popup com detalhes ao clicar no histórico e carrega do banco sem regerar", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/members/analises") {
        return Promise.resolve([
          {
            id: "hist-1",
            data: "2026-11-16",
            area: "financas",
            pergunta: "Tenho reunião importante hoje?",
            profile_id: "p1",
            profile_name: "Sandra Alves",
            sintese_preview: "Prévia salva...",
            tem_sintese: true,
          },
        ]);
      }
      if (url === "/members/areas") {
        return Promise.resolve([{ id: "financas", rotulo: "Dinheiro e valor" }]);
      }
      if (url === "/members/analises/hist-1") {
        return Promise.resolve({
          ...ANALISE,
          id: "hist-1",
          data: "2026-11-16",
          contexto: { area: "financas", pergunta: "Tenho reunião importante hoje?" },
          sintese: "Leitura carregada diretamente do banco.",
        });
      }
      return Promise.resolve({});
    });

    render(<AnaliseDoDia nome="Aryaraj" />);

    const chip = await screen.findByTestId("historico-chip-hist-1");
    fireEvent.click(chip);

    // Popup exibe os detalhes antes de abrir
    expect(screen.getByTestId("historico-consulta-modal")).toBeDefined();
    expect(screen.getByText(/Sandra Alves/)).toBeDefined();
    expect(screen.getByText("16/11/2026")).toBeDefined();
    expect(screen.getAllByText("Dinheiro e valor").length).toBeGreaterThan(0);
    expect(screen.getByText("Tenho reunião importante hoje?")).toBeDefined();

    // Ao confirmar, busca GET /members/analises/hist-1 e NÃO chama POST /members/analise
    fireEvent.click(screen.getByTestId("confirm-open-historico-btn"));

    expect(await screen.findByText("Leitura carregada diretamente do banco.")).toBeDefined();
    expect(api.get).toHaveBeenCalledWith("/members/analises/hist-1");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("limita chips rápidos a 6 itens e abre modal completo com busca e filtros", async () => {
    const manyItems = Array.from({ length: 8 }, (_, idx) => ({
      id: `h-${idx + 1}`,
      data: `2026-11-${String(10 + idx).padStart(2, "0")}`,
      area: idx % 2 === 0 ? "carreira" : "financas",
      pergunta: idx === 7 ? "Pergunta secreta final" : `Pergunta ${idx + 1}`,
      profile_id: idx === 7 ? "p1" : null,
      profile_name: idx === 7 ? "Sandra Alves" : null,
      tem_sintese: true,
    }));

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/members/analises") return Promise.resolve(manyItems);
      if (url === "/members/areas") {
        return Promise.resolve([
          { id: "carreira", rotulo: "Carreira e trabalho" },
          { id: "financas", rotulo: "Dinheiro e valor" },
        ]);
      }
      if (url === "/members/analises/h-8") {
        return Promise.resolve({
          ...ANALISE,
          id: "h-8",
          data: "2026-11-17",
          sintese: "Leitura do modal completo.",
        });
      }
      return Promise.resolve({});
    });

    render(<AnaliseDoDia nome="Aryaraj" />);

    const openAllBtn = await screen.findByTestId("open-all-historico-btn");
    expect(openAllBtn.textContent).toContain("Ver todo o histórico (8)");
    // Apenas 6 chips rápidos na tela principal
    expect(screen.queryByTestId("historico-chip-h-7")).toBeNull();

    fireEvent.click(openAllBtn);
    expect(screen.getByTestId("historico-completo-modal")).toBeDefined();

    // Filtra por área (financas) e por data específica
    fireEvent.change(screen.getByTestId("historico-modal-area-filter"), {
      target: { value: "financas" },
    });
    expect(screen.getByText("Exibindo 4 de 8 consulta(s)")).toBeDefined();

    fireEvent.change(screen.getByTestId("historico-modal-date-filter"), {
      target: { value: "2026-11-17" },
    });
    expect(screen.getByText("Exibindo 1 de 8 consulta(s)")).toBeDefined();

    // Limpa área e data e filtra pelo texto da pergunta
    fireEvent.change(screen.getByTestId("historico-modal-area-filter"), {
      target: { value: "all" },
    });
    fireEvent.click(screen.getByTestId("clear-historico-date-btn"));

    fireEvent.change(screen.getByTestId("historico-modal-search"), {
      target: { value: "secreta final" },
    });
    expect(screen.getByText("Exibindo 1 de 8 consulta(s)")).toBeDefined();

    // Abre a leitura filtrada
    fireEvent.click(screen.getByText("Abrir Leitura"));
    expect(await screen.findByText("Leitura do modal completo.")).toBeDefined();
    expect(api.get).toHaveBeenCalledWith("/members/analises/h-8");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("avança a etapa de carregamento após 3.5s sem lançar ReferenceError", async () => {
    vi.useFakeTimers();
    let resolvePost: (v: unknown) => void;
    vi.mocked(api.post).mockImplementation(
      () => new Promise((resolve) => { resolvePost = resolve; })
    );

    try {
      render(<AnaliseDoDia />);
      fireEvent.click(screen.getByRole("button", { name: /ver leitura do dia/i }));

      await vi.advanceTimersByTimeAsync(3600);
      expect(screen.getByTestId("analise-loading-modal")).toBeDefined();
      expect(screen.getByRole("status").textContent).toContain("Calculando o movimento dos astros");

      resolvePost!(ANALISE);
    } finally {
      vi.useRealTimers();
    }
  });
});
