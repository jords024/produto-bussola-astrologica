"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import GerarConviteModal from "@/components/GerarConviteModal";
import CriarUsuarioModal from "@/components/CriarUsuarioModal";
import ListaConvites from "@/components/ListaConvites";
import EditarUsuarioModal, { UserToEdit } from "@/components/EditarUsuarioModal";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import PaginationControls from "@/components/PaginationControls";
import UsersMetricsCards from "@/components/UsersMetricsCards";
import UsuarioCard from "@/components/UsuarioCard";
import RedefinirSenhaModal from "@/components/RedefinirSenhaModal";
import UsersFilterBar, { UserSortOrder } from "@/components/UsersFilterBar";
import BatchEditLimitsModal from "@/components/BatchEditLimitsModal";

export interface PanelUser {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  role: string;
  is_active: boolean;
  is_super_admin?: boolean;
  is_current_user?: boolean;
  created_at?: string;
  sun_sign?: string;
  birth_city?: string;
  access_expires_at?: string | null;
  access_expired?: boolean;
  allow_multiple_profiles?: boolean;
  max_extra_profiles?: number | null;
  daily_request_limit?: number | null;
  max_total_requests?: number | null;
  request_limit_mode?: "strict" | "quota_then_daily";
  daily_requests_used?: number;
  total_requests_used?: number;
}

