import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import AdminPage from "@/app/(admin)/admin/page";
import { api, ApiError } from "@/lib/api";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: {
      get: vi.fn(),
      patch: vi.fn(),
      post: vi.fn(),
    },
  };
});

describe("AdminPage - Persistência de Sessão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("NÃO desloga nem redireciona para /admin/login quando /auth/me falha por erro 500 ou instabilidade", async () => {
    localStorage.setItem("bussola_token", "token-valido");
    (api.get as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.reject(new ApiError("Erro interno", 500));
      return Promise.resolve({});
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/auth/me");
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(localStorage.getItem("bussola_token")).toBe("token-valido");
  });

  it("desloga e redireciona para /admin/login quando /auth/me retorna 401", async () => {
    localStorage.setItem("bussola_token", "token-expirado");
    localStorage.setItem("sirius_token", "token-expirado");
    localStorage.setItem("bussola_admin_active_tab", "financeiro");
    (api.get as any).mockImplementation((url: string) => {
      if (url === "/auth/me") return Promise.reject(new ApiError("Token inválido", 401));
      return Promise.resolve({});
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/admin/login");
    });

    expect(localStorage.getItem("bussola_token")).toBeNull();
    expect(localStorage.getItem("sirius_token")).toBeNull();
    expect(localStorage.getItem("bussola_admin_active_tab")).toBeNull();
  });
});
