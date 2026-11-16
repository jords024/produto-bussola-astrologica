import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminPage from "@/app/(admin)/admin/page";
import { api } from "@/lib/api";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/components/PesquisaClientes", () => ({
  default: () => <div data-testid="pesquisa-clientes-mock">Pesquisa de Clientes Mock</div>,
}));

vi.mock("@/components/ClientDrawer", () => ({
  default: () => null,
}));

vi.mock("@/components/LeadQuestionnaire", () => ({
  default: () => <div data-testid="lead-questionnaire-mock">Formulário de Cadastro Mock</div>,
}));

vi.mock("@/components/HistoricoPesquisas", () => ({
  default: () => <div data-testid="historico-pesquisas-mock">Histórico Mock</div>,
}));

vi.mock("@/components/GestaoUsuarios", () => ({
  default: () => <div data-testid="gestao-usuarios-mock">Gestão de Usuários Mock</div>,
}));

vi.mock("@/components/backup/BackupAutomatico", () => ({
  default: () => <div data-testid="backup-automatico-mock">Conteúdo Backup Automático</div>,
}));

vi.mock("@/components/GerenciamentoLogs", () => ({
  default: () => <div data-testid="gerenciamento-logs-mock">Conteúdo Sistema de Logs</div>,
}));

describe("AdminLayout Navegação e Painel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("sirius_token", "fake-admin-token");
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes("/admin/dashboard")) {
        return Promise.resolve({
          total_clients: 12,
          new_today: 3,
          this_week: 8,
          pending: 2,
          ready: 10,
          conversion_rate: 83,
          distribution_by_sign: [{ sign: "Áries", count: 4 }],
        });
      }
      if (url.includes("/auth/me")) {
        return Promise.resolve({
          name: "Aryaraj Fernandes",
          email: "aryarajunity@gmail.com",
          role: "admin",
        });
      }
      return Promise.resolve({});
    });
  });

  it("renderiza a barra lateral com Bússola Astrológica e os botões de administração", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Bússola Astrológica").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Aryaraj Fernandes").length).toBeGreaterThan(0);
      expect(screen.getAllByText("aryarajunity@gmail.com").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("Painel de Gestão").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /cadastrar mapa/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /pesquisa de clientes/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /histórico de gerações/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /backup automático/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /sistema de logs/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /gestão de usuários/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /sair/i }).length).toBeGreaterThan(0);
  });

  it("renderiza o cabeçalho superior e o botão hamburger para mobile", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /abrir menu de navegação/i })).toBeDefined();
    });

    expect(screen.getAllByRole("heading", { name: /cadastrar mapa/i }).length).toBeGreaterThan(0);
  });

  it("abre o drawer mobile ao clicar no botão hamburger e fecha ao clicar no backdrop", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /abrir menu de navegação/i })).toBeDefined();
    });

    // Clica no botão hamburger
    const hamburgerBtn = screen.getByRole("button", { name: /abrir menu de navegação/i });
    fireEvent.click(hamburgerBtn);

    // O backdrop e drawer móvel devem estar visíveis
    expect(screen.getByTestId("sidebar-mobile-backdrop")).toBeDefined();
    expect(screen.getByTestId("sidebar-mobile-drawer")).toBeDefined();

    // Clica no backdrop para fechar
    fireEvent.click(screen.getByTestId("sidebar-mobile-backdrop"));
    expect(screen.queryByTestId("sidebar-mobile-backdrop")).toBeNull();
  });

  it("permite navegar para a aba Pesquisa de Clientes ao clicar no menu", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /pesquisa de clientes/i }).length).toBeGreaterThan(0);
    });

    const pesquisaBtns = screen.getAllByRole("button", { name: /pesquisa de clientes/i });
    fireEvent.click(pesquisaBtns[0]);

    await waitFor(() => {
      expect(screen.getByTestId("pesquisa-clientes-mock")).toBeDefined();
    });
  });

  it("abre o popup de confirmação ao clicar em Sair e desloga apenas ao confirmar", async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /sair/i }).length).toBeGreaterThan(0);
    });

    // Modal de confirmação não deve estar presente inicialmente
    expect(screen.queryByText("Encerrar Sessão")).toBeNull();

    // Clica em Sair na barra lateral
    const sairBtns = screen.getAllByRole("button", { name: /sair/i });
    fireEvent.click(sairBtns[0]);

    // Popup deve aparecer centralizado
    expect(screen.getByText("Encerrar Sessão")).toBeDefined();
    expect(
      screen.getByText(/Tem certeza de que deseja sair do painel/i)
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /confirmar saída/i })).toBeDefined();

    // Clica em Cancelar: modal fecha e token continua presente
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByText("Encerrar Sessão")).toBeNull();
    expect(localStorage.getItem("sirius_token")).toBe("fake-admin-token");
    expect(mockPush).not.toHaveBeenCalled();

    // Clica em Sair novamente e depois em Confirmar Saída
    fireEvent.click(sairBtns[0]);
    expect(screen.getByText("Encerrar Sessão")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /confirmar saída/i }));
    expect(screen.queryByText("Encerrar Sessão")).toBeNull();
    expect(localStorage.getItem("sirius_token")).toBeNull();
    expect(localStorage.getItem("bussola_admin_active_tab")).toBeNull();
    expect(mockPush).toHaveBeenCalledWith("/admin/login");
  });

  it("persiste a última aba aberta no localStorage e restaura ao recarregar a página", async () => {
    localStorage.removeItem("bussola_admin_active_tab");
    window.history.replaceState(null, "", "/admin");

    const { unmount } = render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Gestão de Usuários/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText(/Gestão de Usuários/i)[0]);
    expect(localStorage.getItem("bussola_admin_active_tab")).toBe("gestao_usuarios");
    expect(window.location.search).toContain("tab=gestao_usuarios");

    unmount();
    window.history.replaceState(null, "", "/admin");

    render(<AdminPage />);
    await waitFor(() => {
      expect(screen.getByTestId("gestao-usuarios-mock")).toBeDefined();
    });

    localStorage.removeItem("bussola_admin_active_tab");
    window.history.replaceState(null, "", "/");
  });
});