export default function GestaoUsuarios() {
  const [users, setUsers] = useState<PanelUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<UserSortOrder>("desc");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserToEdit | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [showBatchLimitsModal, setShowBatchLimitsModal] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<PanelUser | null>(null);
  const [singleUserDeleteLoading, setSingleUserDeleteLoading] = useState(false);
  const [resetModalData, setResetModalData] = useState<{ name: string; email: string; resetUrl: string } | null>(null);
  const PAGE_SIZE = 20;

  const [activeTab, setActiveTab] = useState<"usuarios" | "convites">(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlSub = urlParams.get("subtab");
        const savedSub = localStorage.getItem("bussola_gestao_subtab");
        const initial = urlSub || savedSub;
        if (initial === "usuarios" || initial === "convites") {
          return initial;
        }
      } catch {}
    }
    return "usuarios";
  });

  // Persistir sub-aba no localStorage e URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("bussola_gestao_subtab", activeTab);
      const url = new URL(window.location.href);
      if (url.searchParams.get("subtab") !== activeTab) {
        url.searchParams.set("subtab", activeTab);
        window.history.replaceState(null, "", url.toString());
      }
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedUserIds([]);
  }, [search, roleFilter, startDate, endDate, sortOrder]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (roleFilter) params.append("role", roleFilter);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (sortOrder !== "desc") params.append("sort_order", sortOrder);

      const url = `/admin/users${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await api.get<{ total: number; items: PanelUser[] }>(url);
      const items = res?.items || [];
      const sorted = [...items].sort((a, b) => {
        if (a.is_super_admin && !b.is_super_admin) return -1;
        if (!a.is_super_admin && b.is_super_admin) return 1;
        return 0;
      });
      setUsers(sorted);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, startDate, endDate, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const formatBrasiliaDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const normalized = dateStr.includes("Z") || dateStr.includes("+") || dateStr.includes("-", 10)
        ? dateStr
        : `${dateStr}Z`;
      const date = new Date(normalized);
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const clientCount = users.filter((u) => u.role === "client").length;
  const internalClientCount = users.filter((u) => u.role === "internal_client").length;

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const pagedUsers = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectableInPage = pagedUsers.filter((u) => !u.is_super_admin && !u.is_current_user);
  const isAllSelectedInPage =
    selectableInPage.length > 0 &&
    selectableInPage.every((u) => selectedUserIds.includes(u.id));

  const toggleSelectAllInPage = () => {
    if (isAllSelectedInPage) {
      setSelectedUserIds((prev) => prev.filter((id) => !selectableInPage.some((u) => u.id === id)));
    } else {
      const toAdd = selectableInPage.map((u) => u.id).filter((id) => !selectedUserIds.includes(id));
      setSelectedUserIds((prev) => [...prev, ...toAdd]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirmBatchDelete = async () => {
    setBatchDeleteLoading(true);
    try {
      await api.delete("/admin/users/batch", { ids: selectedUserIds });
      toast.success(`${selectedUserIds.length} usuário(s) excluído(s) com sucesso!`);
      setSelectedUserIds([]);
      setShowBatchDeleteModal(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Erro ao excluir usuários.");
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  const handleResetPassword = async (u: PanelUser) => {
    try {
      const res = await api.post<{ success: boolean; reset_path: string }>(`/auth/users/${u.id}/reset-link`);
      if (res?.reset_path) {
        setResetModalData({
          name: u.name,
          email: u.email,
          resetUrl: res.reset_path,
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao gerar link de redefinição de senha.");
    }
  };

  const handleConfirmSingleUserDelete = async () => {
    if (!userToDelete) return;
    setSingleUserDeleteLoading(true);
    try {
      await api.delete("/admin/users/batch", { ids: [userToDelete.id] });
      toast.success("Usuário excluído com sucesso!");
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Erro ao excluir usuário.");
    } finally {
      setSingleUserDeleteLoading(false);
    }
  };

  return (
    <div data-testid="gestao-usuarios-container" className="space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: "#f0eeff" }}>
            <span>🛡️</span> Gestão de Usuários
          </h3>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "#8b87b8" }}>
            Controle de acessos, administradores e clientes cadastrados no painel cósmico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCreateUserModal(true)}
            data-testid="open-create-user-modal-btn"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg hover:brightness-110 active:scale-95"
            style={{ background: "linear-gradient(135deg, #7F77DD, #534ab3)", color: "#ffffff", boxShadow: "0 0 15px rgba(127, 119, 221, 0.3)" }}
          >
            <span>+</span>
            <span>Criar Usuário</span>
          </button>

          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            data-testid="open-generate-invite-modal-btn"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:brightness-110 active:scale-95"
            style={{ background: "linear-gradient(135deg, rgba(236, 72, 153, 0.22), rgba(127, 119, 221, 0.28))", color: "#f0eeff", border: "1px solid rgba(236, 72, 153, 0.4)" }}
          >
            <span>🎟️</span>
            <span>Gerar Convite</span>
          </button>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            title="Atualizar lista"
            data-testid="refresh-users-btn"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, rgba(127, 119, 221, 0.3), rgba(60, 52, 137, 0.5))",
              color: "#f0eeff",
              border: "1px solid rgba(127, 119, 221, 0.4)",
            }}
          >
            <span>🔄</span>
            <span>{loading ? "Atualizando..." : "Atualizar Lista"}</span>
          </button>
        </div>
      </div>

      {/* Seletor de Abas */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          data-testid="tab-usuarios-btn"
          onClick={() => setActiveTab("usuarios")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "usuarios" ? "shadow-lg shadow-[#7F77DD]/20" : "opacity-70 hover:opacity-100"
          }`}
          style={{
            background: activeTab === "usuarios" ? "linear-gradient(135deg, rgba(127, 119, 221, 0.3), rgba(60, 52, 137, 0.4))" : "rgba(255, 255, 255, 0.03)",
            color: activeTab === "usuarios" ? "#f0eeff" : "#8b87b8",
            border: activeTab === "usuarios" ? "1px solid rgba(127, 119, 221, 0.5)" : "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <span>👥 Usuários Cadastrados</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: activeTab === "usuarios" ? "rgba(127, 119, 221, 0.3)" : "rgba(255, 255, 255, 0.08)",
              color: activeTab === "usuarios" ? "#AFA9EC" : "#8b87b8",
            }}
          >
            {totalUsers}
          </span>
        </button>

        <button
          data-testid="tab-convites-btn"
          onClick={() => setActiveTab("convites")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "convites" ? "shadow-lg shadow-[#7F77DD]/20" : "opacity-70 hover:opacity-100"
          }`}
          style={{
            background: activeTab === "convites" ? "linear-gradient(135deg, rgba(127, 119, 221, 0.3), rgba(60, 52, 137, 0.4))" : "rgba(255, 255, 255, 0.03)",
            color: activeTab === "convites" ? "#f0eeff" : "#8b87b8",
            border: activeTab === "convites" ? "1px solid rgba(127, 119, 221, 0.5)" : "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <span>🎟️ Convites Gerados</span>
        </button>
      </div>

      {activeTab === "convites" ? (
        <ListaConvites />
      ) : (
        <>
          {/* Cards de Métricas */}
          <UsersMetricsCards
            totalUsers={totalUsers}
            adminCount={adminCount}
            clientCount={clientCount}
            internalClientCount={internalClientCount}
          />

      {/* Barra de Filtros */}
      <UsersFilterBar
        search={search}
        onChangeSearch={setSearch}
        roleFilter={roleFilter}
        onChangeRoleFilter={setRoleFilter}
        startDate={startDate}
        onChangeStartDate={setStartDate}
        endDate={endDate}
        onChangeEndDate={setEndDate}
        sortOrder={sortOrder}
        onChangeSortOrder={setSortOrder}
        onClearFilters={() => {
          setSearch("");
          setRoleFilter("");
          setStartDate("");
          setEndDate("");
          setSortOrder("desc");
        }}
      />

      {/* Barra de Ações em Massa (Usuários) */}
      {!loading && users.length > 0 && (
        <div
          data-testid="users-batch-bar"
          className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs"
          style={{ background: "#1a1535", border: "1px solid rgba(127, 119, 221, 0.2)" }}
        >
          <label className="flex items-center gap-2.5 cursor-pointer font-medium select-none" style={{ color: "#f0eeff" }}>
            <input
              type="checkbox"
              data-testid="select-all-users-btn"
              checked={isAllSelectedInPage}
              onChange={toggleSelectAllInPage}
              className="w-4 h-4 rounded cursor-pointer accent-purple-500"
            />
            <span>Selecionar todos da página ({selectableInPage.length})</span>
          </label>

          {selectedUserIds.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-semibold" style={{ color: "#AFA9EC" }}>
                {selectedUserIds.length} selecionado(s)
              </span>
              <button
                type="button"
                data-testid="clear-selection-users-btn"
                onClick={() => setSelectedUserIds([])}
                className="px-2.5 py-1 rounded-lg text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Limpar
              </button>
              <button
                type="button"
                data-testid="batch-edit-limits-btn"
                onClick={() => setShowBatchLimitsModal(true)}
                className="px-3.5 py-1.5 rounded-xl font-bold bg-[#7F77DD]/25 text-[#d6d3ff] border border-[#7F77DD]/45 hover:bg-[#7F77DD]/35 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-lg shadow-[#7F77DD]/10"
              >
                <span>⚡</span>
                <span>Editar Limites de IA</span>
              </button>
              <button
                type="button"
                data-testid="batch-delete-users-btn"
                onClick={() => setShowBatchDeleteModal(true)}
                className="px-3.5 py-1.5 rounded-xl font-bold bg-rose-500/20 text-rose-300 border border-rose-500/35 hover:bg-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-lg shadow-rose-500/10"
              >
                <span>🗑️</span>
                <span>Excluir Selecionados</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Listagem de Usuários */}
      {loading ? (
        <div className="py-16 text-center text-sm" style={{ color: "#8b87b8" }}>
          <div className="inline-block animate-spin text-2xl mb-2">🧭</div>
          <p>Carregando usuários do painel...</p>
        </div>
      ) : users.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center space-y-3"
          style={{ background: "#1a1535", border: "1px dashed rgba(127, 119, 221, 0.25)" }}
        >
          <div className="text-3xl">👥</div>
          <h4 className="font-semibold text-sm" style={{ color: "#f0eeff" }}>
            Nenhum usuário encontrado
          </h4>
          <p className="text-xs" style={{ color: "#8b87b8" }}>
            Tente ajustar os filtros de busca ou cadastre novos usuários.
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="users-list">
          {pagedUsers.map((u) => (
            <UsuarioCard
              key={u.id}
              user={u}
              isSelected={selectedUserIds.includes(u.id)}
              onToggleSelect={toggleSelectOne}
              onEdit={setEditingUser}
              onResetPassword={handleResetPassword}
              onDelete={setUserToDelete}
              formatBrasiliaDate={formatBrasiliaDate}
            />
          ))}
        </div>
      )}

      {/* Controles de Paginação (20 por página) */}
      {!loading && users.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={users.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemName="usuários"
        />
      )}
        </>
      )}

      {/* Modal de Criação de Usuário / Link de Convite */}
      <GerarConviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteCreated={fetchUsers}
      />

      {/* Modal de Edição de Usuário */}
      <EditarUsuarioModal isOpen={!!editingUser} user={editingUser} onClose={() => setEditingUser(null)} onUserUpdated={fetchUsers} />

      {/* Modal de Exibição do Link Seguro de Redefinição de Senha */}
      <RedefinirSenhaModal
        isOpen={!!resetModalData}
        userName={resetModalData?.name || ""}
        userEmail={resetModalData?.email || ""}
        resetUrl={resetModalData?.resetUrl || ""}
        onClose={() => setResetModalData(null)}
      />

      {/* Modal de Criação Manual de Usuário */}
      <CriarUsuarioModal isOpen={showCreateUserModal} onClose={() => setShowCreateUserModal(false)} onUserCreated={fetchUsers} />

      {/* Modal de Exclusão Individual de Usuário */}
      <ConfirmDeleteModal
        isOpen={!!userToDelete}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir permanentemente o usuário "${userToDelete?.name}"? Todos os seus dados e mapas associados serão removidos.`}
        count={1}
        confirmText="Sim, Excluir"
        loading={singleUserDeleteLoading}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmSingleUserDelete}
      />

      {/* Modal de Confirmação de Exclusão em Massa (Usuários) */}
      <ConfirmDeleteModal
        isOpen={showBatchDeleteModal}
        title="Excluir Usuários Selecionados"
        message={`Tem certeza que deseja excluir os ${selectedUserIds.length} usuários selecionados? Todos os dados associados serão removidos permanentemente.`}
        count={selectedUserIds.length}
        loading={batchDeleteLoading}
        onClose={() => setShowBatchDeleteModal(false)}
        onConfirm={handleConfirmBatchDelete}
      />

      {/* Modal de Edição de Limites de IA em Lote */}
      <BatchEditLimitsModal
        isOpen={showBatchLimitsModal}
        selectedUserIds={selectedUserIds}
        onClose={() => setShowBatchLimitsModal(false)}
        onUpdated={() => { setSelectedUserIds([]); fetchUsers(); }}
      />
    </div>
  );
}
