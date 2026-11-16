import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import LeadQuestionnaire from "@/components/LeadQuestionnaire";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("LeadQuestionnaire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes("/admin/clients")) return Promise.resolve({ items: [] });
      if (url.includes("/geocoding/search")) return Promise.resolve([]);
      return Promise.resolve({});
    });
  });

  it("renderiza o formulário com os campos obrigatórios", async () => {
    render(<LeadQuestionnaire papel="admin" />);

    expect(screen.getByText(/Dados de nascimento do cliente/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Ex: Gabriel Moreira Silva/i)).toBeDefined();
    expect(screen.getByText(/Salvar dados do cliente/i)).toBeDefined();
  });

  it("carrega automaticamente as informações do lead previamente salvo", async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes("/admin/clients")) {
        return Promise.resolve({
          items: [
            {
              id: "lead-123",
              name: "Aryaraj Alves Fernandes",
              birth_date: "1998-03-09",
              birth_time: "18:35:00",
              birth_country: "Brasil",
              birth_state: "CE",
              birth_city: "Fortaleza",
            },
          ],
        });
      }
      return Promise.resolve([]);
    });

    render(<LeadQuestionnaire papel="admin" />);

    await waitFor(() => {
      const inputNome = screen.getByPlaceholderText(/Ex: Gabriel Moreira Silva/i) as HTMLInputElement;
      expect(inputNome.value).toBe("Aryaraj Alves Fernandes");
    });

    expect(screen.getByText(/Informações carregadas do cadastro salvo/i)).toBeDefined();
    expect(screen.getByText(/Cadastrado/i)).toBeDefined();

    const cityInput = screen.getByPlaceholderText(/Ex: Fortaleza, Campinas/i) as HTMLInputElement;
    expect(cityInput.value).toBe("Fortaleza");
  });

  it("não exibe botão de cadastrar outro lead e mantém os campos editáveis", async () => {
    render(<LeadQuestionnaire papel="admin" />);

    expect(screen.queryByText(/Cadastrar Outro Lead/i)).toBeNull();
    expect(screen.getByText(/Salvar dados do cliente/i)).toBeDefined();
  });

  it("exibe a latitude e longitude abaixo do campo de cidade quando disponíveis", async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes("/admin/clients")) {
        return Promise.resolve({
          items: [
            {
              id: "lead-123",
              name: "Aryaraj Alves Fernandes",
              birth_date: "1998-03-09",
              birth_time: "18:35:00",
              birth_country: "Brasil",
              birth_state: "CE",
              birth_city: "Fortaleza",
              lat: -3.71722,
              lng: -38.54306,
            },
          ],
        });
      }
      return Promise.resolve([]);
    });

    render(<LeadQuestionnaire />);

    await waitFor(() => {
      const coordsEl = screen.getByTestId("lead-coordinates");
      expect(coordsEl).toBeDefined();
      expect(coordsEl.textContent).toContain("-3.71722");
      expect(coordsEl.textContent).toContain("-38.54306");
      expect(coordsEl.textContent).toContain("Latitude");
      expect(coordsEl.textContent).toContain("Longitude");
    });
  });
});
