import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  isMobileOrTabletDevice,
  isIosDevice,
} from "@/lib/usePwaInstall";
import PwaInstallBanner from "@/components/PwaInstallBanner";
import PwaInstallGuideModal from "@/components/PwaInstallGuideModal";
import PwaInstallSidebarButton from "@/components/PwaInstallSidebarButton";

describe("PWA Install detection helpers", () => {
  it("identifica celulares e tablets (Android, iPhone, iPad, iPadOS)", () => {
    expect(
      isMobileOrTabletDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile")
    ).toBe(true);
    expect(
      isMobileOrTabletDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")
    ).toBe(true);
    expect(
      isMobileOrTabletDevice("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")
    ).toBe(true);
    // iPadOS 13+ se identifica como Macintosh com maxTouchPoints > 1
    expect(
      isMobileOrTabletDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)
    ).toBe(true);
  });

  it("retorna false para computadores desktop/notebook", () => {
    expect(
      isMobileOrTabletDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
    ).toBe(false);
    expect(
      isMobileOrTabletDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)
    ).toBe(false);
  });

  it("identifica corretamente dispositivos iOS", () => {
    expect(isIosDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe(true);
    expect(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X)", 5)).toBe(true);
    expect(isIosDevice("Mozilla/5.0 (Linux; Android 14)")).toBe(false);
  });
});

describe("PWA Install UI components", () => {
  it("renderiza PwaInstallBanner apenas quando visible=true e dispara callbacks", () => {
    const onInstall = vi.fn();
    const onDismiss = vi.fn();

    const { rerender } = render(
      <PwaInstallBanner
        visible={false}
        isIos={false}
        showGuideModal={false}
        onInstall={onInstall}
        onDismiss={onDismiss}
        onCloseGuide={vi.fn()}
      />
    );
    expect(screen.queryByTestId("pwa-install-banner")).toBeNull();

    rerender(
      <PwaInstallBanner
        visible={true}
        isIos={false}
        showGuideModal={false}
        onInstall={onInstall}
        onDismiss={onDismiss}
        onCloseGuide={vi.fn()}
      />
    );
    expect(screen.getByTestId("pwa-install-banner")).toBeDefined();

    fireEvent.click(screen.getByText("Instalar Atalho"));
    expect(onInstall).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Agora não"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("exibe instruções corretas no PwaInstallGuideModal e fecha somente pelo botão", () => {
    const onClose = vi.fn();
    render(
      <PwaInstallGuideModal isOpen={true} isIos={true} onClose={onClose} />
    );

    expect(screen.getByText("Instruções para iPhone / iPad (Safari)")).toBeDefined();
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeDefined();

    // Clicar no backdrop não fecha
    fireEvent.click(screen.getByTestId("pwa-install-guide-modal"));
    expect(onClose).not.toHaveBeenCalled();

    // Clicar no botão fecha
    fireEvent.click(screen.getByText("Entendi"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renderiza PwaInstallSidebarButton apenas quando visible=true", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <PwaInstallSidebarButton visible={false} onClick={onClick} />
    );
    expect(screen.queryByTestId("pwa-install-sidebar-btn")).toBeNull();

    rerender(<PwaInstallSidebarButton visible={true} onClick={onClick} />);
    const btn = screen.getByTestId("pwa-install-sidebar-btn");
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
