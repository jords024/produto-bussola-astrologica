import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ComeceAqui from "@/components/ComeceAqui";
import { formatVideoDuration } from "@/components/TutorialFormModal";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  getBaseUrl: () => "http://localhost:8005",
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ComeceAqui Component", () => {
  const mockItems = [
    {
      id: "t1",
      title: "Bem vindos comunidade",
      description: "Conheça a Bússola Astrológica.",
      lesson_type: "video",
      video_source: "url",
      video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      text_content: "",
      duration: "01:19",
      sort_order: 0,
    },
    {
      id: "t2",
      title: "Passo a Passo Escrito",
      description: "Leitura rápida.",
      lesson_type: "text",
      video_source: "url",
      video_url: "",
      text_content: "Conteúdo completo do tutorial em texto.",
      duration: "",
      sort_order: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({ items: mockItems });
  });

  it("exibe playlist e alterna entre vídeo e tutorial em texto para o aluno", async () => {
    render(<ComeceAqui isAdmin={false} />);

    await waitFor(() => {
      expect(screen.getByText("Aulas de Tutorial (2)")).toBeDefined();
    });

    // Aluno não vê botão de criar
    expect(screen.queryByTestId("new-tutorial-btn")).toBeNull();

    // Título e duração do 1º item
    expect(screen.getByText("Conheça a Bússola Astrológica.")).toBeDefined();

    // Clica no tutorial em texto
    fireEvent.click(screen.getByTestId("tutorial-playlist-item-t2"));
    expect(screen.getByText("Conteúdo completo do tutorial em texto.")).toBeDefined();
  });

  it("permite ao admin criar novo tutorial em texto e excluir via popup", async () => {
    (api.post as any).mockResolvedValue({
      item: {
        id: "t3",
        title: "Novo Guia",
        description: "Resumo",
        lesson_type: "text",
        video_source: "url",
        video_url: "",
        text_content: "Texto do novo guia",
        duration: "",
        sort_order: 3,
      },
    });
    (api.delete as any).mockResolvedValue({ success: true });

    render(<ComeceAqui isAdmin={true} />);

    await waitFor(() => {
      expect(screen.getByTestId("new-tutorial-btn")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("new-tutorial-btn"));
    expect(screen.getByRole("dialog")).toBeDefined();

    fireEvent.click(screen.getByTestId("tutorial-type-text"));
    fireEvent.change(screen.getByTestId("tutorial-title-input"), { target: { value: "Novo Guia" } });
    fireEvent.change(screen.getByTestId("tutorial-text-content-input"), {
      target: { value: "Texto do novo guia" },
    });
    fireEvent.click(screen.getByTestId("tutorial-submit-btn"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/tutorials",
        expect.objectContaining({
          title: "Novo Guia",
          lesson_type: "text",
          text_content: "Texto do novo guia",
        })
      );
    });

    // Excluir o primeiro tutorial
    fireEvent.click(screen.getByLabelText("Excluir Bem vindos comunidade"));
    expect(screen.getByRole("dialog")).toBeDefined();
    fireEvent.click(screen.getByText("Confirmar Exclusão"));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/tutorials/t1");
    });
  });

  it("formata e extrai duração automaticamente (MM:SS) ao selecionar arquivo de vídeo", async () => {
    expect(formatVideoDuration(79)).toBe("01:19");
    expect(formatVideoDuration(270)).toBe("04:30");
    expect(formatVideoDuration(0)).toBe("");

    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:mock-video");
    URL.revokeObjectURL = vi.fn();

    const origCreateElement = document.createElement.bind(document);
    const spyCreateEl = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = origCreateElement(tagName) as any;
      if (tagName.toLowerCase() === "video") {
        Object.defineProperty(el, "duration", { value: 79, configurable: true });
        Object.defineProperty(el, "src", {
          set() {
            setTimeout(() => el.onloadedmetadata?.(), 0);
          },
        });
      }
      return el;
    });

    try {
      render(<ComeceAqui isAdmin={true} />);
      await waitFor(() => {
        expect(screen.getByTestId("new-tutorial-btn")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("new-tutorial-btn"));
      const fileInput = screen.getByTestId("tutorial-file-input") as HTMLInputElement;
      const fakeFile = new File(["video"], "aula.mp4", { type: "video/mp4" });
      fireEvent.change(fileInput, { target: { files: [fakeFile] } });

      await waitFor(() => {
        const durInput = screen.getByTestId("tutorial-duration-input") as HTMLInputElement;
        expect(durInput.value).toBe("01:19");
      });
    } finally {
      spyCreateEl.mockRestore();
      URL.createObjectURL = origCreateObjectURL;
      URL.revokeObjectURL = origRevokeObjectURL;
    }
  });
});
