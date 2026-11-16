import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import CadastroPage from "@/app/(public)/cadastro/page";
import { api } from "@/lib/api";

const mockPush = vi.fn();
let mockSearchParamToken: string | null = "valid-token-123";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "token" ? mockSearchParamToken : null),
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Cadastro via Convite Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamToken = "valid-token-123";
  });

  it("exibe mensagem de erro quando o convite é inválido ou expirou", async () => {
    (api.get as any).mockRejectedValue({
      response: { data: { detail: "Este link de convite expirou." } },
    });

    render(<CadastroPage />);

    await waitFor(() => {
      expect(screen.getByTestId("invite-error-card")).toBeDefined();
      expect(screen.getByText("Convite Indisponível")).toBeDefined();
      expect(screen.getByText("Este link de convite expirou.")).toBeDefined();
    });
  });

  it("renderiza o formulário com o papel correspondente e checklist de senha forte", async () => {
    (api.get as any).mockResolvedValue({
      valid: true,
      token: "valid-token-123",
      role: "client",
      role_label: "Aluno",
      validity_type: "never",
      expires_at: null,
    });

    render(<CadastroPage />);

    await waitFor(() => {
      expect(screen.getByTestId("cadastro-invite-card")).toBeDefined();
      expect(screen.getByText("Criar Sua Conta")).toBeDefined();
      expect(screen.getByText("Convite para: Aluno")).toBeDefined();
    });

    // Validar presença dos campos
    expect(screen.getByTestId("input-name")).toBeDefined();
    expect(screen.getByTestId("input-email")).toBeDefined();
    expect(screen.getByTestId("input-whatsapp")).toBeDefined();
    expect(screen.getByTestId("input-password")).toBeDefined();
    expect(screen.getByTestId("input-confirm-password")).toBeDefined();

    // Validar que o checklist de requisitos de senha forte está visível
    expect(screen.getByTestId("password-requirements-box")).toBeDefined();
    expect(screen.getByText("Mínimo de 12 caracteres")).toBeDefined();
    expect(screen.getByText("Pelo menos uma letra maiúscula (A-Z)")).toBeDefined();
    expect(screen.getByText("Pelo menos uma letra minúscula (a-z)")).toBeDefined();
    expect(screen.getByText("Pelo menos um número (0-9)")).toBeDefined();
    expect(screen.getByText("Pelo menos um caractere especial (!@#$%^&*...)")).toBeDefined();

    // Validar que NÃO existe o botão/link "Fazer login"
    expect(screen.queryByText("Fazer login")).toBeNull();
    expect(screen.queryByText("Já possui uma conta?")).toBeNull();
  });

  it("valida senha forte, solicita código de verificação via Brevo e depois valida o código para concluir cadastro", async () => {
    (api.get as any).mockResolvedValue({
      valid: true,
      token: "valid-token-123",
      role: "client",
      role_label: "Aluno",
      validity_type: "24h",
      expires_at: "2026-10-03T12:00:00Z",
    });

    // Mock da requisição de código de verificação
    (api.post as any).mockImplementation((url: string) => {
      if (url === "/auth/request-register-code") {
        return Promise.resolve({
          success: true,
          message: "Código de verificação enviado para o seu e-mail.",
          email: "aluno@sirius.com",
        });
      }
      if (url === "/auth/verify-register-code") {
        return Promise.resolve({
          success: true,
          token: "jwt-token-xyz",
          role: "client",
          name: "Novo Aluno",
          email: "aluno@sirius.com",
        });
      }
      return Promise.reject(new Error("URL desconhecida"));
    });

    render(<CadastroPage />);

    await waitFor(() => {
      expect(screen.getByTestId("cadastro-invite-card")).toBeDefined();
    });

    // Preenche com senha forte (12 dígitos, maiúscula, minúscula, número e símbolo)
    fireEvent.change(screen.getByTestId("input-name"), { target: { value: "Novo Aluno" } });
    fireEvent.change(screen.getByTestId("input-email"), { target: { value: "aluno@sirius.com" } });
    fireEvent.change(screen.getByTestId("input-whatsapp"), { target: { value: "11999998888" } });
    fireEvent.change(screen.getByTestId("input-password"), { target: { value: "Sirius@2026Strong" } });
    fireEvent.change(screen.getByTestId("input-confirm-password"), { target: { value: "Sirius@2026Strong" } });

    // Dispara a solicitação do código
    fireEvent.click(screen.getByTestId("submit-register-btn"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/request-register-code", {
        token: "valid-token-123",
        name: "Novo Aluno",
        email: "aluno@sirius.com",
        whatsapp: "+5511999998888",
        password: "Sirius@2026Strong",
      });
      // Deve ter transicionado para a etapa de verificação de código
      expect(screen.getByText("Validação de E-mail")).toBeDefined();
      expect(screen.getByTestId("input-verification-code")).toBeDefined();
    });

    // Digita o código de 6 dígitos recebido por e-mail
    fireEvent.change(screen.getByTestId("input-verification-code"), {
      target: { value: "123456" },
    });

    // Submete a validação do código
    fireEvent.click(screen.getByTestId("submit-verify-code-btn"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/verify-register-code", {
        token: "valid-token-123",
        email: "aluno@sirius.com",
        code: "123456",
      });
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
