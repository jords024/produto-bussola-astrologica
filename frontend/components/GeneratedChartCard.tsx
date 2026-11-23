"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import ChartZoomModal from "@/components/ChartZoomModal";
import LeituraCliente from "@/components/LeituraCliente";

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_state: string;
  birth_country?: string;
  lat?: number;
  lng?: number;
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  chart: {
    id: string;
    svg_content: string;
    chart_data: unknown;
    status: string;
    created_at?: string;
  } | null;
  created_at?: string;
  sections?: { section_key: string; section_order: number; content: string }[];
}

interface GeneratedChartCardProps {
  clientId: string;
  onOpenClient?: (id: string) => void;
}

export default function GeneratedChartCard({
  clientId,
  onOpenClient,
}: GeneratedChartCardProps) {
  const [data, setData] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadClient() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<ClientDetail>(`/admin/clients/${clientId}`);
        if (isMounted) {
          setData(res);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erro ao carregar o mapa gerado.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (clientId) {
      loadClient();
    }

    return () => {
      isMounted = false;
    };
  }, [clientId]);

  if (loading) {
    return (
      <div
        data-testid="loading-chart"
        className="rounded-2xl p-8 text-center space-y-3"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(127, 119, 221, 0.25)",
        }}
      >
        <div className="inline-block animate-spin text-2xl">🧭</div>
        <p className="text-xs" style={{ color: "#8b87b8" }}>
          Carregando mandala e interpretação cósmica...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="rounded-2xl p-6 text-center text-xs"
        style={{
          background: "#1a1535",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "#f87171",
        }}
      >
        {error || "Não foi possível carregar os detalhes do mapa gerado."}
      </div>
    );
  }

  const hasChartSvg = Boolean(data.chart?.svg_content);
  const chartData = (data.chart?.chart_data || {}) as Record<string, any>;

  // Planetas solicitados pelo usuário listados com suas respectivas casas
  const planetsList = [
    {
      key: "moon",
      name: "Lua",
      icon: "🌙",
      color: "#AFA9EC",
      sign: chartData.moon?.sign || data.moon_sign || "—",
      house: chartData.moon?.house ? `Casa ${chartData.moon.house}` : "Casa —",
    },
    {
      key: "sun",
      name: "Sol",
      icon: "☀️",
      color: "#EF9F27",
      sign: chartData.sun?.sign || data.sun_sign || "—",
      house: chartData.sun?.house ? `Casa ${chartData.sun.house}` : "Casa —",
    },
    {
      key: "mercury",
      name: "Mercúrio",
      icon: "☿",
      color: "#60A5FA",
      sign: chartData.mercury?.sign || "—",
      house: chartData.mercury?.house ? `Casa ${chartData.mercury.house}` : "Casa —",
      retrograde: chartData.mercury?.retrograde,
    },
    {
      key: "venus",
      name: "Vênus",
      icon: "♀",
      color: "#F472B6",
      sign: chartData.venus?.sign || "—",
      house: chartData.venus?.house ? `Casa ${chartData.venus.house}` : "Casa —",
    },
    {
      key: "mars",
      name: "Marte",
      icon: "♂",
      color: "#F87171",
      sign: chartData.mars?.sign || "—",
      house: chartData.mars?.house ? `Casa ${chartData.mars.house}` : "Casa —",
    },
  ];

  // Formatação segura da data real de criação do mapa astral (em Horário de Brasília UTC-3)
  const chartCreatedAt = data.chart?.created_at || data.created_at;
  const formattedCreationDate = chartCreatedAt
    ? new Date(chartCreatedAt).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      data-testid="generated-chart-display"
      className="rounded-3xl p-6 sm:p-8 backdrop-blur-xl transition-all space-y-6"
      style={{
        background: "linear-gradient(145deg, rgba(26, 21, 53, 0.95) 0%, rgba(15, 11, 30, 0.98) 100%)",
        border: "1px solid rgba(127, 119, 221, 0.35)",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(127, 119, 221, 0.15)",
      }}
    >
      {/* Cabeçalho do Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5" style={{ borderColor: "rgba(127, 119, 221, 0.2)" }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">✨</span>
            <h3 className="text-lg sm:text-xl font-bold" style={{ color: "#f0eeff" }}>
              Mapa Astral de {data.name}
            </h3>
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(52, 211, 153, 0.15)",
                color: "#34d399",
                border: "1px solid rgba(52, 211, 153, 0.3)",
              }}
            >
              ✓ Pronto
            </span>
            {formattedCreationDate && (
              <span
                data-testid="chart-real-creation-badge"
                className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-medium"
                style={{
                  background: "rgba(127, 119, 221, 0.2)",
                  color: "#c4b5fd",
                  border: "1px solid rgba(127, 119, 221, 0.35)",
                }}
              >
                🕒 Gerado em {formattedCreationDate}
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: "#8b87b8" }}>
            📍 {data.birth_city || "Não informado"} {data.birth_state ? `(${data.birth_state})` : ""} · {data.birth_country || "Brasil"}
            {data.lat != null && data.lng != null && (
              <span className="ml-2 font-mono text-[11px]" style={{ color: "#AFA9EC" }}>
                [{data.lat.toFixed(4)}°, {data.lng.toFixed(4)}°]
              </span>
            )}
          </p>
        </div>

        {/* Badges Cósmicas de Signos */}
        <div className="flex items-center gap-2 flex-wrap">
          {data.sun_sign && (
            <div
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              style={{
                background: "rgba(239, 159, 39, 0.15)",
                color: "#EF9F27",
                border: "1px solid rgba(239, 159, 39, 0.3)",
              }}
            >
              <span>☀️ Sol em</span>
              <strong className="font-bold">{data.sun_sign}</strong>
            </div>
          )}
          {data.moon_sign && (
            <div
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              style={{
                background: "rgba(175, 169, 236, 0.15)",
                color: "#AFA9EC",
                border: "1px solid rgba(175, 169, 236, 0.3)",
              }}
            >
              <span>🌙 Lua em</span>
              <strong className="font-bold">{data.moon_sign}</strong>
            </div>
          )}
          {data.rising_sign && (
            <div
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              style={{
                background: "rgba(127, 119, 221, 0.15)",
                color: "#7F77DD",
                border: "1px solid rgba(127, 119, 221, 0.3)",
              }}
            >
              <span>⬆️ Ascendente em</span>
              <strong className="font-bold">{data.rising_sign}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Corpo: Mandala Astrológica Centralizada e Destaque */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {hasChartSvg ? (
          <div className="md:col-span-6 flex flex-col items-center justify-center">
            {/* Container da Mandala com Botão de Maximizar */}
            <div className="relative group w-full max-w-[340px] sm:max-w-[380px]">
              <div
                data-testid="chart-mandala-svg"
                className="w-full rounded-2xl overflow-hidden p-2 transition-all hover:scale-[1.01]"
                style={{
                  background: "#0a0718",
                  border: "1px solid rgba(127, 119, 221, 0.3)",
                  boxShadow: "0 0 30px rgba(127, 119, 221, 0.2)",
                }}
                dangerouslySetInnerHTML={{ __html: data.chart!.svg_content }}
              />

              {/* Botão para Maximizar e Ativar Modo Zoom */}
              <button
                type="button"
                data-testid="maximize-chart-btn"
                onClick={() => setIsZoomOpen(true)}
                title="Maximizar mandala e controlar zoom"
                className="absolute top-3 right-3 px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg opacity-90 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
                style={{
                  background: "rgba(26, 21, 53, 0.85)",
                  color: "#f0eeff",
                  border: "1px solid rgba(127, 119, 221, 0.4)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                }}
              >
                <span>🔍</span>
                <span>Maximizar</span>
              </button>
            </div>

            <p className="text-[11px] mt-2 text-center" style={{ color: "#8b87b8" }}>
              Mandala Astrológica Calculada
            </p>

            {/* Lista dos 5 Planetas e suas Respectivas Casas logo abaixo da imagem */}
            <div
              data-testid="planets-houses-list"
              className="w-full max-w-[340px] sm:max-w-[380px] mt-4 p-3.5 rounded-2xl space-y-2"
              style={{
                background: "rgba(10, 7, 24, 0.7)",
                border: "1px solid rgba(127, 119, 221, 0.25)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
              }}
            >
              <div
                className="flex items-center justify-between pb-1.5 border-b border-purple-500/20 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: "#AFA9EC" }}
              >
                <span>Planeta</span>
                <span>Signo & Casa</span>
              </div>

              {planetsList.map((p) => (
                <div
                  key={p.key}
                  data-testid={`planet-item-${p.key}`}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-xl transition-all hover:bg-white/5"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(127, 119, 221, 0.12)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base" role="img" aria-label={p.name}>
                      {p.icon}
                    </span>
                    <span className="text-xs font-bold" style={{ color: p.color }}>
                      {p.name}
                    </span>
                    {p.retrograde && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-300">
                        R
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium" style={{ color: "#f0eeff" }}>
                      {p.sign}
                    </span>
                    <span
                      data-testid={`planet-house-${p.key}`}
                      className="text-[11px] px-2 py-0.5 rounded-md font-mono font-semibold"
                      style={{
                        background: "rgba(127, 119, 221, 0.18)",
                        color: "#c4b5fd",
                        border: "1px solid rgba(127, 119, 221, 0.3)",
                      }}
                    >
                      {p.house}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="md:col-span-6 rounded-2xl p-8 text-center space-y-2"
            style={{ background: "#0a0718", border: "1px dashed rgba(127, 119, 221, 0.25)" }}
          >
            <div className="text-3xl">🌌</div>
            <p className="text-xs" style={{ color: "#8b87b8" }}>
              Mandala cósmica gerada e pronta para leitura.
            </p>
          </div>
        )}

        {/* Coluna da Direita: Dados de Nascimento e Ações */}
        <div className="md:col-span-6 space-y-5">
          <div
            className="p-4 rounded-2xl space-y-2"
            style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(127, 119, 221, 0.15)" }}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#AFA9EC" }}>
              Dados de Registro
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="block text-[11px]" style={{ color: "#8b87b8" }}>Data de Nascimento</span>
                <span className="font-semibold" style={{ color: "#f0eeff" }}>{data.birth_date || "—"}</span>
              </div>
              <div>
                <span className="block text-[11px]" style={{ color: "#8b87b8" }}>Horário</span>
                <span className="font-semibold" style={{ color: "#f0eeff" }}>{data.birth_time || "—"}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-[11px]" style={{ color: "#8b87b8" }}>Localidade</span>
                <span className="font-semibold" style={{ color: "#f0eeff" }}>
                  {data.birth_city ? `${data.birth_city}, ` : ""}{data.birth_state || ""}{data.birth_country ? ` - ${data.birth_country}` : ""}
                </span>
              </div>
              {formattedCreationDate && (
                <div className="col-span-2 pt-1 border-t border-purple-900/20">
                  <span className="block text-[11px]" style={{ color: "#AFA9EC" }}>Data de Geração do Mapa:</span>
                  <span className="font-semibold font-mono text-[11px]" style={{ color: "#f0eeff" }}>
                    🕒 {formattedCreationDate}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* A leitura do dia. A lista acima é o mapa de nascimento, que é
            referência fixa; é AQUI que sai o direcionamento, porque é aqui
            que o céu de uma data encontra o mapa dessa pessoa. */}
        <div data-testid="generated-chart-leitura-section" className="col-span-full w-full">
          <LeituraCliente clienteId={data.id} nome={data.name} />
        </div>
      </div>

      {/* Modal de Zoom e Tela Cheia para a Mandala Astrológica */}
      {hasChartSvg && (
        <ChartZoomModal
          isOpen={isZoomOpen}
          onClose={() => setIsZoomOpen(false)}
          title={`Mandala Astrológica - ${data.name}`}
          svgContent={data.chart!.svg_content}
        />
      )}
    </div>
  );
}
