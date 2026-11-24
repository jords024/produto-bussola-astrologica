"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import RequestLimitsFields, { type RequestLimitMode } from "@/components/RequestLimitsFields";

interface BatchEditLimitsModalProps {
  isOpen: boolean;
  selectedUserIds: string[];
  onClose: () => void;
  onUpdated: () => void;
}

export default function BatchEditLimitsModal({
  isOpen,
  selectedUserIds,
  onClose,
  onUpdated,
}: BatchEditLimitsModalProps) {
  const [limitMode, setLimitMode] = useState<RequestLimitMode>("quota_then_daily");
  const [unlimitedDaily, setUnlimitedDaily] = useState(false);
  const [dailyLimit, setDailyLimit] = useState("5");
  const [unlimitedTotal, setUnlimitedTotal] = useState(false);
  const [totalLimit, setTotalLimit] = useState("300");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLimitMode("quota_then_daily");
      setUnlimitedDaily(false);
      setDailyLimit("5");
      setUnlimitedTotal(false);
      setTotalLimit("300");
    }
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    setSaving(true);
    try {
      const payload = {
        ids: selectedUserIds,
        request_limit_mode: limitMode,
        unlimited_daily_requests: unlimitedDaily,
        daily_request_limit: unlimitedDaily ? null : Math.max(1, Number(dailyLimit) || 1),
        unlimited_total_requests: unlimitedTotal,
        max_total_requests: unlimitedTotal ? null : Math.max(1, Number(totalLimit) || 1),
      };
      const res = await api.put<{
        success: boolean;
        updated_count: number;
        skipped_admin_count?: number;
        message?: string;
      }>("/admin/users/batch-limits", payload);

      const skipped = res?.skipped_admin_count || 0;
      const msg =
        skipped > 0
          ? `Limites atualizados para ${res.updated_count} usuário(s) (${skipped} admin(s) ignorado(s)).`
          : res?.message || `Limites atualizados para ${selectedUserIds.length} usuário(s)!`;
      toast.success(msg);
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Erro ao atualizar limites em lote.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      data-testid="batch-edit-limits-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        data-testid="batch-edit-limits-modal"
        className="w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.35)",
        }}
      >
        <div>
          <h4 className="text-base font-bold" style={{ color: "#f0eeff" }}>
            ⚡ Editar Limites de IA em Lote
          </h4>
          <p className="text-xs mt-1" style={{ color: "#8b87b8" }}>
            A configuração abaixo será aplicada para{" "}
            <strong className="text-[#c4b5fd]">{selectedUserIds.length} usuário(s)</strong> selecionado(s).
            Administradores permanecem ilimitados automaticamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <RequestLimitsFields
            role="client"
            limitMode={limitMode}
            onLimitModeChange={setLimitMode}
            unlimitedDaily={unlimitedDaily}
            onUnlimitedDailyChange={setUnlimitedDaily}
            dailyLimit={dailyLimit}
            onDailyLimitChange={setDailyLimit}
            unlimitedTotal={unlimitedTotal}
            onUnlimitedTotalChange={setUnlimitedTotal}
            totalLimit={totalLimit}
            onTotalLimitChange={setTotalLimit}
          />

          <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              data-testid="batch-edit-limits-cancel-btn"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#251f49] text-[#d6d3ff] hover:bg-[#31295f] cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="batch-edit-limits-submit-btn"
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7F77DD, #534ab3)",
                boxShadow: "0 0 15px rgba(127, 119, 221, 0.3)",
              }}
            >
              {saving ? "Aplicando..." : `Aplicar para ${selectedUserIds.length} selecionado(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
