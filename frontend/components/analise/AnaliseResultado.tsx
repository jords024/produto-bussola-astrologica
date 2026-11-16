"use client";

import ChartZoomModal from "@/components/ChartZoomModal";
import Ajuda from "@/components/Ajuda";
import {
  T,
  ICONE,
  AULA_BUSSOLA,
  AREA_DA_CASA,
  AJUDA_MAPA_POR_PLANETA,
  AJUDA_DESTAQUE_POR_PLANETA,
  AJUDA_PRAZO_POR_PLANETA,
  limpaTracos,
  porExtenso,
  curta,
  type Analise,
} from "@/components/analise/analiseConstants";

interface AnaliseResultadoProps {
  analise: Analise;
  primeiroNome: string;
  zoom: boolean;
  setZoom: (v: boolean) => void;
}

export default function AnaliseResultado({
  analise,
  primeiroNome,
  zoom,
  setZoom,
}: AnaliseResultadoProps) {
  const posicoesOrdenadas = analise?.posicoes
    ? [...analise.posicoes].sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0))
    : [];

  return (
        <div className="mt-10 space-y-8">
          {/* 1. Bloco Hero: A Síntese Profunda */}
          <section
            className="p-6 sm:p-8 rounded-2xl relative overflow-hidden"
            style={{
              background: `linear-gradient(180deg, ${T.surface1} 0%, #0b0c12 100%)`,
              border: `1px solid ${T.borderGold}`,
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.06] mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                  ✦ {analise.data_fim
                    ? `Previsão do Período · ${porExtenso(analise.data)} até ${porExtenso(analise.data_fim)}`
                    : `Síntese do Dia · ${porExtenso(analise.data)}`}
                </span>
                <Ajuda titulo="Sobre a Síntese Profunda">
                  Esta é a costura principal da sua leitura: cruzamos os 5 planetas ativos no céu com os pontos exclusivos do seu nascimento para entregar um direcionamento prático, cirúrgico e personalizado para a sua pergunta e momento, sem jargões técnicos.
                </Ajuda>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full" style={{ background: T.surface2, color: T.textMuted, border: `1px solid ${T.border}` }}>
                Leitura Estratégica
              </span>
            </div>

            {analise.sintese ? (
              <div className="space-y-4">
                {analise.sintese
                  .split("\n\n")
                  .map((p) => p.trim())
                  .filter((p) => (
                    p.length > 0 &&
                    !p.startsWith("===") &&
                    !p.startsWith("---") &&
                    !p.startsWith("###") &&
                    !p.toUpperCase().startsWith("SÍNTESE") &&
                    !p.toUpperCase().startsWith("SINTESE") &&
                    !p.toUpperCase().includes("CARTOES") &&
                    !p.toUpperCase().includes("CARTÕES") &&
                    !p.startsWith("[Moon]") &&
                    !p.startsWith("[Sun]") &&
                    !p.startsWith("[Mercury]") &&
                    !p.startsWith("[Venus]") &&
                    !p.startsWith("[Mars]") &&
                    !p.startsWith("[Lua]") &&
                    !p.startsWith("[Sol]")
                  ))
                  .map((paragrafo, idx, arr) => {
                    const textoLimpo = limpaTracos(paragrafo);
                    const isUltimo = idx === arr.length - 1;
                    return (
                      <p
                        key={idx}
                        className={`leading-relaxed text-sm sm:text-base ${
                          isUltimo
                            ? "p-4 rounded-xl font-medium border-l-2"
                            : "text-[#E6E8EE]"
                        }`}
                        style={
                          isUltimo
                            ? {
                                background: "rgba(226, 184, 87, 0.05)",
                                borderColor: T.gold,
                                color: "#FFFFFF",
                              }
                            : {}
                        }
                      >
                        {textoLimpo}
                      </p>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: T.textMuted }}>
                As cinco posições do dia estão calculadas abaixo. Caso queira nova costura da síntese, aperte novamente para atualizar.
              </p>
            )}
          </section>

          {/* 2. Timeline de Marcos Cronológicos (quando for período) */}
          {analise.data_fim && (analise.movimentos_periodo ?? []).length > 0 && (
            <section
              className="p-6 rounded-2xl"
              style={{ background: T.surface1, border: `1px solid ${T.border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-mono font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                  ✦ Marcos Cronológicos do Período
                </p>
                <span className="text-xs" style={{ color: T.textMuted }}>
                  Picos e viradas de foco
                </span>
              </div>
              <div className="space-y-3">
                {(analise.movimentos_periodo ?? []).map((ev, idx) => (
                  <div
                    key={`${ev.data}-${ev.planeta}-${idx}`}
                    className="p-3.5 rounded-xl flex items-start gap-3 transition-all hover:bg-white/[0.02]"
                    style={{ background: T.surface2, border: `1px solid ${T.border}` }}
                  >
                    <span
                      className="px-2.5 py-1 rounded-md text-xs font-mono font-bold whitespace-nowrap mt-0.5"
                      style={{ background: T.goldMuted, color: T.gold }}
                    >
                      {curta(ev.data)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {ICONE[ev.planeta] || "✦"} {limpaTracos(ev.titulo)}
                      </p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: T.textLight }}>
                        {limpaTracos(ev.descricao)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!analise.hora_de_nascimento_conhecida && (
            <div
              className="p-3.5 rounded-xl text-xs font-mono flex items-center gap-2"
              style={{ color: T.textMuted, background: T.surface1, border: `1px solid ${T.border}` }}
            >
              <span>ℹ</span>
              <span>
                Hora de nascimento não informada: usamos meio-dia padrão. As casas podem ter pequeno deslocamento.
              </span>
            </div>
          )}

          {/* 3. Bento Grid: As 5 Forças Ativas */}
          <section>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                  ✦ As 5 Forças Ativas do Seu Momento
                </p>
                <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                  Cruzamento direto com os pontos únicos do seu mapa natal
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg" style={{ background: T.surface1, color: T.textMuted, border: `1px solid ${T.border}` }}>
                {analise.posicoes.length} energias mapeadas
              </span>
            </div>

            {/* Grid Layout Bento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {posicoesOrdenadas.map((p) => {
                const isHero = p.destaque === true;
                const ajudaDestaque = AJUDA_DESTAQUE_POR_PLANETA[p.planeta] || {
                  titulo: `Por que ${p.planeta_pt} é o mais forte de hoje no seu mapa`,
                  texto: `Entre todos os movimentos do céu, ${p.planeta_pt} é o que faz o contato mais exato e apertado com o seu nascimento agora. Ele é o fio condutor principal da sua leitura: é onde a sua atenção e suas decisões precisam estar focadas hoje para destravar o resto da sua rotina.`,
                };
                const ajudaMapa = AJUDA_MAPA_POR_PLANETA[p.planeta] || {
                  titulo: `Como chegamos à leitura de ${p.planeta_pt}`,
                  texto:
                    `Nós cruzamos o movimento atual de ${p.planeta_pt} com os pontos de nascimento do seu mapa. Quando este astro ativa as áreas listadas abaixo, ele desperta essa dinâmica direta na sua vida prática.`,
                };
                const ajudaPrazo = AJUDA_PRAZO_POR_PLANETA[p.planeta] || {
                  titulo: `Prazo de ${p.planeta_pt}`,
                  texto: "Esta posição continua ativa nessa área da sua vida até essa data.",
                };

                return (
                  <div
                    key={p.planeta}
                    className={`p-5 sm:p-6 rounded-2xl flex flex-col justify-between transition-all ${
                      isHero ? "lg:col-span-2" : ""
                    }`}
                    style={{
                      background: isHero
                        ? `linear-gradient(135deg, ${T.surface1} 0%, #15141d 100%)`
                        : T.surface1,
                      border: isHero
                        ? `1px solid ${T.borderGold}`
                        : `1px solid ${T.border}`,
                      boxShadow: isHero
                        ? "0 12px 36px rgba(226, 184, 87, 0.08)"
                        : "0 4px 20px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <div>
                      {/* Top Bar do Card */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl" style={{ color: T.gold }}>
                            {ICONE[p.planeta] || "✦"}
                          </span>
                          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                            {p.planeta_pt}
                          </span>
                          {p.retrogrado && (
                            <span
                              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(255, 180, 50, 0.12)", color: "#FFB432", border: "1px solid rgba(255, 180, 50, 0.25)" }}
                            >
                              retrógrado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {p.ate && (
                            <span
                              className="text-[11px] font-mono px-2.5 py-0.5 rounded-full"
                              style={{ background: T.surface2, color: T.textLight, border: `1px solid ${T.border}` }}
                            >
                              até {curta(p.ate)}
                            </span>
                          )}
                          {p.ate && (
                            <Ajuda titulo={ajudaPrazo.titulo} alinhar="direita">
                              {ajudaPrazo.texto}
                            </Ajuda>
                          )}
                        </div>
                      </div>

                      {/* Badge Hero "O mais forte de hoje" */}
                      {isHero && (
                        <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-md" style={{ background: T.goldMuted, border: `1px solid ${T.borderGold}` }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E2B857] animate-ping" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: T.gold }}>
                            O Mais Forte de Hoje
                          </span>
                          <Ajuda titulo={ajudaDestaque.titulo}>
                            {ajudaDestaque.texto}
                          </Ajuda>
                        </div>
                      )}

                      {/* Título da Área da Vida */}
                      <h3 className="text-lg font-bold text-white tracking-tight mb-1">
                        {AREA_DA_CASA[p.casa] || `casa ${p.casa}`}
                      </h3>

                      {/* Coordenadas Técnicas */}
                      <p className="text-xs font-mono mb-3" style={{ color: T.textMuted }}>
                        {p.grau !== undefined ? `${p.grau}° de ` : ""}{p.signo}, casa {p.casa}
                      </p>

                      {/* Texto de Direcionamento Tático */}
                      <p className="text-sm leading-relaxed text-[#D6D9E0] mb-5">
                        {limpaTracos(p.texto)}
                      </p>
                    </div>

                    {/* Rodapé: Toques no Mapa Natal */}
                    <div>
                      {(p.aspectos ?? []).length > 0 && (
                        <div
                          className="pt-3.5 border-t border-white/[0.06] space-y-2.5 mb-3.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: T.textMuted }}>
                              No seu mapa, isso bate em
                            </span>
                            <Ajuda titulo={ajudaMapa.titulo}>
                              {ajudaMapa.texto}
                            </Ajuda>
                          </div>

                          {(p.aspectos ?? []).slice(0, 3).map((a) => (
                            <div key={a.ponto} className="flex items-start gap-2.5 text-xs">
                              <span
                                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                                style={{ background: a.aplicando || a.exato ? T.gold : T.textMuted }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="leading-snug text-[#E2E4EA]">
                                  <span className="font-semibold text-white">
                                    {limpaTracos(a.ponto_significa)}:
                                  </span>{" "}
                                  {limpaTracos(a.faz)}
                                </p>
                                <p className="text-[10px] font-mono mt-0.5" style={{ color: T.textMuted }}>
                                  {a.aspecto_pt} {a.ponto_pt} · {a.exato ? "no pico exato" : a.aplicando ? "apertando" : "já afrouxando"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Atalho de Aula */}
                      {AULA_BUSSOLA[p.planeta] && (
                        <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between">
                          <span className="text-[10px] font-mono" style={{ color: T.textMuted }}>
                            Aprofundamento
                          </span>
                          <a
                            href={`/dashboard?tab=${AULA_BUSSOLA[p.planeta].tab}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-medium hover:text-[#E2B857] transition-colors"
                            style={{ color: T.textLight }}
                          >
                            <span>{AULA_BUSSOLA[p.planeta].titulo}</span>
                            <span>→</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. A Roda Dupla do Desenho do Céu */}
          {analise.svg && (
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setZoom(true)}
                className="w-full p-4 rounded-2xl flex items-center justify-between transition-all hover:border-[#E2B857]/40 text-left"
                style={{ background: T.surface1, border: `1px solid ${T.border}` }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    ✦ Visualizar Mapa Técnico & Desenho do Céu
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>
                    O seu mapa natal por dentro e o trânsito de {curta(analise.data)} por fora
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white">
                  Abrir Roda ↗
                </span>
              </button>
              <ChartZoomModal
                isOpen={zoom}
                onClose={() => setZoom(false)}
                title={`${primeiroNome ? primeiroNome + " · " : ""}${porExtenso(analise.data)}`}
                svgContent={analise.svg}
              />
            </div>
          )}
        </div>
  );
}
