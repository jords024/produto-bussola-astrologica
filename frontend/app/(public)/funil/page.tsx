"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, saveToken, getBaseUrl } from "@/lib/api";

import {
  C, FOCUS_OPTIONS, MONTHS, INITIAL,
  Progress, Btn, Input, Note,
  type CityOption, type DstInfo, type FormData,
} from '@/components/funil/FunilUi';
import FunilStepCity from '@/components/funil/FunilStepCity';
import FunilStepQuestions from '@/components/funil/FunilStepQuestions';

export default function Funil() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ name: string; sun_sign: string; token: string; email: string; password?: string } | null>(null);

  // City autocomplete state
  const [cityResults, setCityResults] = useState<CityOption[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DST detection state
  const [dstInfo, setDstInfo] = useState<DstInfo | null>(null);
  const [dstLoading, setDstLoading] = useState(false);

  const router = useRouter();

  const set = (k: keyof FormData) => (v: string | boolean | string[] | CityOption | null) =>
    setForm(f => ({ ...f, [k]: v }));

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const toggleFocus = (id: string) => {
    const cur = form.focus_areas;
    if (cur.includes(id)) set("focus_areas")(cur.filter((x: string) => x !== id));
    else if (cur.length < 2) set("focus_areas")([...cur, id]);
  };

  // City search with debounce
  const onCityInput = (q: string) => {
    setForm(f => ({ ...f, city_query: q, selected_city: null }));
    setDstInfo(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setCityResults([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setCityLoading(true);
      try {
        const results = await api.get<CityOption[]>(`/geocoding/search?q=${encodeURIComponent(q.trim())}`);
        setCityResults(results);
        setShowDropdown(results.length > 0);
      } catch { setCityResults([]); }
      finally { setCityLoading(false); }
    }, 400);
  };

  const selectCity = (city: CityOption) => {
    setForm(f => ({ ...f, selected_city: city, city_query: city.display, is_dst: null }));
    setShowDropdown(false);
    setCityResults([]);
    // Check DST if birth date is already filled
    if (form.birth_day && form.birth_month && form.birth_year) {
      checkDst(city.tz_str, form.birth_year, form.birth_month, form.birth_day, form.birth_hour, form.birth_minute);
    }
  };

  const checkDst = async (tz: string, year: string, month: string, day: string, hour: string, minute: string) => {
    if (!tz || !year || !month || !day) return;
    const h = hour || "12";
    const m = minute || "0";
    setDstLoading(true);
    try {
      const info = await api.get<DstInfo>(
        `/geocoding/check-dst?year=${year}&month=${parseInt(month)}&day=${parseInt(day)}&hour=${parseInt(h)}&minute=${parseInt(m)}&tz=${encodeURIComponent(tz)}`
      );
      setDstInfo(info);
    } catch { setDstInfo(null); }
    finally { setDstLoading(false); }
  };

  // Pré-aquece o servidor Render imediatamente ao abrir o funil (evita cold start na busca de cidades)
  useEffect(() => {
    fetch(`${getBaseUrl()}/health`).catch(() => {});
  }, []);

  // Check DST quando entra no step 7
  useEffect(() => {
    if (step === 7) {
      if (form.selected_city && form.birth_day && form.birth_month && form.birth_year) {
        checkDst(form.selected_city.tz_str, form.birth_year, form.birth_month, form.birth_day, form.birth_hour, form.birth_minute);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const submit = async () => {
    setLoading(true);
    setError("");

    const hour = form.no_birth_time ? "12" : (form.birth_hour || "12");
    const minute = form.no_birth_time ? "00" : (form.birth_minute || "00");
    const birth_time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    const birth_date = `${form.birth_year}-${form.birth_month.padStart(2, "0")}-${form.birth_day.padStart(2, "0")}`;
    const city = form.selected_city;
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      whatsapp: form.whatsapp,
      birth_date,
      birth_time,
      birth_city: city?.city || form.city_query,
      birth_state: city?.state || "",
      birth_country: city?.country || "Brasil",
      focus_areas: form.focus_areas,
      form_vida_agora: form.form_vida_agora,
      form_carrega_tempo: form.form_carrega_tempo,
      form_espera_descobrir: form.form_espera_descobrir,
    };
    if (city) { payload.lat = city.lat; payload.lng = city.lng; payload.tz_str = city.tz_str; }
    if (dstInfo?.ambiguous && form.is_dst !== null) payload.is_dst = form.is_dst;

    try {
      const res = await api.post<{ token: string; user_id: string; sun_sign: string; password?: string }>(
        "/funnel/submit", payload
      );
      saveToken(res.token);
      setResult({ name: form.name, sun_sign: res.sun_sign, token: res.token, email: form.email, password: res.password });
      setLoading(false);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Erro ao gerar mapa";
      setError(errMsg);
      setLoading(false);
    }
  };

  const wrapper = (children: React.ReactNode) => (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: C.bg }}>
      <div className="w-full max-w-lg">
        {step > 1 && !result && <Progress step={step - 1} total={7} />}
        {children}
      </div>
    </main>
  );

  // Tela de resultado
  if (result) return wrapper(
    <div className="text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl"
        style={{ background: C.dark }}>✓</div>
      <h2 className="text-3xl font-bold mb-2" style={{ color: C.light }}>
        Obrigada, {result.name.split(" ")[0]}! ✨
      </h2>
      <p className="mb-6" style={{ color: C.muted }}>Seus dados foram recebidos com sucesso!</p>
      
      <div className="rounded-2xl p-6 mb-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p style={{ color: C.muted }} className="text-sm mb-1">Seu signo solar</p>
        <p className="text-2xl font-bold" style={{ color: C.gold }}>☀️ {result.sun_sign}</p>
      </div>

      {result.password && (
        <div className="rounded-2xl p-6 mb-8 text-left" style={{ background: `${C.primary}10`, border: `1px dashed ${C.primary}` }}>
          <p className="font-bold text-sm mb-3 text-center" style={{ color: C.light }}>🔐 Sua Conta de Acesso Criada!</p>
          <p className="text-xs mb-4 text-center" style={{ color: C.muted }}>
            Guarde seus dados abaixo para acessar seu Mapa Astral quando quiser:
          </p>
          <div className="space-y-3">
            <div>
              <span className="text-xs block" style={{ color: C.muted }}>E-mail:</span>
              <code className="text-sm font-semibold select-all block p-2 rounded bg-black/40 mt-1" style={{ color: C.text }}>
                {result.email}
              </code>
            </div>
            <div>
              <span className="text-xs block" style={{ color: C.muted }}>Senha Temporária:</span>
              <code className="text-sm font-semibold select-all block p-2 rounded bg-black/40 mt-1" style={{ color: C.gold }}>
                {result.password}
              </code>
            </div>
          </div>
          <p className="text-[10px] mt-4 text-center italic" style={{ color: C.muted }}>
            *Dica: Você pode copiar os dados acima segurando e selecionando o texto.
          </p>
        </div>
      )}

      <Btn onClick={() => router.push("/dashboard")}>Acessar Meu Mapa →</Btn>
    </div>
  );

  // Loading
  if (loading) return wrapper(
    <div className="text-center py-16">
      <div className="text-6xl mb-8 animate-pulse inline-block">🌌</div>
      <p className="text-xl font-semibold mb-3" style={{ color: C.light }}>
        Crassus está lendo a sua bússola...
      </p>
      <p className="text-sm mb-6" style={{ color: C.muted }}>
        Estamos gerando sua leitura personalizada com base no céu do momento do seu nascimento.
      </p>
      <div className="rounded-xl px-6 py-4 mx-auto max-w-xs" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-xs" style={{ color: C.muted }}>⏳ Este processo leva cerca de 1 a 2 minutos — não feche esta página.</p>
      </div>
    </div>
  );

  // Passo 1 — Boas-vindas
  if (step === 1) return wrapper(
    <div className="text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl"
        style={{ background: C.dark }}>🎁</div>
      <h1 className="text-3xl font-bold mb-3" style={{ color: C.light }}>Parabéns pela sua decisão!</h1>
      <p className="mb-8" style={{ color: C.muted }}>Você deu o primeiro passo para uma transformação real.</p>
      <div className="space-y-3 mb-10 text-left">
        {[
          ["🌟", "Sua Leitura Personalizada", "Gerada exclusivamente com os dados do seu nascimento"],
          ["🎯", "Cada Detalhe Importa", "Quanto mais precisas suas respostas, mais profunda a leitura"],
          ["⏱️", "Leva só 3 minutinhos", "Um processo simples para uma transformação profunda"],
        ].map(([icon, title, desc]) => (
          <div key={title} className="flex gap-4 p-4 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="font-semibold" style={{ color: C.text }}>{title}</p>
              <p className="text-sm" style={{ color: C.muted }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <Btn onClick={next}>Começar Minha Jornada →</Btn>
    </div>
  );

  // Passo 2 — Áreas
  if (step === 2) return wrapper(
    <div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: C.light }}>Antes de começarmos...</h2>
      <p className="mb-1" style={{ color: C.muted }}>Quais áreas da sua vida mais precisam de atenção agora?</p>
      <p className="text-xs mb-6" style={{ color: C.muted }}>Escolha até 2 áreas</p>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {FOCUS_OPTIONS.map(opt => {
          const sel = form.focus_areas.includes(opt.id);
          return (
            <button key={opt.id} onClick={() => toggleFocus(opt.id)}
              className="p-4 rounded-xl text-left transition-all"
              style={{
                background: sel ? `${C.dark}` : C.card,
                border: `1px solid ${sel ? C.primary : C.border}`,
                color: sel ? C.light : C.muted,
              }}>
              <span className="text-2xl block mb-1">{opt.icon}</span>
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between">
        <Btn onClick={back} variant="ghost">Voltar</Btn>
        <Btn onClick={next} disabled={form.focus_areas.length === 0}>Continuar</Btn>
      </div>
    </div>
  );

  // Passo 3 — Nome
  if (step === 3) return wrapper(
    <div>
      <h2 className="text-2xl font-bold mb-6" style={{ color: C.light }}>Qual é o seu nome completo?</h2>
      <Input value={form.name} onChange={set("name")} placeholder="Digite seu nome completo" />
      <Note>Use o nome como está no seu documento de identidade</Note>
      <p className="mt-8 text-sm italic text-center" style={{ color: C.muted }}>
        "Cada resposta sua calibra a sua Bússola de forma mais precisa e tática." — Crassus
      </p>
      <div className="flex justify-between mt-8">
        <Btn onClick={back} variant="ghost">Voltar</Btn>
        <Btn onClick={next} disabled={!form.name.trim()}>Continuar</Btn>
      </div>
    </div>
  );

  // Passo 4 — Contato
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim());
  if (step === 4) return wrapper(
    <div>
      <h2 className="text-2xl font-bold mb-6" style={{ color: C.light }}>Como posso te encontrar?</h2>
      <div className="space-y-4">
        <div>
          <Input value={form.email} onChange={set("email")} placeholder="Seu melhor email" type="email" />
          {form.email.trim() && !emailValid && (
            <p className="text-xs mt-1" style={{ color: "#ff8080" }}>⚠ Digite um e-mail válido (ex: nome@dominio.com)</p>
          )}
        </div>
        <Input value={form.whatsapp} onChange={set("whatsapp")} placeholder="WhatsApp com DDD (ex: 51 99999-9999)" />
      </div>
      <Note>Suas informações são confidenciais e seguras</Note>
      <div className="flex justify-between mt-8">
        <Btn onClick={back} variant="ghost">Voltar</Btn>
        <Btn onClick={next} disabled={!emailValid}>Continuar</Btn>
      </div>
    </div>
  );

  // Passo 5 — Data
  const dayNum   = parseInt(form.birth_day,  10);
  const yearNum  = parseInt(form.birth_year, 10);
  const dayValid  = form.birth_day  && dayNum  >= 1  && dayNum  <= 31;
  const yearValid = form.birth_year && form.birth_year.length === 4 && yearNum >= 1900 && yearNum <= new Date().getFullYear();
  const dateOk    = !!dayValid && !!form.birth_month && !!yearValid;

  if (step === 5) return wrapper(
    <div>
      <h2 className="text-2xl font-bold mb-6" style={{ color: C.light }}>Quando você nasceu?</h2>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: C.muted }}>Dia</label>
          <Input value={form.birth_day} onChange={v => set("birth_day")(v.replace(/\D/g, "").slice(0,2))} placeholder="DD" />
          {form.birth_day && !dayValid && (
            <p className="text-xs mt-1" style={{ color: "#ff8080" }}>1–31</p>
          )}
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: C.muted }}>Mês</label>
          <select
            value={form.birth_month}
            onChange={e => set("birth_month")(e.target.value)}
            className="w-full px-3 py-3 rounded-xl outline-none text-base"
            style={{ background: C.card, color: form.birth_month ? C.text : C.muted, border: `1px solid ${C.border}` }}
          >
            <option value="">Mês</option>
            {MONTHS.map((m, i) => (
              <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: C.muted }}>Ano</label>
          <Input value={form.birth_year} onChange={v => set("birth_year")(v.replace(/\D/g, "").slice(0,4))} placeholder="AAAA" />
          {form.birth_year && !yearValid && (
            <p className="text-xs mt-1" style={{ color: "#ff8080" }}>Ano inválido</p>
          )}
        </div>
      </div>
      <Note>A data exata é essencial para a precisão do seu mapa</Note>
      <div className="flex justify-between mt-8">
        <Btn onClick={back} variant="ghost">Voltar</Btn>
        <Btn onClick={next} disabled={!dateOk}>Continuar</Btn>
      </div>
    </div>
  );

  // Passo 6 — Hora
  const hourNum   = parseInt(form.birth_hour,   10);
  const minNum    = parseInt(form.birth_minute, 10);
  const hourValid = form.birth_hour   !== "" && hourNum >= 0 && hourNum <= 23;
  const minValid  = form.birth_minute !== "" && minNum  >= 0 && minNum  <= 59;
  const timeOk    = form.no_birth_time || (hourValid && minValid);

  if (step === 6) return wrapper(
    <div>
      <h2 className="text-2xl font-bold mb-6" style={{ color: C.light }}>Que horas você nasceu?</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs mb-1 block" style={{ color: C.muted }}>Hora (0–23)</label>
          <Input
            value={form.birth_hour}
            onChange={v => set("birth_hour")(v.replace(/\D/g, "").slice(0,2))}
            placeholder="HH"
            disabled={form.no_birth_time}
          />
          {!form.no_birth_time && form.birth_hour && !hourValid && (
            <p className="text-xs mt-1" style={{ color: "#ff8080" }}>Entre 0 e 23</p>
          )}
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: C.muted }}>Minuto (0–59)</label>
          <Input
            value={form.birth_minute}
            onChange={v => set("birth_minute")(v.replace(/\D/g, "").slice(0,2))}
            placeholder="MM"
            disabled={form.no_birth_time}
          />
          {!form.no_birth_time && form.birth_minute && !minValid && (
            <p className="text-xs mt-1" style={{ color: "#ff8080" }}>Entre 0 e 59</p>
          )}
        </div>
      </div>
      <Note>Se não souber a hora exata, use aproximadamente. A certidão de nascimento tem essa informação.</Note>
      <label className="flex items-center gap-3 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={form.no_birth_time}
          onChange={e => set("no_birth_time")(e.target.checked)}
          className="w-4 h-4"
          style={{ accentColor: C.primary }}
        />
        <span className="text-sm" style={{ color: C.muted }}>Não sei minha hora de nascimento</span>
      </label>
      <div className="flex justify-between mt-8">
        <Btn onClick={back} variant="ghost">Voltar</Btn>
        <Btn onClick={next} disabled={!timeOk}>Continuar</Btn>
      </div>
    </div>
  );

  if (step === 7) return wrapper(
    <FunilStepCity
      form={form}
      cityResults={cityResults}
      cityLoading={cityLoading}
      showDropdown={showDropdown}
      dstInfo={dstInfo}
      onCityInput={onCityInput}
      setShowDropdown={setShowDropdown}
      selectCity={selectCity}
      onClearCity={() => { setForm(f => ({ ...f, selected_city: null, city_query: '' })); setDstInfo(null); }}
      onSelectDst={(v) => set('is_dst')(v)}
      onBack={back}
      onNext={next}
    />
  );

  return wrapper(
    <FunilStepQuestions
      form={form}
      loading={loading}
      error={error}
      onChangeField={(k, v) => set(k)(v)}
      onBack={back}
      onSubmit={submit}
    />
  );
}
