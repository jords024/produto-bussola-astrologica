"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import CityAutocomplete from "@/components/CityAutocomplete";
import BrazilStateSelect from "@/components/BrazilStateSelect";
import { CityOption, COUNTRIES } from "@/lib/locationConstants";
import type { AstroProfileItem } from "@/components/AstroProfileSelector";
import GeneratingChartModal from "@/components/GeneratingChartModal";

interface ProfilesResponse {
  allow_multiple_profiles: boolean;
  max_extra_profiles: number | null;
  used_extra_profiles: number;
  remaining_extra_profiles: number | null;
  profiles: AstroProfileItem[];
}

interface PerfisExtrasManagerProps {
  onProfilesUpdated?: () => void;
}

export default function PerfisExtrasManager({ onProfilesUpdated }: PerfisExtrasManagerProps) {
  const [data, setData] = useState<ProfilesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [relationshipLabel, setRelationshipLabel] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("12:00");
  const [unknownTime, setUnknownTime] = useState(false);
  const [country, setCountry] = useState("Brasil");
  const [stateUf, setStateUf] = useState("");
  const [city, setCity] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [tzStr, setTzStr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<AstroProfileItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ProfilesResponse>("/members/profiles");
      if (res && typeof res.allow_multiple_profiles === "boolean") {
        setData(res);
      }
    } catch {
      // Silencioso caso o usuário não tenha suporte ou em testes legados
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  if (!data || (!data.allow_multiple_profiles && data.profiles.length === 0)) {
    return null;
  }

  const limitReached =
    data.max_extra_profiles !== null && data.used_extra_profiles >= data.max_extra_profiles;

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setRelationshipLabel("");
    setBirthDate("");
    setBirthTime("12:00");
    setUnknownTime(false);
    setCountry("Brasil");
    setStateUf("");
    setCity("");
    setLat(null);
    setLng(null);
    setTzStr(null);
  };

  const openNewForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (p: AstroProfileItem) => {
    setEditingId(p.id);
    setName(p.name || "");
    setRelationshipLabel(p.relationship_label || "");
    setBirthDate(p.birth_date || "");
    setBirthTime(p.birth_time || "12:00");
    setUnknownTime(p.birth_time === "12:00");
    setCountry(p.birth_country || "Brasil");
    setStateUf(p.birth_state || "");
    setCity(p.birth_city || "");
    setLat(null);
    setLng(null);
    setTzStr(null);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe o nome da pessoa.");
    if (!birthDate) return toast.error("Informe a data de nascimento.");
    if (!city.trim()) return toast.error("Informe a cidade de nascimento.");

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        relationship_label: relationshipLabel.trim(),
        birth_date: birthDate,
        birth_time: unknownTime ? "12:00" : birthTime || "12:00",
        birth_city: city.trim(),
        birth_state: stateUf.trim(),
        birth_country: country.trim() || "Brasil",
        lat,
        lng,
        tz_str: tzStr,
      };

      if (editingId) {
        await api.put(`/members/profiles/${editingId}`, payload);
        toast.success(`Mapa de ${name.trim()} atualizado com sucesso!`);
      } else {
        await api.post("/members/profiles", payload);
        toast.success(`Mapa de ${name.trim()} gerado e cadastrado com sucesso!`);
      }
      setFormOpen(false);
      resetForm();
      await loadProfiles();
      onProfilesUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar pessoa.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/members/profiles/${confirmDeleteTarget.id}`);
      toast.success("Pessoa removida com sucesso.");
      setConfirmDeleteTarget(null);
      await loadProfiles();
      onProfilesUpdated?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover pessoa.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      data-testid="perfis-extras-section"
      className="mt-6 rounded-2xl p-5 sm:p-6 space-y-4"
      style={{
        background: "#131122",
        border: "1px solid rgba(127, 119, 221, 0.25)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-bold flex items-center gap-2" style={{ color: "#f0eeff" }}>
            <span>👥</span> Outras Pessoas Cadastradas
          </h4>
          <p className="text-xs mt-0.5" style={{ color: "#8b87b8" }}>
            {data.max_extra_profiles === null
              ? `${data.used_extra_profiles} pessoa(s) cadastrada(s) • Limite ilimitado`
              : `${data.used_extra_profiles} de ${data.max_extra_profiles} pessoa(s) cadastrada(s)`}
          </p>
        </div>

        {data.allow_multiple_profiles && (
          <button
            type="button"
            data-testid="add-extra-profile-btn"
            disabled={limitReached || loading}
            onClick={openNewForm}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #7F77DD, #534ab3)",
              color: "#ffffff",
            }}
          >
            {limitReached ? "Limite Atingido" : "+ Cadastrar Nova Pessoa"}
          </button>
        )}
      </div>

      {formOpen && (
        <form
          onSubmit={handleSave}
          data-testid="extra-profile-form"
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(127, 119, 221, 0.35)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#AFA9EC" }}>
              {editingId ? "Editar Pessoa" : "Nova Pessoa (Gera Mapa Astral Completo)"}
            </span>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              className="text-xs px-2.5 py-1 rounded-lg hover:bg-white/10 cursor-pointer"
              style={{ color: "#8b87b8" }}
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: "#AFA9EC" }}>
                Nome Completo *
              </label>
              <input
                type="text"
                data-testid="extra-profile-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maria Clara"
                className="w-full rounded-xl px-3 py-2 text-xs outline-none"
                style={{ background: "#14102b", border: "1px solid rgba(127, 119, 221, 0.3)", color: "#f0eeff" }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: "#AFA9EC" }}>
                Parentesco / Rótulo (opcional)
              </label>
              <input
                type="text"
                data-testid="extra-profile-label-input"
                value={relationshipLabel}
                onChange={(e) => setRelationshipLabel(e.target.value)}
                placeholder="Ex: Filho, Esposa, Cliente"
                className="w-full rounded-xl px-3 py-2 text-xs outline-none"
                style={{ background: "#14102b", border: "1px solid rgba(127, 119, 221, 0.3)", color: "#f0eeff" }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: "#AFA9EC" }}>
                Data de Nascimento *
              </label>
              <input
                type="date"
                data-testid="extra-profile-date-input"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs outline-none"
                style={{ background: "#14102b", border: "1px solid rgba(127, 119, 221, 0.3)", color: "#f0eeff" }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium" style={{ color: "#AFA9EC" }}>
                  Hora de Nascimento
                </label>
                <label className="inline-flex items-center gap-1 text-[11px] cursor-pointer" style={{ color: "#8b87b8" }}>
                  <input
                    type="checkbox"
                    checked={unknownTime}
                    onChange={(e) => setUnknownTime(e.target.checked)}
                    className="accent-[#7f77dd]"
                  />
                  Não sei
                </label>
              </div>
              <input
                type="time"
                data-testid="extra-profile-time-input"
                disabled={unknownTime}
                value={unknownTime ? "12:00" : birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs outline-none disabled:opacity-50"
                style={{ background: "#14102b", border: "1px solid rgba(127, 119, 221, 0.3)", color: "#f0eeff" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: "#AFA9EC" }}>
                País
              </label>
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setStateUf("");
                }}
                className="w-full rounded-xl px-3 py-2 text-xs outline-none"
                style={{ background: "#14102b", border: "1px solid rgba(127, 119, 221, 0.3)", color: "#f0eeff" }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: "#AFA9EC" }}>
                Estado
              </label>
              {country === "Brasil" ? (
                <BrazilStateSelect value={stateUf} onChange={setStateUf} />
              ) : (
                <input
                  type="text"
                  value={stateUf}
                  onChange={(e) => setStateUf(e.target.value)}
                  placeholder="Estado / Província"
                  className="w-full rounded-xl px-3 py-2 text-xs outline-none"
                  style={{ background: "#14102b", border: "1px solid rgba(127, 119, 221, 0.3)", color: "#f0eeff" }}
                />
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: "#AFA9EC" }}>
                Cidade *
              </label>
              <CityAutocomplete
                city={city}
                coords={lat !== null && lng !== null ? { lat, lng } : null}
                state={stateUf}
                country={country}
                hideLabel
                hideBadge
                onChangeCity={(val) => {
                  setCity(val);
                  setLat(null);
                  setLng(null);
                }}
                onSelectCity={(opt: CityOption) => {
                  setCity(opt.city);
                  setStateUf(opt.state || stateUf);
                  setLat(opt.lat);
                  setLng(opt.lng);
                  setTzStr(opt.tz_str || null);
                }}
                placeholder="Digite a cidade..."
                inputClassName="w-full rounded-xl px-3 py-2 text-xs outline-none"
                inputStyle={{ background: "#14102b", border: "1px solid rgba(127, 119, 221, 0.3)", color: "#f0eeff" }}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              data-testid="save-extra-profile-btn"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #E2B857, #c99a32)",
                color: "#14102b",
              }}
            >
              {saving ? "Gerando Mapa Astral..." : editingId ? "Salvar e Recalcular Mapa" : "Cadastrar & Gerar Mapa"}
            </button>
          </div>
        </form>
      )}

      {data.profiles.length === 0 ? (
        <div className="text-xs py-3 text-center" style={{ color: "#8b87b8" }}>
          Nenhuma pessoa extra cadastrada ainda. Clique em &ldquo;+ Cadastrar Nova Pessoa&rdquo; acima para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.profiles.map((p) => (
            <div
              key={p.id}
              data-testid={`extra-profile-card-${p.id}`}
              className="rounded-xl p-3.5 flex items-start justify-between gap-3"
              style={{
                background: "#1a1535",
                border: "1px solid rgba(127, 119, 221, 0.25)",
              }}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold truncate" style={{ color: "#f0eeff" }}>
                    {p.name}
                  </span>
                  {p.relationship_label && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30">
                      {p.relationship_label}
                    </span>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: "#8b87b8" }}>
                  {p.birth_date || "—"} • {p.birth_city}
                </p>
                {p.sun_sign && (
                  <p className="text-[11px]" style={{ color: "#AFA9EC" }}>
                    ☀️ {p.sun_sign} · 🌙 {p.moon_sign} · ⬆️ {p.rising_sign}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditForm(p)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#251f49] hover:bg-[#31295f] text-[#d6d3ff] cursor-pointer"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTarget(p)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-red-500/15 hover:bg-red-500/30 text-red-300 cursor-pointer"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <GeneratingChartModal
        isOpen={saving}
        personName={name.trim()}
        isEditing={Boolean(editingId)}
      />

      {confirmDeleteTarget && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl bg-[#1a1535] border border-red-500/30 p-6 space-y-4 shadow-2xl">
              <h5 className="text-base font-bold text-[#f0eeff]">
                Remover {confirmDeleteTarget.name}?
              </h5>
              <p className="text-xs text-[#b4b0dc]">
                O mapa astral desta pessoa será removido da sua lista. As leituras já salvas no Diário de Bordo serão preservadas.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#251f49] text-[#d6d3ff] hover:bg-[#31295f] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white cursor-pointer disabled:opacity-50"
                >
                  {deleting ? "Removendo..." : "Confirmar Exclusão"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
