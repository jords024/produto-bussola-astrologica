import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MultipleProfilesPermissionFields from "@/components/MultipleProfilesPermissionFields";
import AstroProfileSelector from "@/components/AstroProfileSelector";
import PerfisExtrasManager from "@/components/PerfisExtrasManager";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/components/Toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Múltiplos Perfis (Admin & Aluno)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("MultipleProfilesPermissionFields permite ativar e escolher ilimitado ou limite numérico", () => {
    const onAllow = vi.fn();
    const onUnlim = vi.fn();
    const onMax = vi.fn();

    const { rerender } = render(
      <MultipleProfilesPermissionFields
        role="client"
        allowMultiple={false}
        onAllowChange={onAllow}
        unlimited={true}
        onUnlimitedChange={onUnlim}
        maxLimit="3"
        onMaxLimitChange={onMax}
      />
    );

    fireEvent.click(screen.getByTestId("toggle-allow-multiple-profiles"));
    expect(onAllow).toHaveBeenCalledWith(true);

    rerender(
      <MultipleProfilesPermissionFields
        role="client"
        allowMultiple={true}
        onAllowChange={onAllow}
        unlimited={false}
        onUnlimitedChange={onUnlim}
        maxLimit="5"
        onMaxLimitChange={onMax}
      />
    );

    const input = screen.getByTestId("max-extra-profiles-input") as HTMLInputElement;
    expect(input.value).toBe("5");
    fireEvent.change(input, { target: { value: "8" } });
    expect(onMax).toHaveBeenCalledWith("8");
  });

  it("AstroProfileSelector lista perfis e dispara onChange com o perfil escolhido", async () => {
    (api.get as any).mockResolvedValue({
      profiles: [
        {
          id: "p1",
          name: "Maria Clara",
          relationship_label: "Filha",
        },
      ],
    });

    const onChange = vi.fn();
    render(
      <AstroProfileSelector
        ownerName="Aryaraj"
        selectedProfileId=""
        onChange={onChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("astro-profile-select")).toBeDefined();
    });

    fireEvent.change(screen.getByTestId("astro-profile-select"), {
      target: { value: "p1" },
    });
    expect(onChange).toHaveBeenCalledWith("p1", "Maria Clara");
  });

  it("PerfisExtrasManager cadastra nova pessoa e confirma exclusão via popup", async () => {
    (api.get as any).mockResolvedValue({
      allow_multiple_profiles: true,
      max_extra_profiles: 3,
      used_extra_profiles: 1,
      remaining_extra_profiles: 2,
      profiles: [
        {
          id: "p1",
          name: "João Pedro",
          relationship_label: "Filho",
          birth_date: "2016-04-10",
          birth_time: "09:00",
          birth_city: "Fortaleza",
          birth_state: "CE",
          birth_country: "Brasil",
          sun_sign: "Áries",
          moon_sign: "Touro",
          rising_sign: "Gêmeos",
          has_chart: true,
          has_sections: true,
        },
      ],
    });
    let resolvePost: (val: any) => void;
    (api.post as any).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );
    (api.delete as any).mockResolvedValue({ success: true });

    render(<PerfisExtrasManager />);

    await waitFor(() => {
      expect(screen.getByText("João Pedro")).toBeDefined();
      expect(screen.getByText("1 de 3 pessoa(s) cadastrada(s)")).toBeDefined();
    });

    // Abre formulário de cadastro
    fireEvent.click(screen.getByTestId("add-extra-profile-btn"));
    fireEvent.change(screen.getByTestId("extra-profile-name-input"), { target: { value: "Ana Paula" } });
    fireEvent.change(screen.getByTestId("extra-profile-date-input"), { target: { value: "1990-05-12" } });
    fireEvent.change(screen.getByPlaceholderText("Digite a cidade..."), { target: { value: "Recife" } });

    fireEvent.click(screen.getByTestId("save-extra-profile-btn"));

    // Deve exibir o popup de progresso enquanto cadastra
    await waitFor(() => {
      expect(screen.getByTestId("generating-chart-modal")).toBeDefined();
      expect(screen.getByText("Cadastrando Ana Paula...")).toBeDefined();
    });

    resolvePost!({ success: true });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/members/profiles",
        expect.objectContaining({
          name: "Ana Paula",
          birth_date: "1990-05-12",
          birth_city: "Recife",
        })
      );
      expect(screen.queryByTestId("generating-chart-modal")).toBeNull();
    });

    // Abre popup de exclusão (deve renderizar via Portal no document.body para cobrir toda a tela)
    fireEvent.click(screen.getByText("Excluir"));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.className).toContain("fixed inset-0");
    expect(screen.getByText("Remover João Pedro?")).toBeDefined();

    fireEvent.click(screen.getByText("Confirmar Exclusão"));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/members/profiles/p1");
    });
  });
});
