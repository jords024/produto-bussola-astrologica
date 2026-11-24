import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GestaoUsuarios from "@/components/GestaoUsuarios";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe("GestaoUsuarios Component", () => {
  const mockUsersResponse = {
    total: 3,
    items: [
      {
        id: "1",
        name: "Admin Master",
        email: "admin@sirius.com",
        whatsapp: "5511999999999",
        role: "admin",
        is_active: true,
        is_super_admin: true,
        created_at: "2026-03-15T12:00:00Z",
        sun_sign: "Áries",
        birth_city: "São Paulo - SP",
      },
      {
        id: "2",
        name: "João Silva",
        email: "joao@exemplo.com",
        whatsapp: "5511888888888",
        role: "client",
        is_active: true,
        is_super_admin: false,
        created_at: "2026-03-20T15:30:00Z",
        sun_sign: "Touro",
        birth_city: "Curitiba - PR",
      },
      {
        id: "3",
        name: "Maria Santos",
        email: "maria@exemplo.com",
        whatsapp: null,
        role: "client",
        is_active: false,
        is_super_admin: false,
        created_at: "2026-03-25T18:00:00Z",
        sun_sign: null,
        birth_city: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue(mockUsersResponse);
  });

  it("carrega e renderiza os cards de métricas e os usuários da lista", async () => {
    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByText("Gestão de Usuários")).toBeDefined();
    });

    // Validar chamada da API
    expect(api.get).toHaveBeenCalledWith("/admin/users");

    // Validar Métricas
    expect(screen.getByText("Total de Usuários")).toBeDefined();
    expect(screen.getByText("Administradores")).toBeDefined();
    expect(screen.getByText("Alunos Registrados")).toBeDefined();

    // Validar Usuários renderizados
    expect(screen.getByText("Admin Master")).toBeDefined();
    expect(screen.getByText(/admin@sirius\.com/)).toBeDefined();
    expect(screen.getByText("João Silva")).toBeDefined();
    expect(screen.getByText(/joao@exemplo\.com/)).toBeDefined();
    expect(screen.getByText("Maria Santos")).toBeDefined();

    // Validar Badges
    expect(screen.getByTestId("badge-super-admin-1")).toBeDefined();
    expect(screen.getByText("👑 Super Admin")).toBeDefined();
    expect(screen.getByTestId("super-admin-tag-1")).toBeDefined();
    expect(screen.queryByTestId("edit-user-btn-1")).toBeNull();

    // Validar botão de edição para usuário comum
    expect(screen.getByTestId("edit-user-btn-2")).toBeDefined();
    expect(screen.getAllByText("Ativo").length).toBe(2);
    expect(screen.getByText("Inativo")).toBeDefined();
  });

  it("permite buscar usuários pelo campo de busca", async () => {
    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByText("Admin Master")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText("Buscar por nome ou e-mail...");
    fireEvent.change(searchInput, { target: { value: "joao" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/users?search=joao");
    });
  });

  it("permite filtrar usuários pelo dropdown de função (role)", async () => {
    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByText("Admin Master")).toBeDefined();
    });

    const roleSelect = screen.getByTestId("role-filter-select");
    fireEvent.change(roleSelect, { target: { value: "admin" } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/users?role=admin");
    });
  });

  it("permite atualizar a lista através do botão Atualizar", async () => {
    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByText("Admin Master")).toBeDefined();
    });

    const refreshButton = screen.getByTestId("refresh-users-btn");
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it("abre o modal de criação manual ao clicar no botão Criar Usuário", async () => {
    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByText("Admin Master")).toBeDefined();
    });

    const createBtn = screen.getByTestId("open-create-user-modal-btn");
    expect(createBtn).toBeDefined();
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByTestId("criar-usuario-modal-backdrop")).toBeDefined();
      expect(screen.getByText("Criar Usuário Manualmente")).toBeDefined();
    });
  });

  it("abre o modal de gerar convite ao clicar no botão Gerar Convite", async () => {
    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByText("Admin Master")).toBeDefined();
    });

    const inviteBtn = screen.getByTestId("open-generate-invite-modal-btn");
    expect(inviteBtn).toBeDefined();
    fireEvent.click(inviteBtn);

    await waitFor(() => {
      expect(screen.getByTestId("gerar-convite-modal-backdrop")).toBeDefined();
      expect(screen.getAllByText("Gerar Link de Convite").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("permite alternar entre as abas Usuários Cadastrados e Convites Gerados", async () => {
    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByTestId("tab-usuarios-btn")).toBeDefined();
      expect(screen.getByTestId("tab-convites-btn")).toBeDefined();
    });

    // Inicialmente na aba de usuários
    expect(screen.getByText("Total de Usuários")).toBeDefined();

    // Clicar na aba de convites
    fireEvent.click(screen.getByTestId("tab-convites-btn"));

    // Deve alternar para convites
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/invites");
    });

    // Clicar de volta na aba de usuários
    fireEvent.click(screen.getByTestId("tab-usuarios-btn"));

    await waitFor(() => {
      expect(screen.getByText("Total de Usuários")).toBeDefined();
    });
  });

  it("abre o modal de edição ao clicar no botão Editar de um usuário comum", async () => {
    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-btn-2")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("edit-user-btn-2"));

    await waitFor(() => {
      expect(screen.getByTestId("editar-usuario-modal-backdrop")).toBeDefined();
      expect(screen.getByText("Editar Usuário")).toBeDefined();
    });
  });

  it("permite selecionar múltiplos usuários não super admin e exclui em massa após confirmação", async () => {
    (api.delete as any).mockResolvedValue({
      data: { success: true, deleted_count: 2 },
    });

    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByText("João Silva")).toBeDefined();
    });

    // Super admin não deve ter checkbox de seleção
    expect(screen.queryByTestId("select-user-1")).toBeNull();

    // Usuário comum deve ter checkbox
    const chkUser2 = screen.getByTestId("select-user-2") as HTMLInputElement;
    const chkUser3 = screen.getByTestId("select-user-3") as HTMLInputElement;
    expect(chkUser2.checked).toBe(false);
    expect(chkUser3.checked).toBe(false);

    // Selecionar usuário 2
    fireEvent.click(chkUser2);
    expect(chkUser2.checked).toBe(true);

    // Botão de excluir selecionados deve aparecer na barra de ações em lote
    await waitFor(() => {
      expect(screen.getByTestId("batch-delete-users-btn")).toBeDefined();
      expect(screen.getByText(/1 selecionado/)).toBeDefined();
    });

    // Selecionar usuário 3 também
    fireEvent.click(chkUser3);
    await waitFor(() => {
      expect(screen.getByText(/2 selecionado/)).toBeDefined();
    });

    // Clicar no botão de exclusão em massa
    const deleteBatchBtn = screen.getByTestId("batch-delete-users-btn");
    fireEvent.click(deleteBatchBtn);

    // Modal de confirmação deve abrir
    await waitFor(() => {
      expect(screen.getByTestId("confirm-delete-modal-backdrop")).toBeDefined();
      expect(screen.getByText("Excluir Usuários Selecionados")).toBeDefined();
    });

    // Confirmar a exclusão
    const confirmBtn = screen.getByTestId("confirm-delete-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/admin/users/batch", {
        ids: ["2", "3"],
      });
    });
  });

  it("permite selecionar e desmarcar todos os usuários elegíveis da página via checkbox mestre", async () => {
    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByTestId("select-all-users-btn")).toBeDefined();
    });

    const masterCheckbox = screen.getByTestId("select-all-users-btn") as HTMLInputElement;
    expect(masterCheckbox.checked).toBe(false);

    // Clicar para selecionar todos da página
    fireEvent.click(masterCheckbox);

    const chkUser2 = screen.getByTestId("select-user-2") as HTMLInputElement;
    const chkUser3 = screen.getByTestId("select-user-3") as HTMLInputElement;
    expect(chkUser2.checked).toBe(true);
    expect(chkUser3.checked).toBe(true);

    // Clicar novamente para desselecionar todos
    fireEvent.click(masterCheckbox);
    expect(chkUser2.checked).toBe(false);
    expect(chkUser3.checked).toBe(false);
  });

  it("permite gerar link de redefinição de senha ao clicar no botão Redefinir Senha", async () => {
    (api.post as any).mockResolvedValue({
      success: true,
      reset_path: "/redefinir-senha?token=jwt-secret-token",
    });

    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByTestId("reset-user-pwd-btn-2")).toBeDefined();
    });

    // Clicar em Redefinir Senha no usuário 2
    fireEvent.click(screen.getByTestId("reset-user-pwd-btn-2"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/users/2/reset-link");
      expect(screen.getByTestId("redefinir-senha-modal-backdrop")).toBeDefined();
      expect(screen.getByText("Link de Redefinição de Senha")).toBeDefined();
    });
  });

  it("permite excluir um usuário individualmente pelo botão de excluir", async () => {
    (api.delete as any).mockResolvedValue({
      success: true,
      deleted_count: 1,
    });

    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByTestId("delete-user-btn-2")).toBeDefined();
    });

    // Clicar no botão excluir do usuário 2
    fireEvent.click(screen.getByTestId("delete-user-btn-2"));

    // Modal de confirmação deve abrir
    await waitFor(() => {
      expect(screen.getByTestId("confirm-delete-modal-backdrop")).toBeDefined();
      expect(screen.getByText("Excluir Usuário")).toBeDefined();
    });

    // Confirmar a exclusão
    fireEvent.click(screen.getByTestId("confirm-delete-btn"));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/admin/users/batch", {
        ids: ["2"],
      });
    });
  });

  it("garante que o Super Admin sempre seja renderizado no topo como o primeiro usuário", async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes("/admin/users")) {
        return Promise.resolve({
          total: 2,
          items: [
            {
              id: "aluno-1",
              name: "Aluno Anterior",
              email: "aluno@sirius.com",
              role: "client",
              is_active: true,
              is_super_admin: false,
              created_at: "2026-03-25T12:00:00Z",
            },
            {
              id: "super-admin-1",
              name: "Aryaraj Super Admin",
              email: "aryarajmarketing@gmail.com",
              role: "admin",
              is_active: true,
              is_super_admin: true,
              created_at: "2026-03-10T12:00:00Z",
            },
          ],
        });
      }
      return Promise.resolve({ total: 0, items: [] });
    });

    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByTestId("user-row-super-admin-1")).toBeDefined();
    });

    // Como o Super Admin foi ordenado no topo, ele é o primeiro elemento na listagem
    const rows = screen.getAllByTestId(/^user-row-/);
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute("data-testid")).toBe("user-row-super-admin-1");
  });

  it("conta apenas alunos reais em Alunos Registrados, separando Administradores e Alunos Internos", async () => {
    (api.get as any).mockResolvedValue({
      total: 4,
      items: [
        ...mockUsersResponse.items,
        {
          id: "4",
          name: "Equipe Interna",
          email: "interno@exemplo.com",
          whatsapp: null,
          role: "internal_client",
          is_active: true,
          is_super_admin: false,
          created_at: "2026-03-26T18:00:00Z",
          sun_sign: null,
          birth_city: null,
        },
      ],
    });

    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-total-users").textContent).toBe("4");
    });

    expect(screen.getByTestId("metric-admin-users").textContent).toBe("1");
    expect(screen.getByTestId("metric-real-clients").textContent).toBe("2");
    expect(screen.getByTestId("metric-internal-clients").textContent).toBe("1");
  });

  it("permite filtrar usuários por data de criação e alterar a ordenação no dropdown", async () => {
    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByText("Admin Master")).toBeDefined();
    });

    const startDateInput = screen.getByTestId("start-date-filter-input");
    const endDateInput = screen.getByTestId("end-date-filter-input");
    const sortSelect = screen.getByTestId("sort-order-select") as HTMLSelectElement;

    expect(sortSelect.value).toBe("desc");

    fireEvent.change(startDateInput, { target: { value: "2026-03-01" } });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/users?start_date=2026-03-01");
    });

    fireEvent.change(endDateInput, { target: { value: "2026-03-31" } });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/admin/users?start_date=2026-03-01&end_date=2026-03-31");
    });

    fireEvent.change(sortSelect, { target: { value: "asc" } });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/admin/users?start_date=2026-03-01&end_date=2026-03-31&sort_order=asc"
      );
    });

    const clearBtn = screen.getByTestId("clear-users-filters-btn");
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(sortSelect.value).toBe("desc");
      expect((startDateInput as HTMLInputElement).value).toBe("");
      expect((endDateInput as HTMLInputElement).value).toBe("");
      expect(api.get).toHaveBeenLastCalledWith("/admin/users");
    });
  });

  it("exibe no card do usuário as leituras realizadas, quanto falta na franquia e transição para o limite diário", async () => {
    (api.get as any).mockResolvedValueOnce({
      total: 2,
      items: [
        {
          id: "u-phase1",
          name: "Gabriela Fase 1",
          email: "gabi1@exemplo.com",
          role: "client",
          is_active: true,
          is_super_admin: false,
          max_total_requests: 300,
          daily_request_limit: 5,
          request_limit_mode: "quota_then_daily",
          total_requests_used: 45,
          daily_requests_used: 3,
        },
        {
          id: "u-phase2",
          name: "Gabriela Fase 2",
          email: "gabi2@exemplo.com",
          role: "client",
          is_active: true,
          is_super_admin: false,
          max_total_requests: 300,
          daily_request_limit: 5,
          request_limit_mode: "quota_then_daily",
          total_requests_used: 300,
          daily_requests_used: 2,
        },
      ],
    });

    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByTestId("badge-limits-u-phase1")).toBeDefined();
    });

    expect(screen.getByTestId("badge-limits-u-phase1").textContent).toContain(
      "45/300 realizadas (faltam 255) → 5/dia"
    );
    expect(screen.getByTestId("badge-limits-u-phase2").textContent).toContain(
      "Franquia esgotada (300/300) · Hoje: 2/5"
    );
  });

  it("permite selecionar múltiplos usuários e editar limites de IA em lote", async () => {
    (api.put as any).mockResolvedValueOnce({
      success: true,
      updated_count: 2,
      skipped_admin_count: 0,
      message: "Limites de IA atualizados para 2 usuário(s).",
    });

    render(<GestaoUsuarios />);

    await waitFor(() => {
      expect(screen.getByTestId("select-user-2")).toBeDefined();
    });

    // Seleciona João (id "2") e Maria (id "3")
    fireEvent.click(screen.getByTestId("select-user-2"));
    fireEvent.click(screen.getByTestId("select-user-3"));

    const batchLimitsBtn = screen.getByTestId("batch-edit-limits-btn");
    fireEvent.click(batchLimitsBtn);

    expect(screen.getByTestId("batch-edit-limits-modal")).toBeDefined();
    expect(screen.getByText(/2 usuário\(s\)/i)).toBeDefined();

    fireEvent.change(screen.getByTestId("total-limit-input"), { target: { value: "200" } });
    fireEvent.change(screen.getByTestId("daily-limit-input"), { target: { value: "4" } });

    fireEvent.click(screen.getByTestId("batch-edit-limits-submit-btn"));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/admin/users/batch-limits", {
        ids: ["2", "3"],
        request_limit_mode: "quota_then_daily",
        unlimited_daily_requests: false,
        daily_request_limit: 4,
        unlimited_total_requests: false,
        max_total_requests: 200,
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId("batch-edit-limits-modal")).toBeNull();
    });
  });
});



