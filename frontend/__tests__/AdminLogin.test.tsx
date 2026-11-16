import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminLogin from "@/app/(admin)/admin/login/page";
import { api } from "@/lib/api";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
  saveToken: vi.fn(),
}));

describe("AdminLogin Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza os campos de email, senha e botão de alternar visibilidade", () => {
    render(<AdminLogin />);

    expect(screen.getByPlaceholderText(/email/i)).toBeDefined();
    const passwordInput = screen.getByPlaceholderText(/senha/i);
    expect(passwordInput).toBeDefined();
    expect(passwordInput.getAttribute("type")).toBe("password");

    const toggleBtn = screen.getByTestId("toggle-password-visibility");
    expect(toggleBtn).toBeDefined();
  });

  it("alterna a visibilidade da senha entre password e text ao clicar no ícone de olho", () => {
    render(<AdminLogin />);

    const passwordInput = screen.getByPlaceholderText(/senha/i);
    const toggleBtn = screen.getByTestId("toggle-password-visibility");

    // Inicialmente oculto
    expect(passwordInput.getAttribute("type")).toBe("password");

    // Clica para exibir
    fireEvent.click(toggleBtn);
    expect(passwordInput.getAttribute("type")).toBe("text");

    // Clica novamente para ocultar
    fireEvent.click(toggleBtn);
    expect(passwordInput.getAttribute("type")).toBe("password");
  });

  it("redireciona para /admin quando o login de aluno/cliente é bem-sucedido", async () => {
    (api.post as any).mockResolvedValueOnce({
      token: "fake-client-token",
      role: "client",
    });

    render(<AdminLogin />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "client@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/senha/i), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin");
    });
  });

  it("redireciona para /admin quando o login de admin é bem-sucedido", async () => {
    (api.post as any).mockResolvedValueOnce({
      token: "fake-admin-token",
      role: "admin",
    });

    render(<AdminLogin />);

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/senha/i), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin");
    });
  });

  it("renderiza a imagem da bússola astrológica no showcase lateral", () => {
    render(<AdminLogin />);

    const compassImage = screen.getByTestId("login-compass-image");
    expect(compassImage).toBeDefined();
    expect(compassImage.getAttribute("src")).toBe("/logo-bussola.webp");
    expect(compassImage.getAttribute("alt")).toBe("Bússola Astrológica");
  });
});
