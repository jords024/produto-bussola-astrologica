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
});
