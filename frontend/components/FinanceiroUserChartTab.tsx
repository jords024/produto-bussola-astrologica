"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import ChartZoomModal from "@/components/ChartZoomModal";
import { formatShortDateBr } from "@/components/FinanceiroUserReportsModal";

interface ClientChartDetail {
  id: string;
  name: string;
  email?: string;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_city?: string | null;
  birth_state?: string | null;
  sun_sign?: string | null;
  moon_sign?: string | null;
  rising_sign?: string | null;
  chart?: {
    id: string;
    svg_content?: string | null;
    status?: string | null;
  } | null;
}

interface FinanceiroUserChartTabProps {
  userId: string | null;
  userName: string;
}

export default function FinanceiroUserChartTab({
  userId,
  userName,
}: FinanceiroUserChartTabProps) {
  const [detail, setDetail] = useState<ClientChartDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setError(null);

    api
      .get<ClientChartDetail>(`/admin/clients/${userId}`)
      .then((res) => {
        if (active) setDetail(res);
      })
      .catch((err: any) => {
        if (active) {
          setError(err?.message || "Não foi possível carregar o mapa astral deste usuário.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const handleDownloadPdf = async () => {
    if (!userId) return;
    setDownloadingPdf(true);
    try {
      const blob = await api.download(`/admin/clients/${userId}/pdf`, "GET");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mapa-astral-${(userName || "aluno").toLowerCase().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF do mapa baixado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao baixar PDF do mapa.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!userId) {
    return (
      <div
        data-testid="financeiro-chart-empty"
        className="text-center py-10 text-sm text-[#8b87b8]"
      >
        Este registro é um lead sem conta vinculada de mapa astral.
      </div>
    );
  }

  if (loading) {
    return (
      <div
        data-testid="financeiro-chart-loading"
        className="flex items-center justify-center py-12 gap-2 text-sm text-[#8b87b8]"
      >
        <span className="inline-block w-4 h-4 border-2 border-[#AFA9EC] border-t-transparent rounded-full animate-spin" />
        Carregando mapa astral do aluno...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  const svgContent = detail?.chart?.svg_content || "";
  const hasSigns = Boolean(detail?.sun_sign || detail?.moon_sign || detail?.rising_sign);

  if (!svgContent && !hasSigns) {
    return (
      <div
        data-testid="financeiro-chart-empty"
        className="text-center py-10 text-sm text-[#8b87b8]"
      >
        Este aluno ainda não possui mapa astral gerado.
      </div>
    );
  }

  return (
    <div data-testid="financeiro-chart-tab" className="space-y-4">
      {/* Signos e Dados de Nascimento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-[#14102b]/80 border border-[#7f77dd]/25">
          <div className="text-[11px] text-[#8b87b8]">☀️ Sol</div>
          <div data-testid="financeiro-chart-sun" className="text-sm font-bold text-[#f0eeff] mt-0.5">
            {detail?.sun_sign || "—"}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#14102b]/80 border border-[#7f77dd]/25">
          <div className="text-[11px] text-[#8b87b8]">🌙 Lua</div>
          <div data-testid="financeiro-chart-moon" className="text-sm font-bold text-[#f0eeff] mt-0.5">
            {detail?.moon_sign || "—"}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#14102b]/80 border border-[#7f77dd]/25">
          <div className="text-[11px] text-[#8b87b8]">⬆️ Ascendente</div>
          <div data-testid="financeiro-chart-rising" className="text-sm font-bold text-[#f0eeff] mt-0.5">
            {detail?.rising_sign || "—"}
          </div>
        </div>
      </div>

      {(detail?.birth_date || detail?.birth_city) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-[#14102b]/60 border border-[#7f77dd]/20 text-xs text-[#b4b0dc]">
          <div className="flex flex-wrap items-center gap-3">
            {detail.birth_date && <span>📅 {formatShortDateBr(detail.birth_date)}</span>}
            {detail.birth_time && <span>🕐 {detail.birth_time}</span>}
            {detail.birth_city && (
              <span>
                📍 {detail.birth_city}
                {detail.birth_state ? ` - ${detail.birth_state}` : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {svgContent && (
              <button
                type="button"
                data-testid="financeiro-chart-zoom-btn"
                onClick={() => setZoomOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#251f49] hover:bg-[#31295f] text-[#f0eeff] border border-[#7f77dd]/35 transition cursor-pointer"
              >
                🔍 Ampliar Mapa
              </button>
            )}
            {detail?.chart?.status === "ready" && (
              <button
                type="button"
                data-testid="financeiro-chart-pdf-btn"
                disabled={downloadingPdf}
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 transition cursor-pointer disabled:opacity-50"
              >
                {downloadingPdf ? "Baixando..." : "📄 Baixar PDF"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mandala SVG */}
      {svgContent ? (
        <div
          data-testid="financeiro-chart-svg"
          className="rounded-2xl border border-[#7f77dd]/25 bg-[#0f0b1e] p-4 flex items-center justify-center overflow-hidden"
        >
          <div
            className="w-full max-w-[420px] [&>svg]:w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-[#8b87b8]">
          Mandala SVG ainda não disponível para este aluno.
        </div>
      )}

      {zoomOpen && svgContent && (
        <ChartZoomModal
          isOpen={zoomOpen}
          onClose={() => setZoomOpen(false)}
          title={`Mapa Astral — ${detail?.name || userName}`}
          svgContent={svgContent}
        />
      )}
    </div>
  );
}
