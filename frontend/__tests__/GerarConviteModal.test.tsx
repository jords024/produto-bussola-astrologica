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

    fireEvent.click(screen.getByTestId("invite-tab-acesso"));
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

  it("permite definir limite diário e limite máximo total ao gerar convite", async () => {
    (api.post as any).mockResolvedValue({
      token: "tk-lim",
      role: "client",
      role_label: "Aluno",
      validity_type: "never",
      expires_at: null,
      daily_request_limit: 8,
      max_total_requests: 120,
      invite_path: "/cadastro?token=tk-lim",
    });

    render(<GerarConviteModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId("invite-tab-limites"));
    fireEvent.click(screen.getByTestId("daily-limit-custom-btn"));
    fireEvent.change(screen.getByTestId("daily-limit-input"), { target: { value: "8" } });
    fireEvent.click(screen.getByTestId("total-limit-custom-btn"));
    fireEvent.change(screen.getByTestId("total-limit-input"), { target: { value: "120" } });
    fireEvent.click(screen.getByTestId("submit-generate-invite-btn"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/invites", {
        role: "client",
        validity_type: "never",
        daily_request_limit: 8,
        max_total_requests: 120,
      });
    });
  });

  it("organiza o popup de convite em 3 abas para aluno e oculta abas exclusivas ao escolher Admin", () => {
    render(<GerarConviteModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId("invite-tab-panel-geral")).toBeDefined();
    expect(screen.getByTestId("invite-tab-acesso")).toBeDefined();
    expect(screen.getByTestId("invite-tab-limites")).toBeDefined();

    fireEvent.click(screen.getByTestId("role-option-admin"));
    expect(screen.queryByTestId("invite-tab-acesso")).toBeNull();
    expect(screen.queryByTestId("invite-tab-limites")).toBeNull();
  });
});
