"use client";

import React from "react";
import Ajuda from "@/components/Ajuda";
import PaginationControls from "@/components/PaginationControls";
import {
  type AreaAluno,
  type ItemDiario,
  porExtenso,
  formataDataRelativa,
} from "@/components/PainelAluno";

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

interface PainelDiarioTabProps {
  diario: ItemDiario[];
  carregando: boolean;
  deletandoId: string | null;
  buscaFiltro: string;
  setBuscaFiltro: (v: string) => void;
  filtroTipo: "todos" | "perguntas" | "periodos";
  setFiltroTipo: (v: "todos" | "perguntas" | "periodos") => void;
  paginaAtual: number;
  setPaginaAtual: (p: number) => void;
  onIrPara: (area: AreaAluno) => void;
  onAbrirLeitura: (id: string) => void;
  onExcluirDoDiario: (e: React.MouseEvent, id: string) => void;
}

export default function PainelDiarioTab({
  diario,
  carregando,
  deletandoId,
  buscaFiltro,
  setBuscaFiltro,
  filtroTipo,
  setFiltroTipo,
  paginaAtual,
  setPaginaAtual,
  onIrPara,
  onAbrirLeitura,
  onExcluirDoDiario,
}: PainelDiarioTabProps) {
  const diarioFiltrado = diario.filter((item) => {
    const temPergunta = Boolean(item.pergunta || item.contexto?.pergunta);
    const ehPeriodo = item.tipo === "periodo" || Boolean(item.data_fim || item.contexto?.data_fim);

    if (filtroTipo === "perguntas" && !temPergunta) return false;
    if (filtroTipo === "periodos" && !ehPeriodo) return false;

    if (!buscaFiltro.trim()) return true;
    const q = buscaFiltro.toLowerCase();
    const pergunta = (item.pergunta || item.contexto?.pergunta || "").toLowerCase();
    const dataStr = item.data.toLowerCase();
    const dataExtenso = porExtenso(item.data).toLowerCase();
    const areaStr = (item.area || item.contexto?.area || "").toLowerCase();
    const preview = (item.sintese_preview || "").toLowerCase();
    return (
      pergunta.includes(q) ||
      dataStr.includes(q) ||
      dataExtenso.includes(q) ||
      areaStr.includes(q) ||
      preview.includes(q)
    );
  });

  const totalComPerguntas = diario.filter((i) => i.pergunta || i.contexto?.pergunta).length;
  const totalPeriodos = diario.filter((i) => i.tipo === "periodo" || i.data_fim || i.contexto?.data_fim).length;

  const ITENS_POR_PAGINA = 20;
  const totalPaginas = Math.ceil(diarioFiltrado.length / ITENS_POR_PAGINA) || 1;
  const paginaValida = Math.min(Math.max(1, paginaAtual), totalPaginas);
  const indiceInicio = (paginaValida - 1) * ITENS_POR_PAGINA;
  const diarioPaginado = diarioFiltrado.slice(indiceInicio, indiceInicio + ITENS_POR_PAGINA);

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#d4af37]">
            Registro de Consultas & Timing
          </span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Diário de bordo
            <Ajuda titulo="Histórico de Consultas">
              Toda pesquisa, pergunta ou previsão de período que você realiza fica salva cronologicamente aqui. Você pode revisitar as orientações a qualquer momento para comparar o que o céu indicava com as decisões concretas do seu dia a dia.
            </Ajuda>
          </h2>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/25 text-[#e4d18c]">
            {diario.length} {diario.length === 1 ? "pesquisa salva" : "pesquisas salvas"}
          </span>
        </div>
        <p className="text-sm mt-2 leading-relaxed text-zinc-400">
          Suas buscas anteriores, dúvidas enviadas ao céu e previsões personalizadas da sua Bússola.
        </p>
      </div>

      {carregando ? (
        <div className="p-12 text-center bg-[#12141c]/50 border border-white/5 rounded-2xl animate-pulse">
          <p className="text-xs uppercase tracking-widest text-[#d4af37] font-mono">
            Carregando histórico de pesquisas...
          </p>
        </div>
      ) : diario.length === 0 ? (
        <div
          className="p-8 sm:p-10 rounded-2xl text-center space-y-4 relative overflow-hidden"
          style={{ background: "#12141c", border: "1px solid rgba(127,119,221,0.2)" }}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] flex items-center justify-center mx-auto text-2xl">
            🧭
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Seu Diário de bordo está pronto</h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
              Toda vez que você consultar o céu ou enviar uma pergunta na aba <strong>A leitura do dia</strong>, o registro ficará salvo automaticamente aqui como seu histórico de busca.
            </p>
          </div>
          <button
            onClick={() => onIrPara("leitura")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-gradient-to-r from-[#d4af37] via-[#e5c463] to-[#c79d2f] text-zinc-950 shadow-lg shadow-[#d4af37]/20 hover:brightness-110 active:scale-[0.99] cursor-pointer"
          >
            <span>Fazer Primeira Pesquisa</span>
            <span>→</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#12141c] border border-white/10 space-y-3.5">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
              <input
                type="text"
                value={buscaFiltro}
                onChange={(e) => {
                  setBuscaFiltro(e.target.value);
                  setPaginaAtual(1);
                }}
                placeholder="Filtrar por pergunta, data ou palavra-chave..."
                className="w-full h-11 bg-[#181a24] border border-white/10 rounded-xl pl-10 pr-4 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#d4af37]/70 transition-colors"
              />
              {buscaFiltro && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaFiltro("");
                    setPaginaAtual(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setFiltroTipo("todos");
                  setPaginaAtual(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filtroTipo === "todos"
                    ? "bg-[#d4af37]/20 text-[#e4d18c] border border-[#d4af37]/40 font-semibold"
                    : "bg-[#181a24] text-zinc-400 border border-white/5 hover:border-white/15 hover:text-zinc-200"
                }`}
              >
                Todas ({diario.length})
              </button>
              {totalComPerguntas > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroTipo("perguntas");
                    setPaginaAtual(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filtroTipo === "perguntas"
                      ? "bg-[#d4af37]/20 text-[#e4d18c] border border-[#d4af37]/40 font-semibold"
                      : "bg-[#181a24] text-zinc-400 border border-white/5 hover:border-white/15 hover:text-zinc-200"
                  }`}
                >
                  Com Pergunta ({totalComPerguntas})
                </button>
              )}
              {totalPeriodos > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroTipo("periodos");
                    setPaginaAtual(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filtroTipo === "periodos"
                      ? "bg-[#d4af37]/20 text-[#e4d18c] border border-[#d4af37]/40 font-semibold"
                      : "bg-[#181a24] text-zinc-400 border border-white/5 hover:border-white/15 hover:text-zinc-200"
                  }`}
                >
                  Previsões de Período ({totalPeriodos})
                </button>
              )}
            </div>
          </div>

          {diarioFiltrado.length === 0 ? (
            <div className="p-8 text-center bg-[#12141c]/40 border border-white/5 rounded-2xl">
              <p className="text-xs text-zinc-400">Nenhuma pesquisa encontrada para os filtros atuais.</p>
              <button
                type="button"
                onClick={() => {
                  setBuscaFiltro("");
                  setFiltroTipo("todos");
                }}
                className="mt-2 text-xs text-[#d4af37] hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {diarioPaginado.map((item) => {
                  const perguntaTexto = item.pergunta || item.contexto?.pergunta;
                  const areaKey = (item.area || item.contexto?.area || "").toLowerCase();
                  const areaRotulo = ROTULO_AREA[areaKey] || (areaKey ? `Área: ${areaKey}` : null);
                  const ehPeriodo = item.tipo === "periodo" || Boolean(item.data_fim || item.contexto?.data_fim);
                  const dataFimStr = item.data_fim || item.contexto?.data_fim;

                  return (
                    <div
                      key={item.id}
                      onClick={() => onAbrirLeitura(item.id)}
                      className="w-full p-5 rounded-2xl text-left transition-all bg-[#12141c] border border-white/10 hover:border-[#d4af37]/50 hover:bg-[#161822] cursor-pointer group relative overflow-hidden shadow-lg shadow-black/20"
                    >
                      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 group-hover:via-[#d4af37]/40 to-transparent transition-all" />
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                            ehPeriodo
                              ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/25"
                              : "bg-[#d4af37]/10 text-[#e4d18c] border-[#d4af37]/25"
                          }`}>
                            {ehPeriodo ? "Previsão de Período" : "Leitura do Dia"}
                          </span>

                          {areaRotulo && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300">
                              {areaRotulo}
                            </span>
                          )}

                          {item.planeta_destaque && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              Líder: {item.planeta_destaque}
                            </span>
                          )}
                        </div>

                        {item.created_at && (
                          <span className="text-[11px] font-mono text-zinc-500">
                            {formataDataRelativa(item.created_at)}
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                        <span>
                          {ehPeriodo && dataFimStr
                            ? `${porExtenso(item.data)} até ${porExtenso(dataFimStr)}`
                            : porExtenso(item.data)}
                        </span>
                      </h4>

                      {perguntaTexto ? (
                        <div className="mt-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                          <span className="text-base text-[#d4af37] shrink-0 mt-0.5">💬</span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                              Pergunta realizada:
                            </p>
                            <p className="text-xs sm:text-sm font-medium text-zinc-100 italic mt-0.5 leading-snug">
                              &quot;{perguntaTexto}&quot;
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400 mt-1">
                          Consulta geral das energias planetárias ativas sobre as 12 casas natais.
                        </p>
                      )}

                      {item.sintese_preview && (
                        <p className="mt-2.5 text-xs text-zinc-300 line-clamp-2 leading-relaxed bg-[#181a24]/60 p-2.5 rounded-xl border border-white/[0.04]">
                          <span className="text-[#d4af37] font-semibold mr-1.5 font-mono text-[11px]">SÍNTESE:</span>
                          {item.sintese_preview}
                        </p>
                      )}

                      <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#d4af37] group-hover:text-[#f3de9a] flex items-center gap-1.5 transition-colors">
                          <span>Acessar Leitura Completa</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => onExcluirDoDiario(e, item.id)}
                          disabled={deletandoId === item.id}
                          title="Excluir esta pesquisa do histórico"
                          className="text-zinc-500 hover:text-red-400 text-xs px-2.5 py-1 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/10 transition-all cursor-pointer flex items-center gap-1"
                        >
                          {deletandoId === item.id ? (
                            <span className="inline-block animate-spin text-[10px]">⏳</span>
                          ) : (
                            <span>🗑️</span>
                          )}
                          <span className="text-[11px]">Remover</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPaginas > 1 && (
                <div className="pt-2">
                  <PaginationControls
                    currentPage={paginaValida}
                    totalPages={totalPaginas}
                    totalItems={diarioFiltrado.length}
                    pageSize={ITENS_POR_PAGINA}
                    onPageChange={(novaPagina) => {
                      setPaginaAtual(novaPagina);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    itemName="pesquisas"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
