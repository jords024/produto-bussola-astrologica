# 🧭 Bússola Astrológica — Manual de Arquitetura e Guia do Produto

> **Autor & Estrategista:** Crassus Gobbi  
> **Arquitetura Técnica:** Engenharia Bússola Astrológica  
> **Padrão Visual:** Tático Editorial (Linear / The Pattern / Co-Star)

---

## 1. Visão Geral do Produto

A **Bússola Astrológica** é uma plataforma de navegação pessoal e orientação tática baseada em cálculo astronômico de alta precisão (Swiss Ephemeris / Kerykeion) combinado com inteligência analítica e curadoria de conteúdo de Crassus Gobbi.

Diferente de aplicativos genéricos de astrologia ou horóscopo comercial, a Bússola opera sob a ótica de **estratégia e tomada de decisão**:
- **Linguagem direta e tática:** Comunicação limpa, sem termos excessivamente místicos ou poéticos, sem traços/travessões de redação automática (`-`), focando em ações claras e contextualizadas para o dia a dia.
- **Identidade Visual Tática Editorial:** Paleta predominantemente monocromática escura (`#09090b`, `#121215`, `#18181b`), tipografia refinada com toques de `font-mono` para dados astronômicos, e acentos em ouro champanhe discreto (`#d4af37` / `#e4d18c`).

---

## 2. As Áreas da Experiência do Cliente

A interface do cliente foi desenhada para acesso imediato e transparente através de três pilares:

### 2.1. 🧭 Minha Bússola (Mapa Natal & Mandala Interativa)
- Renderização visual SVG da mandala natal do cliente com suporte a **Zoom (In/Out)**, **Arrasto (Pan)** e **Visualização em Tela Cheia**.
- Cálculo real das 12 casas astrológicas, cúspides, posicionamentos planetários e aspectos fundamentais calculados pela Swiss Ephemeris para as coordenadas exatas de nascimento.

### 2.2. ⚡ A Leitura (Trânsito Diário & Bento Grid Tático)
- **O Mais Forte de Hoje (Hero Card):** Cartão expandido de destaque automático que identifica a força planetária mais provocada no mapa natal do cliente na data selecionada, apresentando:
  - Casa ativada e duração exata do trânsito.
  - Ponto exato do mapa de nascimento ativado (ex: aspecto de trígono, quadratura ou conjunção com grau e orbe).
  - Explicação pedagógica e contextual do porquê aquela força está ativada.
  - Indicador de apoio `(?)` exclusivo nas partes essenciais para esclarecimento rápido.
- **Forças Complementares (Grid 2x2):** Análise dos demais 4 planetas rápidos (Lua, Sol, Mercúrio, Vênus, Marte).
- **Síntese Tática do Dia:** Integração analítica contextual gerada por IA (`gpt-5.6-sol` / OpenAI), sintetizando as 5 forças em uma diretriz tática de 90 a 130 palavras, sem jargões herméticos e sem travessões.

### 2.3. 📖 Diário de Bordo (Histórico de Navegação)
- Registro cronológico de todas as datas consultadas pelo cliente.
- Permite revisitar análises de dias anteriores instantaneamente sem recalcular.

---

## 3. Painel de Gestão & Métricas (Admin)

Acessível em `/admin`, oferece:
- **Gestão de Clientes:** Cadastro, busca, consulta de mapas natais e envio de credenciais táticas via WhatsApp e e-mail.
- **Geração e Regeneração:** Disparo de leituras táticas sob demanda com acompanhamento de progresso.
- **Monitoramento de Custos & Tokens de IA:** Rastreamento exato de consumo de tokens (prompt + completion) e custos em USD ($) e BRL (R$) com suporte a modelos topo de linha (`gpt-5.6-sol`, `gpt-4o`).
- **Segurança & Auditoria:** Logs de contêineres Docker em tempo real e rotinas de backup.

---

## 4. Stack Tecnológica

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS + Design System Editorial Tático
- **Componentes:** Lucide React, Framer Motion, Radix UI

### Backend
- **Framework:** FastAPI / Python 3.11
- **Cálculo Astronômico:** Kerykeion & Swiss Ephemeris (`pyswisseph`)
- **Banco de Dados:** PostgreSQL 16 (SQLAlchemy ORM)
- **Autenticação:** JWT (JSON Web Tokens) com senhas criptografadas via `bcrypt`
- **Mensageria & E-mails:** Resend API & Brevo API

---

## 5. Como Executar Localmente (Guia para Desenvolvedores)

### 5.1. Pré-requisitos
- Python 3.11+
- Node.js 18+ e npm
- PostgreSQL 14+ (ou Docker)

### 5.2. Configuração do Backend
1. Navegue até a pasta `backend`:
   ```bash
   cd backend
   ```
2. Crie e ative o ambiente virtual:
   ```bash
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```
3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
4. Crie o arquivo `.env` na raiz da pasta `backend`:
   ```env
   DATABASE_URL=postgresql://postgres:bussola123@localhost:5432/bussolaapp_db
   OPENAI_API_KEY=sua_chave_openai_aqui
   JWT_SECRET=bussola_secret_super_seguro_2026
   JWT_EXPIRE_HOURS=168
   SUPER_ADMIN_EMAIL=admin@bussola.com
   SUPER_ADMIN_PASSWORD=bussola123
   ```
5. Inicie o servidor FastAPI:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

### 5.3. Configuração do Frontend
1. Navegue até a pasta `frontend`:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie o arquivo `.env.local` na pasta `frontend`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Inicie o Next.js:
   ```bash
   npm run dev
   ```
5. Abra no navegador: [http://localhost:3000](http://localhost:3000)

### 5.4. Acesso Padrão de Desenvolvimento
- **URL Admin:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **E-mail:** `admin@bussola.com` (ou `admin@local.dev`)
- **Senha:** `bussola123`

---

## 6. Fluxo de Atualização Contínua
Ao efetuar melhorias no produto:
1. Trabalhar sempre no branch `main` deste repositório limpo e oficial.
2. Manter estritamente os princípios do design tático editorial (fundo escuro, sem traços de redação sintética, clareza executável).
3. Garantir a integridade dos cálculos astronômicos (`pyswisseph`) e da sanitização de respostas de IA.
