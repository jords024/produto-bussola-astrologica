export const T = {
  canvas: "#08090c",
  surface1: "#0f1118",
  surface2: "#141722",
  surface3: "#1a1e2d",
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.04)",
  borderGold: "rgba(226, 184, 87, 0.35)",
  gold: "#E2B857",
  goldMuted: "rgba(226, 184, 87, 0.15)",
  goldLight: "#F2D07E",
  text: "#F4F4F6",
  textMuted: "#8A8F9E",
  textLight: "#C5C8D4",
  accent: "#6366F1",
};

export const ICONE: Record<string, string> = {
  Moon: "☽", Sun: "☉", Mercury: "☿", Venus: "♀", Mars: "♂",
};

export const AULA_BUSSOLA: Record<string, { titulo: string; tab: string }> = {
  Moon: { titulo: "Aula da Lua", tab: "essencia" },
  Sun: { titulo: "Aula do Sol", tab: "essencia" },
  Mercury: { titulo: "Aula de Mercúrio", tab: "dons_esquecidos" },
  Venus: { titulo: "Aula de Vênus", tab: "ferida_e_dom" },
  Mars: { titulo: "Aula de Marte", tab: "luz_e_sombra" },
};

export const AREA_DA_CASA: Record<number, string> = {
  1: "você mesmo",
  2: "dinheiro e valor",
  3: "conversas do dia",
  4: "casa e família",
  5: "criar e se expor",
  6: "rotina e corpo",
  7: "o outro e parcerias",
  8: "o que é dividido",
  9: "estudo e horizonte",
  10: "carreira e imagem",
  11: "gente e grupos",
  12: "bastidor e descanso",
};

/** Explicações didáticas do "?" para cada planeta */
export const AJUDA_MAPA_POR_PLANETA: Record<string, { titulo: string; texto: string }> = {
  Moon: {
    titulo: "Como chegamos a esta leitura da Lua",
    texto:
      "Nós cruzamos o movimento da Lua hoje com o ponto exato onde estava a sua sensibilidade quando você nasceu. Isso não é horóscopo geral: quando a Lua toca os pontos da lista abaixo, ela funciona como um gatilho rápido que mexe no seu humor, na sua intuição e no jeito que você reage ao ambiente antes mesmo de pensar. Saber disso ajuda você a entender por que certas conversas ou cobranças parecem pesar mais hoje, para você usar sua percepção com calma em vez de reagir no calor do momento.",
  },
  Sun: {
    titulo: "Como chegamos ao foco do Sol",
    texto:
      "Esta leitura nasce do encontro entre onde o Sol está passando agora e a sua identidade original de nascimento. O Sol funciona como um holofote de clareza: ao encostar nos pontos listados abaixo, ele ilumina com precisão onde a sua energia precisa estar concentrada. Mostra o palco onde a vida está exigindo sua presença, firmeza de postura e decisões pessoais, para você parar de pedir permissão e assumir a liderança desse assunto hoje.",
  },
  Mercury: {
    titulo: "Como chegamos à leitura de Mercúrio",
    texto:
      "Nós calculamos esta orientação comparando onde Mercúrio transita hoje com a parte mental do seu mapa de nascimento. Quando ele ativa os pontos abaixo, ele acelera seus pensamentos, traz ideias à tona e mostra quais assuntos precisam ser destravados. Isso explica por que a sua cabeça está inquieta com propostas, papéis ou mensagens, indicando o melhor momento para colocar combinados no papel e ter conversas diretas.",
  },
  Venus: {
    titulo: "Como chegamos à leitura de Vênus",
    texto:
      "Chegamos a esta leitura cruzando a passagem de Vênus com os pontos de valor e atração gravados no seu nascimento. Em vez de uma promessa vazia, isso mapeia onde o terreno da sua vida está com menos atrito: onde as pessoas estão mais abertas a ouvir suas ideias, onde seu trabalho é mais valorizado e onde você pode negociar valores e fechar acordos lucrativos sem precisar forçar a barra.",
  },
  Mars: {
    titulo: "Como chegamos à leitura de Marte",
    texto:
      "Esta leitura nasce do choque entre o combustível de Marte hoje e a sua iniciativa de nascença. Marte é o acelerador: ao tocar os pontos abaixo, ele mostra exatamente onde você sente pressa, onde a paciência encurta e, principalmente, onde você tem força e coragem para cortar o que atrasa o seu dia e partir para a ação imediata sem hesitar.",
  },
};

