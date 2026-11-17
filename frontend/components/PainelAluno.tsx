"use client";

/**
 * O painel de quem comprou a Bússola.
 *
 * Mesma casca visual do painel do admin, outra cabeça: aqui ninguém está
 * gerenciando leads, a pessoa está lendo a própria vida. Por isso nenhuma
 * palavra de gestão aparece nesta tela — nem "lead", nem "cadastro", nem
 * "administrador".
 *
 * Três áreas, e só:
 *   1. Minha Bússola — os dados de nascimento e o mapa que sai deles
 *   2. A leitura     — escolhe a data, lê os cinco planetas e a síntese
 *   3. Diário de bordo — tudo que ela já leu, em ordem
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import AnaliseDoDia from "@/components/AnaliseDoDia";
import ChartZoomModal from "@/components/ChartZoomModal";
import Ajuda from "@/components/Ajuda";
import ColetaDadosBussola from "@/components/ColetaDadosBussola";
import PainelDiarioTab from "@/components/aluno/PainelDiarioTab";
import AstroProfileSelector from "@/components/AstroProfileSelector";

const C = {
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

export type AreaAluno = "bussola" | "leitura" | "diario" | "dados";

interface Mapa {
  svg: string;
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  status: string;
}

export interface ItemDiario {
  id: string;
  data: string;
  data_fim?: string | null;
  tipo?: "dia" | "periodo";
  pergunta?: string | null;
  area?: string | null;
  sintese_preview?: string;
  planeta_destaque?: string | null;
  status: string;
  tem_sintese: boolean;
  contexto?: {
    area?: string | null;
    pergunta?: string | null;
    data_fim?: string | null;
    tipo?: string;
  };
  created_at?: string;
}

export function porExtenso(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${d} de ${meses[m - 1]} de ${a}`;
}

export function formataDataRelativa(dataIso?: string): string {
  if (!dataIso) return "";
  try {
    const d = new Date(dataIso);
    const agora = new Date();
    const diffMs = agora.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMin < 2) return "Agora mesmo";
    if (diffMin < 60) return `Há ${diffMin} min`;
    if (diffHoras < 24 && d.getDate() === agora.getDate()) {
      return `Hoje às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (diffDias === 1) {
      return `Ontem às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

const ROTULO_AREA: Record<string, string> = {
  carreira: "💼 Carreira e trabalho",
  dinheiro: "💰 Dinheiro e valor",
  financas: "💰 Dinheiro e valor",
  relacao: "🤝 Relação e parceria",
  relacionamentos: "🤝 Relação e parceria",
  familia: "🏡 Casa e família",
  corpo: "🌿 Corpo e rotina",
  direcao: "🧭 Direção de vida",
  autoconhecimento: "🌱 Autoconhecimento",
  geral: "🌐 Panorama Geral",
};

export default function PainelAluno({
  area,
  usuario,
  onIrPara,
}: {
  area: AreaAluno;
  usuario: { name?: string; email?: string; access_expired?: boolean; access_expires_at?: string | null } | null;
  onIrPara: (a: AreaAluno) => void;
}) {
  const accessExpired = Boolean(usuario?.access_expired);
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [diario, setDiario] = useState<ItemDiario[]>([]);
  const [zoom, setZoom] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [analiseIdParaAbrir, setAnaliseIdParaAbrir] = useState<string | null>(null);
  const [buscaFiltro, setBuscaFiltro] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "perguntas" | "periodos">("todos");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedProfileName, setSelectedProfileName] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const chartUrl = selectedProfileId ? `/members/chart?profile_id=${encodeURIComponent(selectedProfileId)}` : "/members/chart";
      setMapa(await api.get<Mapa>(chartUrl));
    } catch {
      setMapa(null); // sem mapa ainda: a tela explica o que falta
    }
    try {
      setDiario(await api.get<ItemDiario[]>("/members/analises"));
    } catch {
      setDiario([]);
    }
    setCarregando(false);
  }, [selectedProfileId]);

  const handleExcluirDoDiario = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Deseja remover esta pesquisa do seu histórico?")) return;
    try {
      setDeletandoId(id);
      await api.delete(`/members/analises/${id}`);
      setDiario((prev) => prev.filter((item) => item.id !== id));
    } catch {
      alert("Não foi possível excluir esta pesquisa.");
    } finally {
      setDeletandoId(null);
    }
  };

  const handleAbrirLeitura = (id: string) => {
    setAnaliseIdParaAbrir(id);
    onIrPara("leitura");
  };

  useEffect(() => {
    carregar();
  }, [carregar, area]);

  const primeiroNome = usuario?.name?.trim().split(" ")[0] || "";
  const nomeExibido = primeiroNome
    ? primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1)
    : "";

  // ──────────────────────────────────────────────── Coleta / Meus Dados
  if (area === "dados") {
    return (
      <div className="w-full">
        <ColetaDadosBussola
          title="Meus Dados de Nascimento"
          subtitle="Seus dados calibram o cálculo astronômico das 12 casas e os trânsitos da sua Bússola."
          onSuccess={() => {
            carregar();
            onIrPara("bussola");
          }}
          onCancel={() => onIrPara("bussola")}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────── Minha Bússola
  if (area === "bussola") {
    return (
      <div className="w-full max-w-5xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "#ffffff" }}>
              {selectedProfileName ? `A bússola de ${selectedProfileName}` : nomeExibido ? `A bússola do ${nomeExibido}` : "A sua bússola"}
            </h2>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: C.muted }}>
              Este é o céu do minuto em que {selectedProfileName || "você"} nasceu. Ele não muda nunca, e é
              contra ele que toda leitura de data é calculada.
            </p>
          </div>
          {mapa?.svg && (
            <button
              onClick={() => onIrPara("dados")}
              className="text-xs px-3.5 py-2 rounded-xl border transition-all text-amber-400 hover:text-amber-300 border-amber-400/30 hover:border-amber-400/60 bg-amber-400/5 hover:bg-amber-400/10 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              ⚙️ Editar Meus Dados
            </button>
          )}
        </div>

        <div className="mb-6">
          <AstroProfileSelector
            ownerName={usuario?.name}
            selectedProfileId={selectedProfileId}
            onChange={(id, pName) => {
              setSelectedProfileId(id);
              setSelectedProfileName(pName || "");
            }}
            label="Visualizar bússola de:"
          />
        </div>

        {carregando ? (
          <p className="text-sm" style={{ color: C.muted }}>Carregando...</p>
        ) : mapa?.svg ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {[
                { rotulo: "Sol", valor: mapa.sun_sign, diz: "quem você é quando ninguém está pedindo nada" },
                { rotulo: "Lua", valor: mapa.moon_sign, diz: "o que você sente antes de pensar" },
                { rotulo: "Ascendente", valor: mapa.rising_sign, diz: "como você chega nos lugares" },
              ].filter((s) => s.valor).map((s) => (
                <div
                  key={s.rotulo}
                  className="px-4 py-3 rounded-xl flex flex-col justify-between"
                  style={{ background: C.card, border: `1px solid ${C.border}` }}
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-widest" style={{ color: C.muted }}>
                      {s.rotulo}
                    </p>
                    <p className="text-lg font-bold mt-0.5" style={{ color: C.gold }}>
                      {s.valor}
                    </p>
                  </div>
                  <p className="text-[11px] mt-1.5 leading-snug" style={{ color: C.muted }}>
                    {s.diz}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setZoom(true)}
              className="w-full rounded-2xl overflow-hidden transition-all hover:opacity-95"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
              aria-label="Abrir o mapa em tela cheia"
            >
              <div
                className="p-2 sm:p-4 [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-[65vh] [&>svg]:mx-auto"
                dangerouslySetInnerHTML={{ __html: mapa.svg }}
              />
            </button>
            <p className="text-xs mt-3" style={{ color: C.muted }}>
              Clique no mapa para abrir em tela cheia e dar zoom.
            </p>

            <ChartZoomModal
              isOpen={zoom}
              onClose={() => setZoom(false)}
              title={nomeExibido ? `Mapa de ${nomeExibido}` : "Seu mapa"}
              svgContent={mapa.svg}
            />

            <button
              onClick={() => onIrPara("leitura")}
              className="mt-8 px-6 py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${C.gold}, #c67c13)`, color: "#120b24" }}
            >
              Ler um dia →
            </button>
          </>
        ) : (
          <div className="space-y-6">
            <ColetaDadosBussola
              title="Calibre a sua Bússola"
              subtitle="Para desenhar sua mandala e começar a ler o céu do seu dia a dia, informe seus dados de nascimento abaixo."
              onSuccess={() => {
                carregar();
                onIrPara("bussola");
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────── A leitura
  if (area === "leitura") {
    if (!carregando && !mapa?.svg) {
      return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <div
            className="p-4 rounded-2xl flex items-center gap-3.5"
            style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)" }}
          >
            <span className="text-2xl">🧭</span>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Precisamos da sua data e local de nascimento</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                A leitura do dia projeta os planetas sobre as suas casas natais. Calibre sua bússola para ver sua análise.
              </p>
            </div>
          </div>
          <ColetaDadosBussola
            title="Cadastrar Dados de Nascimento"
            subtitle="Preencha uma única vez para liberar suas previsões diárias e acompanhamento de trânsitos."
            onSuccess={() => {
              carregar();
              onIrPara("leitura");
            }}
          />
        </div>
      );
    }

    return (
      <div className="w-full -mx-2">
        <AnaliseDoDia
          nome={usuario?.name}
          analiseIdInicial={analiseIdParaAbrir}
          onAnaliseGerada={carregar}
          accessExpired={accessExpired}
        />
      </div>
    );
  }

  return (
    <PainelDiarioTab
      diario={diario}
      carregando={carregando}
      deletandoId={deletandoId}
      buscaFiltro={buscaFiltro}
      setBuscaFiltro={setBuscaFiltro}
      filtroTipo={filtroTipo}
      setFiltroTipo={setFiltroTipo}
      paginaAtual={paginaAtual}
      setPaginaAtual={setPaginaAtual}
      onIrPara={onIrPara}
      onAbrirLeitura={handleAbrirLeitura}
      onExcluirDoDiario={handleExcluirDoDiario}
    />
  );
}
