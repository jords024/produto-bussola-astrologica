import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import EditarUsuarioModal from "@/components/EditarUsuarioModal";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    put: vi.fn(),
  },
}));

vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("EditarUsuarioModal Component", () => {
  const mockRegularUser = {
    id: "user-123",
    name: "João Silva",
    email: "joao@exemplo.com",
    whatsapp: "5511999998888",
    role: "client",
    is_active: true,
    is_super_admin: false,
  };

  const mockSuperAdmin = {
    id: "super-1",
    name: "Aryaraj",
    email: "aryarajmarketing@gmail.com",
    whatsapp: null,
    role: "admin",
    is_active: true,
    is_super_admin: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não renderiza quando isOpen é false", () => {
    const { container } = render(
      <EditarUsuarioModal isOpen={false} user={mockRegularUser} onClose={vi.fn()} onUserUpdated={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("exibe aviso de proteção e bloqueia formulário se o usuário for Super Admin", () => {
    render(
      <EditarUsuarioModal isOpen={true} user={mockSuperAdmin} onClose={vi.fn()} onUserUpdated={vi.fn()} />
    );

    expect(screen.getByTestId("super-admin-protected-warning")).toBeDefined();
    expect(screen.getByText(/Super Admin do Sistema/)).toBeDefined();
    expect(screen.queryByTestId("edit-user-name-input")).toBeNull();
  });

  it("preenche os campos do usuário regular e permite salvar alterações", async () => {
    (api.put as any).mockResolvedValue({
      success: true,
      message: "Usuário atualizado com sucesso.",
    });

    const onUserUpdatedMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <EditarUsuarioModal
        isOpen={true}
        user={mockRegularUser}
        onClose={onCloseMock}
        onUserUpdated={onUserUpdatedMock}
      />
    );

    const nameInput = screen.getByTestId("edit-user-name-input") as HTMLInputElement;
    expect(nameInput.value).toBe("João Silva");

    // Alterar nome
    fireEvent.change(nameInput, { target: { value: "João da Silva Sauro" } });

    // Alterar cargo para Admin
    fireEvent.click(screen.getByTestId("edit-role-admin-btn"));

    // Submeter formulário
    fireEvent.click(screen.getByTestId("save-edit-user-btn"));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/admin/users/user-123",
        expect.objectContaining({
          name: "João da Silva Sauro",
          email: "joao@exemplo.com",
          role: "admin",
          is_active: true,
        })
      );
    });

    expect(onUserUpdatedMock).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("chama onClose ao clicar no botão fechar ou cancelar", () => {
    const onCloseMock = vi.fn();
    render(
      <EditarUsuarioModal
        isOpen={true}
        user={mockRegularUser}
        onClose={onCloseMock}
        onUserUpdated={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("cancel-edit-user-btn"));
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("close-edit-user-modal-btn"));
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });

  it("não deve conter o campo de nova senha no formulário de edição", () => {
    render(
      <EditarUsuarioModal
        isOpen={true}
        user={mockRegularUser}
        onClose={vi.fn()}
        onUserUpdated={vi.fn()}
      />
    );
    expect(screen.queryByTestId("edit-user-password-input")).toBeNull();
  });

  it("permite alterar o papel do usuário para Aluno Interno (internal_client)", async () => {
    (api.put as any).mockResolvedValueOnce({ success: true });
    const onUserUpdatedMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <EditarUsuarioModal
        isOpen={true}
        user={mockRegularUser}
        onClose={onCloseMock}
        onUserUpdated={onUserUpdatedMock}
      />
    );

    fireEvent.click(screen.getByTestId("edit-role-internal_client-btn"));
    fireEvent.click(screen.getByTestId("save-edit-user-btn"));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        `/admin/users/${mockRegularUser.id}`,
        expect.objectContaining({
          role: "internal_client",
        })
      );
    });
  });

  it("permite configurar limite diário e limite máximo total ao editar usuário", async () => {
    (api.put as any).mockResolvedValueOnce({ success: true });

    render(
      <EditarUsuarioModal
        isOpen={true}
        user={mockRegularUser}
        onClose={vi.fn()}
        onUserUpdated={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("edit-tab-limites"));
    fireEvent.click(screen.getByTestId("daily-limit-custom-btn"));
    fireEvent.change(screen.getByTestId("daily-limit-input"), { target: { value: "6" } });
    fireEvent.click(screen.getByTestId("total-limit-custom-btn"));
    fireEvent.change(screen.getByTestId("total-limit-input"), { target: { value: "80" } });
    fireEvent.click(screen.getByTestId("save-edit-user-btn"));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        `/admin/users/${mockRegularUser.id}`,
        expect.objectContaining({
          unlimited_daily_requests: false,
          daily_request_limit: 6,
          unlimited_total_requests: false,
          max_total_requests: 80,
        })
      );
    });
  });

  it("permite ativar modo Franquia -> depois diário (quota_then_daily) ao editar usuário", async () => {
    (api.put as any).mockResolvedValueOnce({ success: true });

    render(
      <EditarUsuarioModal
        isOpen={true}
        user={mockRegularUser}
        onClose={vi.fn()}
        onUserUpdated={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("edit-tab-limites"));
    fireEvent.click(screen.getByTestId("limit-mode-quota-then-daily-btn"));
    fireEvent.change(screen.getByTestId("total-limit-input"), { target: { value: "100" } });
    fireEvent.change(screen.getByTestId("daily-limit-input"), { target: { value: "3" } });
    fireEvent.click(screen.getByTestId("save-edit-user-btn"));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        `/admin/users/${mockRegularUser.id}`,
        expect.objectContaining({
          request_limit_mode: "quota_then_daily",
          max_total_requests: 100,
          daily_request_limit: 3,
        })
      );
    });
  });

  it("organiza o popup em 3 abas para aluno e oculta abas de aluno ao mudar para Administrador", () => {
    render(
      <EditarUsuarioModal
        isOpen={true}
        user={mockRegularUser}
        onClose={vi.fn()}
        onUserUpdated={vi.fn()}
      />
    );

    expect(screen.getByTestId("edit-tab-panel-dados")).toBeDefined();
    expect(screen.queryByTestId("edit-tab-panel-acesso")).toBeNull();
    expect(screen.queryByTestId("edit-tab-panel-limites")).toBeNull();

    fireEvent.click(screen.getByTestId("edit-tab-acesso"));
    expect(screen.getByTestId("edit-tab-panel-acesso")).toBeDefined();
    expect(screen.queryByTestId("edit-tab-panel-dados")).toBeNull();

    fireEvent.click(screen.getByTestId("edit-tab-limites"));
    expect(screen.getByTestId("edit-tab-panel-limites")).toBeDefined();

    fireEvent.click(screen.getByTestId("edit-tab-dados"));
    fireEvent.click(screen.getByTestId("edit-role-admin-btn"));
    expect(screen.queryByTestId("edit-tab-acesso")).toBeNull();
    expect(screen.queryByTestId("edit-tab-limites")).toBeNull();
  });
});
