"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import PwaInstallSidebarButton from "./PwaInstallSidebarButton";

interface AdminSidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  currentUser?: { name?: string; email?: string } | null;
  /** "admin" monta o menu de gestao; qualquer outro valor monta o do aluno. */
  papel?: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  canInstallPwa?: boolean;
  onInstallPwa?: () => void;
}

export default function AdminSidebar({
  activeTab,
  onSelectTab,
  onLogout,
  currentUser,
  papel = "client",
  mobileOpen = false,
  onCloseMobile,
  canInstallPwa = false,
  onInstallPwa,
}: AdminSidebarProps) {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(currentUser || null);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      return;
    }
    const token = typeof window !== "undefined" ? (localStorage.getItem("bussola_token") || localStorage.getItem("sirius_token")) : null;
    if (!token) return;

    api.get<{ name: string; email: string }>("/auth/me")
      .then((res) => {
        if (res && res.email) {
          setUser({ name: res.name || res.email.split("@")[0], email: res.email });
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Trava o scroll da página de trás quando o menu mobile está aberto
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);
  // O papel decide o menu inteiro. Aluno nunca ve item de gestao, e nao e so
  // estetica: ate aqui a tela de admin montava para qualquer um com token.
  const aluno = papel !== "admin";

  const navSections = [
    ...(aluno
      ? [
          {
            category: "Sua bússola",
            items: [
              {
                id: "comece_aqui",
                label: "Comece Aqui",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                id: "home",
                label: "Minha Bússola",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-11.414l2.828 2.828-4.242 4.242-2.828-2.828 4.242-4.242z" />
                  </svg>
                ),
              },
              {
                id: "pesquisa",
                label: "A leitura",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                id: "historico",
                label: "Diário de bordo",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                id: "dados",
                label: "Meus Dados",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
            ],
          },
        ]
      : [
          {
            category: "Bússola (Visão Cliente)",
            items: [
              {
                id: "comece_aqui",
                label: "Comece Aqui",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                id: "leitura",
                label: "A leitura do Dia",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                id: "bussola",
                label: "Minha Bússola",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-11.414l2.828 2.828-4.242 4.242-2.828-2.828 4.242-4.242z" />
                  </svg>
                ),
              },
              {
                id: "diario",
                label: "Diário de bordo",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                id: "dados",
                label: "Coleta de Informações",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
            ],
          },
          {
            category: "Painel de Gestão",
            items: [
              {
                id: "pesquisa",
                label: "Pesquisa de Clientes",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
              },
              {
                id: "financeiro",
                label: "Financeiro",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ],
          },
          {
            category: "Segurança",
            items: [
              {
                id: "backup_automatico",
                label: "Backup Automático",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
              },
              {
                id: "sistema_logs",
                label: "Sistema de Logs",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                id: "gestao_usuarios",
                label: "Gestão de Usuários",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ),
              },
              {
                id: "configuracoes_ia",
                label: "Modelos de IA",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
            ],
          },
        ]),
  ];

  const renderContent = (isMobile = false) => (
    <>
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand / Logo Header */}
        <div
          className="p-5 sm:p-6 flex items-start justify-between gap-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(127, 119, 221, 0.12)" }}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5 text-amber-400">✨</span>
            <div>
              <h2 className="font-bold text-base leading-tight tracking-wide text-indigo-100">
                Bússola Astrológica
              </h2>
              <p className="text-xs text-indigo-300/60 font-normal mt-0.5">
                {aluno ? "A sua bússola" : "Painel de Gestão"}
              </p>
            </div>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fechar menu"
              className="p-1.5 -mr-1 text-indigo-300/70 hover:text-white rounded-lg hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation Links agrupados por Categorias */}
        <nav className="p-4 space-y-4 overflow-y-auto overscroll-contain flex-1">
          {navSections.map((section) => (
            <div key={section.category} className="space-y-1">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-300/40 select-none">
                {section.category}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        if (isMobile && onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                        isActive
                          ? "text-indigo-100 shadow-sm"
                          : "text-indigo-300/70 hover:text-indigo-100 hover:bg-white/[0.04]"
                      }`}
                      style={{
                        background: isActive
                          ? "rgba(127, 119, 221, 0.22)"
                          : "transparent",
                        border: isActive
                          ? "1px solid rgba(127, 119, 221, 0.35)"
                          : "1px solid transparent",
                      }}
                    >
                      <span
                        className={
                          isActive ? "text-indigo-300" : "text-indigo-300/60"
                        }
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / Usuário Logado e Logout */}
      <div
        className="p-4 space-y-3 shrink-0"
        style={{ borderTop: "1px solid rgba(127, 119, 221, 0.12)" }}
      >
        {/* Card do Usuário Logado */}
        {user?.email && (
          <div
            data-testid="current-user-card"
            className="flex items-center gap-3 px-3 py-2 rounded-xl select-none"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(127, 119, 221, 0.15)",
            }}
          >
            {/* Avatar circular com inicial */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-inner"
              style={{
                background: "linear-gradient(135deg, rgba(127, 119, 221, 0.4), rgba(60, 52, 137, 0.6))",
                color: "#f0eeff",
                border: "1px solid rgba(127, 119, 221, 0.3)",
              }}
            >
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>

            {/* Informações: Nome e E-mail */}
            <div className="min-w-0 flex-1">
              <p
                data-testid="current-user-name"
                className="text-xs font-semibold text-indigo-100 truncate leading-tight"
                title={user.name || "Administrador"}
              >
                {user.name || "Administrador"}
              </p>
              <p
                data-testid="current-user-email"
                className="text-[11px] text-indigo-300/60 truncate leading-tight mt-0.5"
                title={user.email}
              >
                {user.email}
              </p>
            </div>
          </div>
        )}

        {/* Atalho PWA (somente mobile/tablet quando ainda não instalado) */}
        <PwaInstallSidebarButton
          visible={Boolean(isMobile && canInstallPwa && onInstallPwa)}
          onClick={() => {
            onInstallPwa?.();
            if (onCloseMobile) onCloseMobile();
          }}
        />

        {/* Botão Sair */}
        <button
          type="button"
          onClick={() => {
            onLogout();
            if (isMobile && onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-300/60 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          <svg
            className="w-5 h-5 rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (oculta em telas menores que md) */}
      <aside
        className="hidden md:flex w-64 h-screen sticky top-0 flex-col justify-between shrink-0 select-none overflow-hidden overscroll-contain"
        style={{
          background: "#110d26",
          borderRight: "1px solid rgba(127, 119, 221, 0.15)",
        }}
      >
        {renderContent(false)}
      </aside>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          data-testid="sidebar-mobile-backdrop"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <aside
        data-testid="sidebar-mobile-drawer"
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 flex flex-col justify-between select-none shadow-2xl transition-transform duration-300 ease-in-out md:hidden overflow-hidden overscroll-contain ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "#110d26",
          borderRight: "1px solid rgba(127, 119, 221, 0.15)",
        }}
      >
        {renderContent(true)}
      </aside>
    </>
  );
}
