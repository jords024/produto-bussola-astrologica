"use client";

export const C = {
  bg: "#0f0b1e",
  card: "#1a1535",
  primary: "#7F77DD",
  light: "#AFA9EC",
  dark: "#3C3489",
  gold: "#EF9F27",
  text: "#f0eeff",
  muted: "#8b87b8",
  border: "rgba(127,119,221,0.2)",
};

export const FOCUS_OPTIONS = [
  { id: "amor", label: "Amor e Relacionamentos", icon: "❤️" },
  { id: "carreira", label: "Carreira e Propósito", icon: "💼" },
  { id: "dinheiro", label: "Dinheiro e Prosperidade", icon: "💰" },
  { id: "autoconhecimento", label: "Autoconhecimento", icon: "🧠" },
  { id: "familia", label: "Família e Origens", icon: "👨‍👩‍👧" },
  { id: "saude", label: "Energia e Saúde", icon: "⚡" },
];

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export interface CityOption {
  display: string;
  flag: string;
  city: string;
  state: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  tz_str: string;
}

export interface DstInfo {
  active: boolean | null;
  ambiguous: boolean;
  nonexistent: boolean;
  utc_offset: string | null;
  dst_offset_hours: number;
  tz_name: string;
}

export interface FormData {
  name: string;
  email: string;
  whatsapp: string;
  birth_day: string;
  birth_month: string;
  birth_year: string;
  birth_hour: string;
  birth_minute: string;
  no_birth_time: boolean;
  city_query: string;
  selected_city: CityOption | null;
  is_dst: boolean | null;
  focus_areas: string[];
  form_vida_agora: string;
  form_carrega_tempo: string;
  form_espera_descobrir: string;
}

export const INITIAL: FormData = {
  name: "", email: "", whatsapp: "",
  birth_day: "", birth_month: "", birth_year: "",
  birth_hour: "", birth_minute: "",
  no_birth_time: false,
  city_query: "", selected_city: null,
  is_dst: null,
  focus_areas: [],
  form_vida_agora: "", form_carrega_tempo: "", form_espera_descobrir: "",
};

export function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between mb-2">
        <span className="text-xs" style={{ color: C.muted }}>Passo {step} de {total}</span>
        <span className="text-xs" style={{ color: C.light }}>{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: C.border }}>
        <div
          className="h-1 rounded-full transition-all duration-500"
          style={{ width: `${(step / total) * 100}%`, background: C.primary }}
        />
      </div>
    </div>
  );
}

export function Btn({ onClick, children, disabled, variant = "primary" }: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean; variant?: "primary" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer disabled:opacity-40"
      style={variant === "primary"
        ? { background: C.primary, color: "#fff" }
        : { background: "transparent", color: C.muted, border: `1px solid ${C.border}` }
      }
    >
      {children}
    </button>
  );
}

export function Input({ value, onChange, placeholder, type = "text", disabled = false }: {
  value: string; onChange: (v: string) => void; placeholder: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-3 rounded-xl outline-none text-base transition-all disabled:opacity-40"
      style={{
        background: C.card,
        color: C.text,
        border: `1px solid ${C.border}`,
      }}
    />
  );
}

export function Textarea({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full px-4 py-3 rounded-xl outline-none text-sm resize-none"
      style={{ background: C.card, color: C.text, border: `1px solid ${C.border}` }}
    />
  );
}

export function Note({ children }: { children: string }) {
  return <p className="text-xs mt-2" style={{ color: C.muted }}>💡 {children}</p>;
}
