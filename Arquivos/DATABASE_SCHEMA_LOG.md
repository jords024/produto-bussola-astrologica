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


