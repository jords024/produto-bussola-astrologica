# Log de Alterações de Esquema do Banco de Dados (DATABASE_SCHEMA_LOG.md)

Este documento registra todas as alterações estruturais realizadas nas tabelas e modelos do banco de dados do projeto.

---

### [2026-10-02] Criação da Tabela `user_invites`
- **Tabela Afetada:** `user_invites` (Nova tabela)
- **Objetivo:** Armazenar links e tokens de convite para criação de novas contas (Aluno ou Admin) com controle de expiração (24h, 48h, 72h ou Nunca expira) e rastreamento de uso.
- **Colunas Criadas:**
  - `id` (UUID, Primary Key)
  - `token` (VARCHAR, Unique, Indexed)
  - `role` (VARCHAR, Not Null, Default 'client') - Papel do usuário a ser criado ('client' para Aluno ou 'admin' para Administrador)
  - `validity_type` (VARCHAR, Not Null, Default 'never') - Tipo de validade ('never', '24h', '48h', '72h')
  - `expires_at` (TIMESTAMP, Nullable) - Data/hora limite de validade do convite
  - `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)
  - `created_by_id` (UUID, Nullable, Foreign Key -> `users.id`)
  - `is_used` (BOOLEAN, Not Null, Default FALSE)
  - `used_at` (TIMESTAMP, Nullable)
  - `used_by_id` (UUID, Nullable, Foreign Key -> `users.id`)
- **Script de Migração:** `backend/scripts/add_user_invites_table.py`

---

### [2026-10-02] Criação da Tabela `registration_verifications`
- **Tabela Afetada:** `registration_verifications` (Nova tabela)
- **Objetivo:** Armazenar temporariamente dados de pré-cadastro e códigos OTP de 6 dígitos enviados via Brevo para validação de e-mails antes da efetivação da conta.
- **Colunas Criadas:**
  - `id` (VARCHAR(36), Primary Key)
  - `email` (VARCHAR(255), Not Null, Indexed)
  - `name` (VARCHAR(255), Not Null)
  - `whatsapp` (VARCHAR(50), Nullable)
  - `password_hash` (VARCHAR(255), Not Null)
  - `invite_token` (VARCHAR(255), Not Null)
  - `code` (VARCHAR(6), Not Null)
  - `expires_at` (TIMESTAMP, Not Null)
  - `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)
- **Script de Migração:** `backend/scripts/create_registration_verifications.py`

---

### [2026-10-02] Criação da Tabela `backup_configs`
- **Tabela Afetada:** `backup_configs` (Nova tabela)
- **Objetivo:** Armazenar as configurações e preferências do sistema de Backup Automático para o Backblaze B2 (status ativo/inativo, frequência em horas, pasta destino no bucket B2, limite de retenção e datas do último/próximo backup).
- **Colunas Criadas:**
  - `id` (VARCHAR(36), Primary Key)
  - `is_active` (BOOLEAN, Default TRUE)
  - `frequency_hours` (INTEGER, Default 6)
  - `b2_folder` (VARCHAR(255), Default 'AreaDeMembros/backups/')
  - `retention_max` (INTEGER, Default 30)
  - `last_backup_at` (TIMESTAMP, Nullable)
  - `next_backup_at` (TIMESTAMP, Nullable)
  - `last_backup_status` (VARCHAR(50), Default 'idle')
  - `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)
  - `updated_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)
- **Script de Migração:** `backend/scripts/create_backup_configs.py`

---

### [2026-11-16] Adição de Colunas de Consumo de IA na Tabela `analises`
- **Tabela Afetada:** `analises`
- **Objetivo:** Armazenar tokens e custo em USD de cada Leitura do Dia gerada pela OpenAI para consolidação na aba Financeiro.
- **Colunas Criadas:**
  - `prompt_tokens` (INTEGER, Default 0)
  - `completion_tokens` (INTEGER, Default 0)
  - `total_tokens` (INTEGER, Default 0)
  - `cost_usd` (DOUBLE PRECISION, Default 0.0)
- **Script de Migração:** `backend/scripts/add_analises_cost_columns.py`

---

### [2026-11-17] Controle de Tempo de Acesso (`users.access_expires_at` e `user_invites.access_days`)
- **Tabelas Afetadas:** `users`, `user_invites`
- **Objetivo:** Permitir definir prazo de acesso à plataforma/IA para alunos (com expiração parcial bloqueando apenas novas gerações de IA, mantendo admins/super admin sem expiração).
- **Colunas Criadas:**
  - `users.access_expires_at` (TIMESTAMP, Nullable — `NULL` indica acesso vitalício)
  - `user_invites.access_days` (INTEGER, Nullable — dias de acesso concedidos ao usuário ao aceitar o convite)
- **Script de Migração:** `backend/scripts/add_access_expiration_columns.py`

---

### [2026-11-17] Suporte a Múltiplos Perfis Astrológicos (`astro_profiles`, `users` e `analises`)
- **Tabelas Afetadas:** `users`, `astro_profiles` (Nova tabela), `analises`
- **Objetivo:** Permitir configurar por aluno se ele pode cadastrar múltiplas pessoas (e o limite máximo ou ilimitado), armazenar os mapas natais dessas pessoas em `astro_profiles` e vincular leituras (`analises`) ao perfil escolhido.
- **Alterações:**
  - `users.allow_multiple_profiles` (BOOLEAN, Default FALSE)
  - `users.max_extra_profiles` (INTEGER, Nullable — `NULL` indica ilimitado quando ativo)
  - Nova tabela `astro_profiles` (`id`, `owner_user_id`, `name`, `relationship_label`, `birth_date`, `birth_time`, `birth_city`, `birth_state`, `birth_country`, `tz_str`, `lat`, `lng`, `sun_sign`, `moon_sign`, `rising_sign`, `svg_content`, `chart_data`, `created_at`, `updated_at`)
  - `analises.profile_id` (UUID, Nullable, Foreign Key -> `astro_profiles.id`)
