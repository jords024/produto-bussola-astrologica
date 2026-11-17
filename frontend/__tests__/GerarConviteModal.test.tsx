import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GerarConviteModal from "@/components/GerarConviteModal";
import { api } from "@/lib/api";

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

describe("GerarConviteModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não renderiza nada quando isOpen é false", () => {
    const { container } = render(<GerarConviteModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza opções de Aluno, Admin e opções de validade quando aberto", () => {
    render(<GerarConviteModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getAllByText("Gerar Link de Convite").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("role-option-aluno")).toBeDefined();
    expect(screen.getByTestId("role-option-admin")).toBeDefined();

    expect(screen.getByTestId("validity-option-never")).toBeDefined();
    expect(screen.getByTestId("validity-option-24h")).toBeDefined();
    expect(screen.getByTestId("validity-option-48h")).toBeDefined();
    expect(screen.getByTestId("validity-option-72h")).toBeDefined();
  });

  it("permite selecionar Admin e validade 24h e enviar para a API", async () => {
    (api.post as any).mockResolvedValue({
      id: "inv-123",
      token: "secure-token-123",
      role: "admin",
      role_label: "Administrador",
      validity_type: "24h",
      expires_at: "2026-10-03T12:00:00Z",
      invite_path: "/cadastro?token=secure-token-123",
    });

    render(<GerarConviteModal isOpen={true} onClose={vi.fn()} />);

    // Selecionar Admin
    fireEvent.click(screen.getByTestId("role-option-admin"));

    // Selecionar validade 24h
    fireEvent.click(screen.getByTestId("validity-option-24h"));

    // Submeter
    fireEvent.click(screen.getByTestId("submit-generate-invite-btn"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/invites", {
        role: "admin",
        validity_type: "24h",
      });
    });

    // Validar tela de sucesso e exibição do link
    await waitFor(() => {
      expect(screen.getByTestId("generated-invite-view")).toBeDefined();
      expect(screen.getByText("Link de Convite Pronto!")).toBeDefined();
    });

    const linkInput = screen.getByTestId("invite-link-input") as HTMLInputElement;
    expect(linkInput.value).toContain("/cadastro?token=secure-token-123");
  });

  it("chama onClose ao clicar no botão fechar", () => {
    const onCloseMock = vi.fn();
    render(<GerarConviteModal isOpen={true} onClose={onCloseMock} />);

    const closeBtn = screen.getByTestId("close-invite-modal-btn");
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it("permite definir tempo de acesso (30 dias) ao gerar convite de aluno", async () => {
    (api.post as any).mockResolvedValue({
      token: "tk-30d",
      role: "client",
      role_label: "Aluno",
      validity_type: "never",
      expires_at: null,
      access_days: 30,
      invite_path: "/cadastro?token=tk-30d",
    });

    render(<GerarConviteModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId("invite-access-days-30"));
    fireEvent.click(screen.getByTestId("submit-generate-invite-btn"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/invites", {
        role: "client",
        validity_type: "never",
        access_days: 30,
      });
    });
  });
});