export const AJUDA_DESTAQUE_POR_PLANETA: Record<string, { titulo: string; texto: string }> = {
  Sun: {
    titulo: "Por que o Sol é o mais forte de hoje no seu mapa",
    texto:
      "Entre todos os movimentos do céu, o Sol é o que faz o contato mais exato e apertado com o seu mapa de nascimento agora. Ele é o fio condutor principal da sua leitura: é onde a sua energia vital, sua autoridade e suas decisões precisam estar focadas hoje. O Sol ilumina a sua capacidade de se posicionar com clareza, dar a cara a tapa e liderar sem pedir permissão. Ignorar essa área hoje é desperdiçar energia no lugar errado; assumir a frente aqui destrava o resto da sua vida e dos seus negócios.",
  },
  Moon: {
    titulo: "Por que a Lua é a mais forte de hoje no seu mapa",
    texto:
      "A Lua faz o encontro mais apertado e direto com o seu mapa de nascimento neste momento. Ela funciona como o grande termômetro do seu dia: mexe direto no seu humor, na sua sensibilidade e nas suas reações imediatas antes mesmo de raciocinar. Saber disso ajuda você a ler o ambiente e as pessoas com precisão cirúrgica, sem cair no erro de reagir impulsivamente ou tomar decisões no calor do momento.",
  },
  Mercury: {
    titulo: "Por que Mercúrio é o mais forte de hoje no seu mapa",
    texto:
      "Mercúrio faz o contato mais intenso com o seu nascimento hoje, transformando a sua mente e comunicação no grande motor do dia. É o momento em que suas palavras, mensagens, negociações e propostas têm peso dobrado. Aproveite este alinhamento para ter conversas diretas, colocar combinados no papel e destravar decisões práticas.",
  },
  Venus: {
    titulo: "Por que Vênus é a mais forte de hoje no seu mapa",
    texto:
      "Vênus encosta com força máxima no seu mapa natal hoje, criando a sua melhor janela de valor, atração e acordos. É onde o terreno da sua vida está mais receptivo para você ser ouvido, valorizar sua entrega, cobrar o preço justo e fechar parcerias lucrativas com o menor nível de atrito possível.",
  },
  Mars: {
    titulo: "Por que Marte é o mais forte de hoje no seu mapa",
    texto:
      "Marte está em alinhamento direto com o seu nascimento hoje, entregando combustível extra, pressa e coragem de ação. Ele lidera o seu dia para você cortar o que trava seu caminho, vencer a hesitação e executar decisões práticas sem ficar ensaiando.",
  },
};

export const AJUDA_PRAZO_POR_PLANETA: Record<string, { titulo: string; texto: string }> = {
  Moon: {
    titulo: "Ritmo rápido da Lua",
    texto:
      "A Lua muda de área a cada dois dias e meio. Esse clima emocional passa depressa: aproveite a percepção de hoje, mas evite decisões impulsivas no calor do momento.",
  },
  Sun: {
    titulo: "Temporada do Sol",
    texto:
      "O Sol fica cerca de um mês em cada área do seu mapa. Até essa data, este é o palco principal onde vale colocar a sua presença e a sua atenção.",
  },
  Mercury: {
    titulo: "Janela de conversa e estratégia",
    texto:
      "Mercúrio mantém sua mente ligada neste assunto até essa data. Aproveite para negociar, organizar ideias, fazer contas e fechar combinados por escrito.",
  },
  Venus: {
    titulo: "Janela de acordos e ganhos",
    texto:
      "Até essa data, Vênus facilita o bom trato, as vendas e as parcerias nesta área da sua vida. É o melhor prazo para negociar valores e destravar conversas.",
  },
  Mars: {
    titulo: "Ciclo de força e execução",
    texto:
      "Marte entrega combustível extra para esta área até essa data. Use esse prazo para atacar o trabalho pesado, cortar o que trava o seu caminho e agir com firmeza.",
  },
};

export function limpaTracos(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/,\s*,+/g, ",")
    .replace(/:\s*,+/g, ":")
    .replace(/^[—–\-\s]+/, "")
    .trim();
}

export const ETAPAS_LOADING = [
  "Localizando as coordenadas exatas do seu mapa de nascimento...",
  "Calculando o movimento dos astros para o período que você escolheu...",
  "Cruzando os encontros do céu com os pontos que existem só no seu mapa...",
  "Aprofundando a leitura personalizada no modelo 5.6 Sol para o seu momento...",
  "Costurando sua previsão completa e o passo prático, já, já aparece na tela...",
];

export interface Aspecto {
  aspecto: string;
  aspecto_pt: string;
  faz: string;
  ponto: string;
  ponto_pt: string;
  ponto_significa: string;
  orbe: number;
  aplicando: boolean;
  exato: boolean;
  forca: number;
}

export interface Posicao {
  planeta: string;
  planeta_pt: string;
  casa: number;
  signo: string;
  grau?: number;
  retrogrado: boolean;
  ate: string | null;
  texto: string;
  aspectos?: Aspecto[];
  prioridade?: number;
  destaque?: boolean;
  responde_a_pergunta?: boolean;
}

export interface MovimentoPeriodo {
  tipo: "mudanca_casa" | "pico_aspecto";
  data: string;
  planeta: string;
  planeta_pt: string;
  titulo: string;
  descricao: string;
  area_nova?: string;
  ponto_significa?: string;
}

export interface Analise {
  id: string;
  data: string;
  data_fim?: string | null;
  movimentos_periodo?: MovimentoPeriodo[];
  posicoes: Posicao[];
  sintese: string;
  svg: string;
  status: string;
  hora_de_nascimento_conhecida: boolean;
  contexto?: {
    area?: string | null;
    pergunta?: string | null;
    data_fim?: string | null;
  };
}

export interface ItemHistorico {
  id: string;
  data: string;
  data_fim?: string | null;
  status: string;
  tem_sintese: boolean;
  contexto?: {
    area?: string | null;
    pergunta?: string | null;
    data_fim?: string | null;
  };
}

export function sanitizarEntradaTexto(texto: string): string {
  // Remove tags <script> e caracteres de código perigosos (<, >, {, }, $, [, ])
  return texto
    .replace(/<[^>]*>/g, "")
    .replace(/[{}\[\]<>\$]/g, "")
    .slice(0, 300);
}

export function hoje(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function somaDias(dias: number, baseIso?: string): string {
  const d = baseIso ? new Date(`${baseIso}T12:00:00`) : new Date();
  d.setDate(d.getDate() + dias);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function porExtenso(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${d} de ${meses[m - 1]} de ${a}`;
}

export function curta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