- **Script de Migração:** `backend/scripts/add_multiple_profiles_columns.py`

---

### [2026-11-17] Criação da Tabela `tutorial_lessons` (Comece Aqui)
- **Tabela Afetada:** `tutorial_lessons` (Nova tabela)
- **Objetivo:** Armazenar os tutoriais em vídeo (upload local ou link externo) e em texto exibidos na aba **Comece Aqui**.
- **Colunas Criadas:**
  - `id` (UUID, Primary Key)
  - `title` (VARCHAR, Not Null)
  - `description` (TEXT)
  - `lesson_type` (VARCHAR, Default `'video'`) — `'video'` ou `'text'`
  - `video_source` (VARCHAR, Default `'url'`) — `'upload'` ou `'url'`
  - `video_url` (TEXT, Nullable)
  - `text_content` (TEXT)
  - `duration` (VARCHAR)
  - `sort_order` (INTEGER, Default `0`)
  - `created_by_id` (UUID, Nullable, Foreign Key -> `users.id`)
  - `created_at`, `updated_at` (TIMESTAMP)
- **Script de Migração:** `backend/scripts/add_tutorials_table.py`





---

### [2026-11-19] Limites de Requisições de IA por Aluno (`users` e `user_invites`)
- **Tabelas Afetadas:** `users`, `user_invites`
- **Objetivo:** Permitir configurar limite diário (reset à meia-noite no horário de Brasília) e limite máximo total de novas gerações de Leitura do Dia feitas por IA por aluno, tanto pelo painel quanto via API externa (`X-API-Key`). `NULL` indica ilimitado.
- **Colunas Criadas:**
  - `users.daily_request_limit` (INTEGER, Nullable — `NULL` indica ilimitado)
  - `users.max_total_requests` (INTEGER, Nullable — `NULL` indica ilimitado)
  - `user_invites.daily_request_limit` (INTEGER, Nullable — aplicado automaticamente ao usuário no cadastro via convite)
  - `user_invites.max_total_requests` (INTEGER, Nullable — aplicado automaticamente ao usuário no cadastro via convite)
- **Script de Migração:** `backend/scripts/add_request_limits_columns.py`

---

### [2026-11-19] Modo de Limite de Requisições (`request_limit_mode` em `users` e `user_invites`)
- **Tabelas Afetadas:** `users`, `user_invites`
- **Objetivo:** Permitir escolher por aluno/convite entre o modo rígido (`strict` — bloqueia ao atingir o total) e o modo franquia + diário (`quota_then_daily` — uso livre até atingir `max_total_requests` e depois entra em `daily_request_limit` por dia com reset à meia-noite de Brasília).
- **Colunas Criadas:**
  - `users.request_limit_mode` (VARCHAR, Default `'strict'`)
  - `user_invites.request_limit_mode` (VARCHAR, Default `'strict'`)
- **Script de Migração:** `backend/scripts/add_request_limit_mode_column.py`


---

### [2026-11-20] Tabela `ai_model_configs` e Colunas de Modelo de IA em `users`
- **Tabelas Afetadas:** `ai_model_configs` (Nova tabela) e `users`
- **Objetivo:** Permitir ao Admin/Super Admin configurar os modelos de IA globais e por aluno para a fase de Limite Máximo/Franquia e para a fase de Limite por Dia.
- **Colunas Criadas:**
  - `ai_model_configs.id` (VARCHAR, Primary Key, Default `'default'`)
  - `ai_model_configs.max_limit_model` (VARCHAR, Not Null, Default `'gpt-5.6-sol'`)
  - `ai_model_configs.daily_limit_model` (VARCHAR, Not Null, Default `'gpt-4o-mini'`)
  - `ai_model_configs.updated_by` (VARCHAR, Nullable)
  - `ai_model_configs.updated_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)
  - `users.ai_model_max_limit` (VARCHAR, Nullable)
  - `users.ai_model_daily_limit` (VARCHAR, Nullable)
- **Script de Migração:** `backend/scripts/add_ai_model_configs.py` (também aplicado automaticamente via `ensure_schema` no startup).


---

### [2026-11-20] Adição de Modelos de Fallback em `ai_model_configs`
- **Tabela Afetada:** `ai_model_configs`
- **Objetivo:** Permitir configurar um modelo de fallback dedicado para a fase de Limite Máximo/Franquia e outro para a fase de Limite por Dia.
- **Colunas Criadas:**
  - `ai_model_configs.max_limit_fallback_model` (VARCHAR, Not Null, Default `'gpt-5.6-luna'`)
  - `ai_model_configs.daily_limit_fallback_model` (VARCHAR, Not Null, Default `'gpt-4o-mini'`)
- **Script de Migração:** `backend/scripts/add_ai_model_configs.py` (também aplicado automaticamente via `ensure_schema` no startup).


---

### [2026-11-24] Permissão de Múltiplos Perfis em Convites (`user_invites`)
- **Tabela Afetada:** `user_invites`
- **Objetivo:** Permitir configurar `allow_multiple_profiles` e `max_extra_profiles` diretamente na criação de convites (`POST /admin/invites`, inclusive via `X-API-Key`), aplicando automaticamente ao usuário no cadastro.
- **Colunas Criadas:**
  - `user_invites.allow_multiple_profiles` (BOOLEAN, Default FALSE)
  - `user_invites.max_extra_profiles` (INTEGER, Nullable — `NULL` indica ilimitado quando ativo)
- **Script de Migração:** `backend/scripts/add_invite_multiple_profiles_columns.py` (também aplicado automaticamente via `ensure_schema` no startup).
