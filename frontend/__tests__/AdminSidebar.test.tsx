import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminSidebar from "@/components/AdminSidebar";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("AdminSidebar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Modo Administrador (papel='admin')", () => {
    it("renderiza o logo, título Bússola Astrológica e subtítulo Painel de Gestão", () => {
      render(
        <AdminSidebar
          activeTab="home"
          onSelectTab={vi.fn()}
          onLogout={vi.fn()}
          papel="admin"
        />
      );

      expect(screen.getAllByText("Bússola Astrológica").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Painel de Gestão").length).toBeGreaterThan(0);
    });

    it("renderiza as categorias de gestão e seus botões", () => {
      render(
        <AdminSidebar
          activeTab="home"
          onSelectTab={vi.fn()}
          onLogout={vi.fn()}
          papel="admin"
        />
      );

      expect(screen.getAllByText("Painel de Gestão").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Segurança").length).toBeGreaterThan(0);

      expect(screen.getAllByRole("button", { name: /cadastrar mapa/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /pesquisa de clientes/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /histórico de gerações/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /financeiro/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /backup automático/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /sistema de logs/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /gestão de usuários/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /sair/i }).length).toBeGreaterThan(0);
    });

    it("chama onSelectTab ao clicar no botão Pesquisa de Clientes", () => {
      const handleSelect = vi.fn();
      render(
        <AdminSidebar
          activeTab="home"
          onSelectTab={handleSelect}
          onLogout={vi.fn()}
          papel="admin"
        />
      );

      const buttons = screen.getAllByRole("button", { name: /pesquisa de clientes/i });
      fireEvent.click(buttons[0]);
      expect(handleSelect).toHaveBeenCalledWith("pesquisa");
    });
  });

  describe("Modo Aluno (papel='client')", () => {
    it("renderiza as seções e abas exclusivas do aluno", () => {
      render(
        <AdminSidebar
          activeTab="home"
          onSelectTab={vi.fn()}
          onLogout={vi.fn()}
          papel="client"
        />
      );

      expect(screen.getAllByText("Sua bússola").length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /minha bússola/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /a leitura/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /diário de bordo/i }).length).toBeGreaterThan(0);
    });
  });

  describe("Responsividade e Drawer Móvel", () => {
    it("não renderiza o backdrop quando mobileOpen é falso", () => {
      render(
        <AdminSidebar
          activeTab="home"
          onSelectTab={vi.fn()}
          onLogout={vi.fn()}
          mobileOpen={false}
        />
      );

      expect(screen.queryByTestId("sidebar-mobile-backdrop")).toBeNull();
    });

    it("renderiza o backdrop e drawer quando mobileOpen é verdadeiro", () => {
      render(
        <AdminSidebar
          activeTab="home"
          onSelectTab={vi.fn()}
          onLogout={vi.fn()}
          mobileOpen={true}
        />
      );

      expect(screen.getByTestId("sidebar-mobile-backdrop")).toBeDefined();
      expect(screen.getByTestId("sidebar-mobile-drawer")).toBeDefined();
    });

    it("chama onCloseMobile ao clicar no backdrop", () => {
      const handleClose = vi.fn();
      render(
        <AdminSidebar
          activeTab="home"
          onSelectTab={vi.fn()}
          onLogout={vi.fn()}
          mobileOpen={true}
          onCloseMobile={handleClose}
        />
      );

      fireEvent.click(screen.getByTestId("sidebar-mobile-backdrop"));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("chama onCloseMobile ao clicar no botão fechar (✕) do drawer", () => {
      const handleClose = vi.fn();
      render(
        <AdminSidebar
          activeTab="home"
          onSelectTab={vi.fn()}
          onLogout={vi.fn()}
          mobileOpen={true}
          onCloseMobile={handleClose}
        />
      );

      const closeBtn = screen.getByRole("button", { name: /fechar menu/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("chama onSelectTab e onCloseMobile ao selecionar uma aba no menu mobile", () => {
      const handleSelect = vi.fn();
      const handleClose = vi.fn();

      render(
        <AdminSidebar
          activeTab="home"
          onSelectTab={handleSelect}
          onLogout={vi.fn()}
          mobileOpen={true}
          onCloseMobile={handleClose}
          papel="client"
        />
      );

      const drawer = screen.getByTestId("sidebar-mobile-drawer");
      const leituraBtn = drawer.querySelector("button:nth-of-type(2)");
      if (leituraBtn) {
        fireEvent.click(leituraBtn);
        expect(handleSelect).toHaveBeenCalled();
        expect(handleClose).toHaveBeenCalled();
      }
    });
  });

  describe("Usuário e Logout", () => {
    it("renderiza o card do usuário fornecido via prop currentUser", () => {
      render(
        <AdminSidebar
          activeTab="home"
          onSelectTab={vi.fn()}
          onLogout={vi.fn()}
          currentUser={{ name: "Aryaraj Fernandes", email: "aryarajunity@gmail.com" }}
        />
      );

      expect(screen.getAllByText("Aryaraj Fernandes").length).toBeGreaterThan(0);
      expect(screen.getAllByText("aryarajunity@gmail.com").length).toBeGreaterThan(0);
    });

    it("chama onLogout ao clicar no botão Sair", () => {
      const handleLogout = vi.fn();
      render(
        <AdminSidebar
          activeTab="home"
          onSelectTab={vi.fn()}
          onLogout={handleLogout}
        />
      );

      const sairBtns = screen.getAllByRole("button", { name: /sair/i });
      fireEvent.click(sairBtns[0]);
      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });
});
