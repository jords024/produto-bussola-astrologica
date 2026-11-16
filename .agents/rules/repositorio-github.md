---
trigger: always_on
---

# Repositório GitHub do Projeto

O repositório oficial do projeto é:

**URL:** https://github.com/jords024/produto-bussola-astrologica.git

**Protocolo Obrigatório:**
1. Todo `git push` deve ser direcionado para este repositório.
2. Nunca fazer push para outro remote sem autorização explícita do usuário.
3. Antes de sugerir qualquer operação de push, confirmar com o usuário.
4. O branch principal é o `main` — nunca fazer force push no `main`.
5. Toda mensagem de commit (título e corpo) deve obrigatoriamente estar em **português do Brasil**.
6. É OBRIGATÓRIO manter o arquivo `README.md` atualizado com a versão corrente antes de realizar qualquer commit ou push.
7. É OBRIGATÓRIO executar a auditoria unificada de segurança de dependências (`python scripts/audit_security.py`, cobrindo Backend com `pip-audit` e Frontend com `npm audit`) antes de qualquer commit ou push no repositório.
8. **Bloqueio Obrigatório por Falhas de Segurança:** Se a auditoria detectar qualquer vulnerabilidade, o push é **TERMINANTEMENTE BLOQUEADO**. O agente deve reportar detalhadamente o problema ao usuário antes de aplicar correções.

## 🛡️ Auditoria de Segurança de Dependências (Backend + Frontend) Antes do Push

**Antes de qualquer `git push` ou atualização no repositório, é obrigatório executar a verificação completa de segurança das bibliotecas:**
1. Executar o script de auditoria unificado:
   ```bash
   python scripts/audit_security.py
   ```
2. **Critério de Aprovação (100% Obrigatório):**
   - O Backend (`pip-audit` no `backend/requirements.txt`) deve passar com 0 vulnerabilidades críticas.
   - O Frontend (`npm audit` no `frontend/package.json`) deve passar com 0 vulnerabilidades.
3. **Conduta em caso de vulnerabilidades encontradas:**
   - O agente **NÃO pode realizar o push** enquanto a auditoria não passar 100%.
   - O agente **DEVE mencionar e listar detalhadamente para o usuário** o que foi encontrado (nome do pacote, versão, severidade da falha e recomendação).
   - O agente só aplica a correção após detalhar o problema e só realiza o push depois que a auditoria for reexecutada e passar 100% sem erros.

## 🧹 Limpeza Obrigatória da Raiz Antes do Push

**Antes de qualquer `git push`, o agente DEVE inspecionar a raiz do projeto e deletar os seguintes tipos de arquivo caso existam:**

### Arquivos que DEVEM ser deletados se existirem na raiz (apenas arquivos inúteis/temporários):
- `screenshot*.png` — prints de validação visual gerados pelos agentes
- `fixed_layout_*.png`, `modal_saved_*.png` e qualquer outro `.png` de evidência
- `chrome_*.log`, `chrome_err.log`, `chrome_headless.log`, etc. — logs do browser do agente
- `zapvoice_debug.log` e qualquer outro `.log` solto na raiz
- `test_*.db`, `zapvoice.db` e qualquer outro `.db` solto na raiz (bancos de teste temporários)

### 🚫 PROIBIDO DELETAR:
- **NUNCA deletar** arquivos de código Python (`.py`), componentes frontend (`.jsx`, `.js`, `.tsx`, `.ts`), testes unitários ou arquivos de estilo da aplicação.
- O arquivo `verify_system.py` na raiz é protegido e nunca deve ser deletado.

### Protocolo de execução:
1. Rodar `git status` para ver todos os arquivos não rastreados (`??`) e modificados.
2. Identificar na raiz qualquer arquivo de log, print temporário ou lixo que se encaixe nos padrões acima.
3. **MANDATÓRIO:** O agente deve listar explicitamente para o usuário quais arquivos encontrou e pretende deletar.
4. **PROIBIDO:** Nunca executar `git clean -fd` ou deletar arquivos de código/untracked sem consentimento explícito e sem exibir a listagem prévia.
5. Deletar os arquivos de lixo apenas após listar/confirmar, antes de fazer o `git add` e o commit.
6. Só então prosseguir com o commit e o push.