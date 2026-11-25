"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import MultiProfilesUpsellBanner from "@/components/MultiProfilesUpsellBanner";

export interface AstroProfileItem {
  id: string;
  name: string;
  relationship_label?: string;
  birth_date: string | null;
  birth_time: string;
  birth_city: string;
  birth_state: string;
  birth_country: string;
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  has_chart: boolean;
  has_sections: boolean;
}

interface AstroProfileSelectorProps {
  ownerName?: string;
  selectedProfileId: string;
  onChange: (profileId: string, profileName?: string) => void;
  label?: string;
  refreshKey?: number;
  showUpsellBanner?: boolean;
}

export default function AstroProfileSelector({
  ownerName,
  selectedProfileId,
  onChange,
  label = "Selecionar pessoa:",
  refreshKey = 0,
  showUpsellBanner = false,
}: AstroProfileSelectorProps) {
  const [profiles, setProfiles] = useState<AstroProfileItem[]>([]);
  const [allowMultiple, setAllowMultiple] = useState<boolean | null>(null);
  const [upsellUrl, setUpsellUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get<{
          allow_multiple_profiles?: boolean;
          upsell_url?: string | null;
          profiles?: AstroProfileItem[];
        }>("/members/profiles");
        if (!active) return;
        if (typeof res?.allow_multiple_profiles === "boolean") {
          setAllowMultiple(res.allow_multiple_profiles);
        }
        setUpsellUrl((res?.upsell_url || "").trim() || null);
        if (Array.isArray(res?.profiles)) {
          setProfiles(res.profiles);
        }
      } catch {
        // Silencioso para retrocompatibilidade caso o endpoint não seja mockado
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const shouldShowBanner = Boolean(showUpsellBanner && allowMultiple === false && upsellUrl);

  if (profiles.length === 0) {
    return shouldShowBanner ? <MultiProfilesUpsellBanner url={upsellUrl} variant="compact" /> : null;
  }

  const principalLabel = ownerName ? `Meu Perfil (${ownerName.split(" ")[0]})` : "Meu Perfil (Principal)";

  return (
    <div
      data-testid="astro-profile-selector"
      className="rounded-xl p-3 flex flex-wrap items-center justify-between gap-3"
      style={{
        background: "rgba(127, 119, 221, 0.08)",
        border: "1px solid rgba(127, 119, 221, 0.3)",
      }}
    >
      <label
        htmlFor="astro-profile-select"
        className="text-xs font-semibold flex items-center gap-1.5"
        style={{ color: "#AFA9EC" }}
      >
        <span>👥</span>
        <span>{label}</span>
      </label>

      <select
        id="astro-profile-select"
        data-testid="astro-profile-select"
        value={selectedProfileId}
        onChange={(e) => {
          const val = e.target.value;
          const found = profiles.find((p) => p.id === val);
          onChange(val, found?.name);
        }}
        className="rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer min-w-[220px]"
        style={{
          background: "#14102b",
          border: "1px solid rgba(127, 119, 221, 0.4)",
          color: "#f0eeff",
        }}
      >
        <option value="">{principalLabel}</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.relationship_label ? ` (${p.relationship_label})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
