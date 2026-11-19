# 🧭 Bússola Astrológica (`v1.0.10`)

Plataforma SaaS completa de astrologia e autoconhecimento com cálculo astronômico preciso, geração automatizada de mandalas SVG interativas com zoom/pan, relatórios em PDF, podcast cósmico com IA, área exclusiva de membros e painel de gestão com backup automático na nuvem.

---

## ✨ Principais Funcionalidades

- **Análise do Dia (trânsitos):** A pessoa escolhe qualquer data e recebe onde os cinco planetas rápidos (Lua, Sol, Mercúrio, Vênus, Marte) estão passando nas casas do **mapa dela**, o que cada posição abre, até quando dura e uma síntese costurando as cinco numa leitura só. Cada data fica guardada e o histórico reabre sem recalcular.
- **Diário de Bordo Inteligente:** Histórico unificado com paginação elegante de até 20 itens por página, atualização automática ao gerar novas análises e filtros rápidos.
- **Segurança & Sanitização de Entradas:** Sanitização rigorosa tanto no Frontend quanto no Backend contra injeções de HTML, templates e comandos indesejados nas perguntas do aluno.
- **API Externa de Convites Permanentes:** Endpoint seguro via `X-API-Key` para emissão automatizada de links de convites completos e sem expiração por plataformas externas.
- **Cálculo Astronômico Preciso:** Posicionamento de planetas, cúspides de casas e aspectos utilizando astronomia real (`kerykeion`, `pyswisseph`).
- **Mandala Astrológica Interativa:** Renderização SVG em alta definição, controles de tela cheia (100vw x 100vh), zoom in/out via botões e scroll do mouse, e navegação por arraste.
- **Relatórios Cósmicos em PDF:** Exportação de mapa astral e interpretações aprofundadas.
- **Painel Administrativo Completo:**
  - **Login Cósmico Premium:** Tela em 2 colunas com formulário glassmorphism, exibição/ocultação de senha e vitrine visual da Bússola Astrológica.
  - **Barra Lateral Categorizada:** Divisão intuitiva em "Geral" (Home, Pesquisa, Histórico) e "Segurança" (Backup Automático, Sistema de Logs, Gestão de Usuários) com perfil do usuário logado.
  - **Pesquisa e Geração de Mapas:** Listagem permanente de todos os clientes cadastrados com seletor de data de referência para geração rápida em lote.
  - **Histórico de Gerações:** Log completo com horário de Brasília e exclusão em lote.
  - **Gestão de Usuários e Convites:** Controle de acessos por papéis (`super_admin`, `admin`, `client`, `internal_client` — Aluno Interno para testes sem sujar métricas financeiras), criação manual direta com DDI e senha forte, convites com verificação de código por e-mail (Brevo) e exclusão em lote segura.
  - **Financeiro (Consumo de IA):** Painel exclusivo para administradores consolidando gastos de OpenAI (Mapas Astrais + Leituras do Dia) por usuário e por período, com seleção individual ou em lote ("Selecionar todos") e popup de resumo acumulado (leituras, tokens, USD e BRL).
  - **Backups Automáticos & Logs:** Rotinas de backup do PostgreSQL com upload para a nuvem (Backblaze B2/S3), restauração com um clique e monitoramento de logs dos contêineres Docker em tempo real.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS (tema Glassmorphism & Neon)
- **Testes Unitários:** Vitest & React Testing Library (186 testes unitários - 100% aprovados)

### Backend
- **Framework:** FastAPI / Python 3.11
- **Cálculos:** Kerykeion & Swiss Ephemeris
- **Banco de Dados:** PostgreSQL 16 com SQLAlchemy
- **Autenticação:** JWT com hashing seguro bcrypt
- **E-mails & Convites:** Brevo API
- **Testes Unitários:** Pytest (suíte isolada de rotas, serviços, autenticação e financeiro)

---

## 🚀 Como Executar com Docker

### Pré-requisitos
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados.

### Passo a Passo

1. **Subir os contêineres:**
   ```bash
   docker compose -f docker/docker-compose.yml up -d --build
   ```

2. **Acessar os serviços:**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Painel Administrativo:** [http://localhost:3000/admin/](http://localhost:3000/admin/)
   - **Backend API (Docs):** [http://localhost:8005/docs](http://localhost:8005/docs)
   - **Healthcheck:** [http://localhost:8005/health](http://localhost:8005/health)

3. **Executar Testes Unitários:**
   - **Frontend:** `docker exec bussolaapp_frontend npm test -- --run`
   - **Backend:** `docker exec -e PYTHONPATH=/app bussolaapp_backend pytest tests`
     (`pytest` não está na imagem de produção — instale com
     `pip install -r requirements-dev.txt` no ambiente onde for rodar)

---

## 🧭 Como a Análise do Dia funciona

Três peças, nesta ordem:

1. **`backend/services/transit_service.py`** — calcula. Monta o mapa natal da
   pessoa e o céu da data escolhida (meio-dia no local de nascimento, porque a
   Lua anda meio grau por hora) e projeta os cinco planetas rápidos **nas casas
   natais** via `house_comparison.second_points_in_first_houses`. Depois procura,
   dia a dia, até quando cada um continua naquela casa.
2. **`backend/services/interpretacoes.py`** — o texto. 60 blocos, 5 planetas ×
   12 casas. **É material do Crassus e o arquivo está marcado como rascunho
   aguardando a revisão dele.** A IA não escreve estes textos.
3. **`backend/prompts/transito_diario.txt`** — a síntese. A IA recebe os cinco
   blocos já escritos e costura uma leitura de 90 a 130 palavras, sem nenhum
   termo de astrologia no corpo e terminando em algo executável no mesmo dia.

Rotas: `POST /members/analise` (`{"data": "2026-10-06", "forcar": false}`) e
`GET /members/analises` (histórico). A tabela `analises` é criada sozinha pelo
`Base.metadata.create_all` no boot — não precisa de script de migração.

Por que só cinco planetas: são os que mudam de casa dentro de uma vida. Os
lentos ficam anos no mesmo lugar e não dizem nada sobre um dia específico.
