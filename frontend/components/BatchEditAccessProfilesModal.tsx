"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import AccessExpirationSelector, { type AccessPreset } from "@/components/AccessExpirationSelector";
import MultipleProfilesPermissionFields from "@/components/MultipleProfilesPermissionFields";

interface BatchEditAccessProfilesModalProps {
  isOpen: boolean;
  selectedUserIds: string[];
  onClose: () => void;
  onUpdated: () => void;
}

export default function BatchEditAccessProfilesModal({
  isOpen,
  selectedUserIds,
  onClose,
  onUpdated,
}: BatchEditAccessProfilesModalProps) {
  const [updateAccess, setUpdateAccess] = useState(true);
  const [accessPreset, setAccessPreset] = useState<AccessPreset>("lifetime");
  const [customExpiresDate, setCustomExpiresDate] = useState("");
  const [updateProfiles, setUpdateProfiles] = useState(true);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [unlimitedProfiles, setUnlimitedProfiles] = useState(true);
  const [maxExtraProfiles, setMaxExtraProfiles] = useState("5");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setUpdateAccess(true);
      setAccessPreset("lifetime");
      setCustomExpiresDate("");
      setUpdateProfiles(true);
      setAllowMultiple(false);
      setUnlimitedProfiles(true);
      setMaxExtraProfiles("5");
    }
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    if (!updateAccess && !updateProfiles) {
      toast.error("Marque ao menos uma opção (Tempo de Acesso ou Múltiplos Perfis) para aplicar.");
      return;
    }

    if (updateAccess && accessPreset === "custom" && !customExpiresDate) {
      toast.error("Selecione uma data exata de expiração.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ids: selectedUserIds,
        update_access: updateAccess,
        update_multiple_profiles: updateProfiles,
      };

      if (updateAccess) {
        if (accessPreset === "lifetime") {
          payload.clear_expiration = true;
        } else if (accessPreset === "custom") {
          payload.access_expires_at = customExpiresDate;
        } else {
          payload.access_days = Number(accessPreset);
        }
      }

      if (updateProfiles) {
        payload.allow_multiple_profiles = allowMultiple;
        if (allowMultiple) {
          payload.unlimited_extra_profiles = unlimitedProfiles;
          if (!unlimitedProfiles) {
            payload.max_extra_profiles = Math.max(1, Number(maxExtraProfiles) || 1);
          }
        }
      }

      const res = await api.put<{
        success: boolean;
        updated_count: number;
        skipped_admin_count?: number;
        message?: string;
      }>("/admin/users/batch-access-profiles", payload);

      const skipped = res?.skipped_admin_count || 0;
      const msg =
        skipped > 0
          ? `Acesso e perfis atualizados para ${res.updated_count} usuário(s) (${skipped} admin(s) ignorado(s)).`
          : res?.message || `Acesso e perfis atualizados para ${selectedUserIds.length} usuário(s)!`;
      toast.success(msg);
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || err?.message || "Erro ao atualizar acesso e perfis em lote.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      data-testid="batch-edit-access-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        data-testid="batch-edit-access-modal"
        className="w-full max-w-lg rounded-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.35)",
        }}
      >
        <div>
          <h4 className="text-base font-bold" style={{ color: "#f0eeff" }}>
            ⏳ Editar Acesso e Perfis em Lote
          </h4>
          <p className="text-xs mt-1" style={{ color: "#8b87b8" }}>
            As alterações marcadas serão aplicadas para{" "}
            <strong className="text-[#c4b5fd]">{selectedUserIds.length} usuário(s)</strong> selecionado(s).
            Administradores permanecem ilimitados e vitalícios.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none" style={{ color: "#f0eeff" }}>
              <input
                type="checkbox"
                data-testid="batch-toggle-update-access"
                checked={updateAccess}
                onChange={(e) => setUpdateAccess(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
              />
              <span>Alterar Tempo de Acesso (IA)</span>
            </label>

            {updateAccess && (
              <AccessExpirationSelector
                role="client"
                preset={accessPreset}
                customDate={customExpiresDate}
                onChangePreset={setAccessPreset}
                onChangeCustomDate={setCustomExpiresDate}
              />
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none" style={{ color: "#f0eeff" }}>
              <input
                type="checkbox"
                data-testid="batch-toggle-update-profiles"
                checked={updateProfiles}
                onChange={(e) => setUpdateProfiles(e.target.checked)}
                className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
              />
              <span>Alterar Múltiplos Perfis</span>
            </label>

            {updateProfiles && (
              <MultipleProfilesPermissionFields
                role="client"
                allowMultiple={allowMultiple}
                onAllowChange={setAllowMultiple}
                unlimited={unlimitedProfiles}
                onUnlimitedChange={setUnlimitedProfiles}
                maxLimit={maxExtraProfiles}
                onMaxLimitChange={setMaxExtraProfiles}
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              data-testid="batch-edit-access-cancel-btn"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[#251f49] text-[#d6d3ff] hover:bg-[#31295f] cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="batch-edit-access-submit-btn"
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
