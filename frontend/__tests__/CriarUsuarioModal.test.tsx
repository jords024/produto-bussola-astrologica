import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CriarUsuarioModal from "@/components/CriarUsuarioModal";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CriarUsuarioModal Component", () => {
  const onClose = vi.fn();
  const onUserCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não renderiza quando isOpen é false", () => {
    render(<CriarUsuarioModal isOpen={false} onClose={onClose} onUserCreated={onUserCreated} />);
    expect(screen.queryByTestId("criar-usuario-modal")).toBeNull();
  });

  it("não fecha ao clicar fora no backdrop e fecha ao clicar em Cancelar", () => {
    render(<CriarUsuarioModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />);

    fireEvent.click(screen.getByTestId("criar-usuario-modal-backdrop"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("cancel-create-user-btn"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("inicia com campos vazios, DDI +55 do Brasil por padrão, checklist de senha e atributos anti-autofill", () => {
    render(<CriarUsuarioModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />);

    const emailInput = screen.getByTestId("create-user-email-input") as HTMLInputElement;
    const passwordInput = screen.getByTestId("create-user-password-input") as HTMLInputElement;

    expect(emailInput.value).toBe("");
    expect(passwordInput.value).toBe("");
    expect(emailInput.getAttribute("autocomplete")).toBe("off");
    expect(passwordInput.getAttribute("autocomplete")).toBe("new-password");

    expect(screen.getByText("+55")).toBeDefined();
    expect(screen.getByTestId("password-requirements-box")).toBeDefined();
    expect(screen.getByText("Mínimo de 12 caracteres")).toBeDefined();
    expect(screen.getByText("Pelo menos uma letra maiúscula (A-Z)")).toBeDefined();
    expect(screen.getByText("Pelo menos uma letra minúscula (a-z)")).toBeDefined();
    expect(screen.getByText("Pelo menos um número (0-9)")).toBeDefined();
    expect(screen.getByText("Pelo menos um caractere especial (!@#$%^&*...)")).toBeDefined();
  });

  it("bloqueia criação quando a senha não atende aos 5 requisitos de segurança", async () => {
    render(<CriarUsuarioModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />);

    fireEvent.change(screen.getByTestId("create-user-name-input"), { target: { value: "Maria Teste" } });
    fireEvent.change(screen.getByTestId("create-user-email-input"), { target: { value: "maria@exemplo.com" } });
    fireEvent.change(screen.getByTestId("create-user-password-input"), { target: { value: "Fraca123!" } });

    fireEvent.click(screen.getByTestId("submit-create-user-btn"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("A senha deve atender a todos os 5 requisitos de segurança.");
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it("permite alternar visualização da senha, usar DDI padrão +55 e criar usuário com senha forte", async () => {
    (api.post as any).mockResolvedValue({ success: true });

    render(<CriarUsuarioModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />);

    const passwordInput = screen.getByTestId("create-user-password-input") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    fireEvent.click(screen.getByTestId("create-user-password-input-toggle-visibility"));
    expect(passwordInput.type).toBe("text");

    fireEvent.change(screen.getByTestId("create-user-name-input"), { target: { value: "Maria Teste" } });
    fireEvent.change(screen.getByTestId("create-user-email-input"), { target: { value: "Maria@Exemplo.com" } });
    fireEvent.change(screen.getByTestId("create-user-whatsapp-input"), { target: { value: "11999998888" } });
    fireEvent.change(passwordInput, { target: { value: "SenhaForte@123" } });
    fireEvent.click(screen.getByTestId("create-user-role-admin"));

    fireEvent.click(screen.getByTestId("submit-create-user-btn"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/users", {
        name: "Maria Teste",
        email: "maria@exemplo.com",
        whatsapp: "+5511999998888",
        password: "SenhaForte@123",
        role: "admin",
      });
    });

    expect(toast.success).toHaveBeenCalledWith("Usuário criado com sucesso!");
    expect(onUserCreated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exibe toast de erro quando a API falha", async () => {
    (api.post as any).mockRejectedValue({
      response: { data: { detail: "Já existe um usuário cadastrado com este e-mail." } },
    });

    render(<CriarUsuarioModal isOpen={true} onClose={onClose} onUserCreated={onUserCreated} />);

    fireEvent.change(screen.getByTestId("create-user-name-input"), { target: { value: "João" } });
    fireEvent.change(screen.getByTestId("create-user-email-input"), { target: { value: "joao@exemplo.com" } });
    fireEvent.change(screen.getByTestId("create-user-password-input"), { target: { value: "SenhaForte@123" } });
    fireEvent.click(screen.getByTestId("submit-create-user-btn"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Já existe um usuário cadastrado com este e-mail.");
    });

    expect(onUserCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
