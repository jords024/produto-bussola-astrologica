"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, clearToken } from "@/lib/api";
import { C, type DashboardData, type ClientDetail } from "@/types/admin";
import PainelAluno, { type AreaAluno } from "@/components/PainelAluno";
import Tutorial, { tutorialPendente } from "@/components/Tutorial";
import AdminSidebar from "@/components/AdminSidebar";
import PesquisaClientes from "@/components/PesquisaClientes";
import ClientDrawer from "@/components/ClientDrawer";
import LeadQuestionnaire from "@/components/LeadQuestionnaire";
import HistoricoPesquisas from "@/components/HistoricoPesquisas";
import GestaoUsuarios from "@/components/GestaoUsuarios";
import Financeiro from "@/components/Financeiro";
import ComeceAqui from "@/components/ComeceAqui";
import BackupAutomatico from "@/components/backup/BackupAutomatico";
import GerenciamentoLogs from "@/components/GerenciamentoLogs";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("home");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name?: string; email?: string; access_expired?: boolean; access_expires_at?: string | null } | null>(null);
  // null = ainda nao sabemos. Nada de gestao e desenhado antes de saber.
  const [papel, setPapel] = useState<string | null>(null);
  const [tutorialAberto, setTutorialAberto] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await api.get<DashboardData>("/admin/dashboard");
      setDashboard(data);
    } catch {
      // Falha tratada silenciosamente
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? (localStorage.getItem("bussola_token") || localStorage.getItem("sirius_token")) : null;
    if (!token) {
      router.push("/admin/login");
      return;
    }
    api.get<{ name: string; email: string; role?: string; access_expired?: boolean; access_expires_at?: string | null }>("/auth/me")
      .then((res) => {
        if (res && res.email) {
          setCurrentUser(res);
          setPapel(res.role || "client");
          // O tour e do aluno: admin nao precisa que expliquem o painel dele.
          if (res.role !== "admin" && tutorialPendente()) setTutorialAberto(true);
          // O painel de gestao so e montado para quem e admin de verdade.
          // Antes disto bastava ter token: um cliente logado via a tela toda
          // e so tomava o erro depois, vindo do backend.
          if (res.role === "admin") fetchDashboard();
        }
      })
      .catch((err: unknown) => {
        // Só força o logout se o token for explicitamente rejeitado (401/403).
        // Erros transitórios (rede, timeout, reinício do servidor 500/502/503) não deslogam o usuário.
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearToken();
          localStorage.removeItem("bussola_admin_active_tab");
          router.push("/admin/login");
        }
      });
  }, []);

  const ADMIN_ONLY_TABS = new Set(["gestao_usuarios", "backup_automatico", "sistema_logs", "pesquisa", "historico", "financeiro"]);

  const resolveTabName = (tab: string, role: string | null) => {
    if (tab === "dados" || tab === "coleta") return "dados";
    if (tab === "leitura" || tab === "analise") return role === "admin" ? "leitura" : "pesquisa";
    if (tab === "diario") return role === "admin" ? "diario" : "historico";
    if (tab === "bussola") return role === "admin" ? "bussola" : "home";
    return tab;
  };

  const handleSelectTab = useCallback((tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("bussola_admin_active_tab", tab);
        const url = new URL(window.location.href);
        if (url.searchParams.get("tab") !== tab) {
          url.searchParams.set("tab", tab);
          window.history.replaceState(null, "", url.toString());
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get("tab");
        const savedTab = localStorage.getItem("bussola_admin_active_tab");
        const initialTab = urlTab || savedTab;
        if (initialTab) {
          const resolved = resolveTabName(initialTab, papel);
          if (papel && papel !== "admin" && ADMIN_ONLY_TABS.has(resolved)) {
            setActiveTab("home");
          } else {
            setActiveTab(resolved);
          }
        }
      } catch {}
    }
  }, [papel]);

  const openClient = async (id: string) => {
    try {
      const c = await api.get<ClientDetail>(`/admin/clients/${id}`);
      setSelectedClient(c);
    } catch {
      alert("Erro ao carregar detalhes do cliente.");
    }
  };

  const changeStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/admin/clients/${id}/status`, { status: newStatus });
      if (selectedClient && selectedClient.id === id) {
        setSelectedClient({
          ...selectedClient,
          chart: selectedClient.chart
            ? { ...selectedClient.chart, status: newStatus }
            : null,
        });
      }
      fetchDashboard();
    } catch {
      alert("Erro ao alterar status.");
    }
  };

  const removeClient = (id: string) => {
    if (selectedClient && selectedClient.id === id) {
      setSelectedClient(null);
    }
    fetchDashboard();
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem("bussola_token");
    localStorage.removeItem("sirius_token");
    localStorage.removeItem("bussola_admin_active_tab");
    router.push("/admin/login");
  };

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ background: C.bg, color: C.text }}
    >
      {/* Barra Lateral com Categorias, Usuário Logado e Sair */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onLogout={() => setShowLogoutModal(true)}
        currentUser={currentUser}
        papel={papel || "client"}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <Tutorial
        aberto={tutorialAberto}
        onFechar={() => setTutorialAberto(false)}
        nome={currentUser?.name}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header Superior Responsivo */}
        <header
          className="px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3 shrink-0"
          style={{
            borderBottom: `1px solid ${C.border}`,
            background: "#130f2c",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação"
              className="md:hidden p-1.5 -ml-1 text-indigo-200 hover:text-white rounded-lg hover:bg-white/5 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base sm:text-xl font-bold truncate" style={{ color: C.light }}>
              {activeTab === "home"
                ? papel !== "admin" ? "Minha Bússola" : "Cadastrar Mapa"
                : activeTab === "pesquisa" || activeTab === "leitura"
                ? papel !== "admin" ? "A leitura do dia" : "Pesquisa de Clientes"
                : activeTab === "historico" || activeTab === "diario"
                ? "Diário de bordo"
                : activeTab === "bussola"
                ? "Minha Bússola"
                : activeTab === "dados"
                ? "Meus Dados de Nascimento"
                : activeTab === "backup_automatico"
                ? "Backup Automático"
                : activeTab === "sistema_logs"
                ? "Sistema de Logs"
                : activeTab === "financeiro"
                ? "Financeiro"
                : activeTab === "comece_aqui"
                ? "Comece Aqui"
                : "Gestão de Usuários"}
            </h1>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span
              className="text-xs sm:text-sm font-semibold tracking-wide hidden xs:inline"
              style={{ color: C.muted }}
            >
              {papel !== "admin" ? "Bússola Astrológica" : "Bussola Astrologica"}
            </span>
          </div>
        </header>

        {/* Corpo da Página Responsivo */}
        <main className="p-4 sm:p-8 flex-1 overflow-y-auto overscroll-contain">
          {/* Enquanto o papel nao chega, nada e desenhado: o que vazava antes
              era justamente a tela de gestao aparecendo durante esse vao. */}
          {papel === null && (
            <p className="text-sm" style={{ color: C.muted }}>Carregando...</p>
          )}

          {/* Aba Comece Aqui (Compartilhada: Alunos visualizam, Admins gerenciam) */}
          {papel !== null && activeTab === "comece_aqui" && (
            <ComeceAqui isAdmin={papel === "admin"} />
          )}

          {/* Visão do Aluno / Bússola Pessoal */}
          {papel !== null && activeTab !== "comece_aqui" && (papel !== "admin" || ["leitura", "bussola", "diario", "dados"].includes(activeTab)) && (
            <PainelAluno
              area={(
                activeTab === "pesquisa" || activeTab === "leitura"
                  ? "leitura"
                  : activeTab === "historico" || activeTab === "diario"
                  ? "diario"
                  : activeTab === "dados"
                  ? "dados"
                  : "bussola"
              ) as AreaAluno}
              usuario={currentUser}
              onIrPara={(a) => {
                if (papel === "admin") {
                  setActiveTab(a);
                } else {
                  setActiveTab(
                    a === "leitura"
                      ? "pesquisa"
                      : a === "diario"
                      ? "historico"
                      : a === "dados"
                      ? "dados"
                      : "home"
                  );
                }
              }}
            />
          )}

          {/* Ferramentas Exclusivas de Gestão para Administradores */}
          {papel === "admin" && !["comece_aqui", "leitura", "bussola", "diario", "dados"].includes(activeTab) && (<>
          {/* Aba Home / Cadastrar Mapa */}
          {activeTab === "home" && (
            <div className="w-full">
              <LeadQuestionnaire
                papel={papel || "client"}
                onClientCreated={() => {
                  fetchDashboard();
                }}
                onNavigateToSearch={() => setActiveTab("pesquisa")}
              />
            </div>
          )}

          {/* Aba Pesquisa de Clientes */}
          {activeTab === "pesquisa" && (
            <PesquisaClientes
              onOpenClient={openClient}
              onGoToHome={() => setActiveTab("home")}
            />
          )}

          {/* Aba Histórico de Pesquisas */}
          {activeTab === "historico" && (
            <HistoricoPesquisas onOpenClient={openClient} />
          )}

          {/* Aba Financeiro */}
          {activeTab === "financeiro" && <Financeiro />}

          {/* Aba Backup Automático */}
          {activeTab === "backup_automatico" && <BackupAutomatico />}

          {/* Aba Sistema de Logs */}
          {activeTab === "sistema_logs" && <GerenciamentoLogs />}

          {/* Aba Gestão de Usuários */}
          {activeTab === "gestao_usuarios" && <GestaoUsuarios />}
          </>)}
        </main>
      </div>

      {/* Drawer de Detalhes do Cliente */}
      {selectedClient && (
        <ClientDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onStatusChange={changeStatus}
          onDelete={removeClient}
        />
      )}

      {/* Popup de Confirmação de Logout */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative select-none"
            style={{
              background: "#161233",
              border: "1px solid rgba(127, 119, 221, 0.3)",
              boxShadow:
                "0 20px 40px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(127, 119, 221, 0.15)",
            }}
          >
            <div className="flex items-center gap-3.5 mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                <svg
                  className="w-6 h-6 text-red-400 rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <div>
                <h3
                  id="logout-modal-title"
                  className="text-lg font-bold text-white tracking-wide"
                >
                  Encerrar Sessão
                </h3>
                <p className="text-xs text-indigo-200/60 mt-0.5">
                  Bussola Astrologica
                </p>
              </div>
            </div>

            <p className="text-sm text-indigo-100/80 mb-6 leading-relaxed">
              Tem certeza de que deseja sair do painel administrativo? Você precisará realizar o login novamente para acessar o sistema.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-200/80 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                style={{ border: "1px solid rgba(127, 119, 221, 0.2)" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/30 transition-all cursor-pointer flex items-center gap-2"
              >
                Confirmar Saída
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
