# 🚀 Guia de Integração: Gerar Convite Vitalício via API (Sem Expirar)

Este guia orienta passo a passo como gerar links de convite para novos alunos diretamente através de plataformas externas (**n8n, Make/Integromat, Webhooks de checkout como Kiwify/Hotmart, Typebot, Python, cURL**, etc.) utilizando a **API Key externa**.

---

## 🔑 1. Credenciais de Acesso

* **Chave de API (`X-API-Key`):**
  ```text
  bussola_ext_sec_8f93a1c4e72b0d59
  ```
  *(Esta chave fica configurada na variável `EXTERNAL_API_KEY` do arquivo `.env` do backend).*

* **Ambientes e URLs:**
  * **Produção:** `https://api.bussolaastrologica.com.br/admin/invites` *(ou o domínio onde o backend estiver hospedado)*
  * **Desenvolvimento Local:** `http://localhost:8005/admin/invites`

---

## 📡 2. Detalhes da Requisição HTTP

Para gerar um convite que **NÃO EXPIRA**, envie os seguintes dados:

* **Método:** `POST`
* **URL:** `http://localhost:8005/admin/invites` (ou sua URL de produção)
* **Headers:**
  ```http
  Content-Type: application/json
  X-API-Key: bussola_ext_sec_8f93a1c4e72b0d59
  ```
* **Body (JSON):**
  ```json
  {
    "role": "client",
    "validity_type": "never"
  }
  ```

### 📋 Explicação dos Parâmetros do Body:
| Parâmetro | Tipo | Valores Permitidos | Descrição |
| :--- | :--- | :--- | :--- |
| `role` | `string` | `"client"` ou `"admin"` | Define se o convite é para cadastro de **Aluno** (`"client"`) ou Administrador (`"admin"`). |
| `validity_type` | `string` | `"never"`, `"24h"`, `"48h"`, `"72h"` | Use `"never"` para garantir que o link **não expire**. |
| `access_days` | `integer \| null` | `null` ou `>= 1` | *(Opcional)* Dias de acesso à IA após o cadastro (`null` = vitalício). |
| `daily_request_limit` | `integer \| null` | `null` ou `>= 1` | *(Opcional)* Limite diário de novas Leituras do Dia com IA (`null` = ilimitado). Reset à meia-noite (Brasília). |
| `max_total_requests` | `integer \| null` | `null` ou `>= 1` | *(Opcional)* Limite máximo total (ou franquia inicial livre no modo `quota_then_daily`) de novas Leituras do Dia com IA (`null` = ilimitado). |
| `request_limit_mode` | `string` | `"strict"` ou `"quota_then_daily"` | *(Opcional, padrão `"strict"`)* `"strict"` bloqueia ao atingir o total; `"quota_then_daily"` libera uso livre até atingir `max_total_requests` (ex.: `100`) e depois aplica `daily_request_limit` por dia (ex.: `3`). |
| `allow_multiple_profiles` | `boolean` | `true` ou `false` | *(Opcional, padrão `false`)* Quando `true`, libera o aluno a cadastrar múltiplas pessoas (perfis extras) na conta. |
| `max_extra_profiles` | `integer \| null` | `null` ou `>= 1` | *(Opcional, padrão `null`)* Máximo de perfis extras permitidos quando `allow_multiple_profiles: true` (`null` = ilimitado). |

---

## 📥 3. Resposta Retornada pela API (JSON)

Ao realizar a requisição com sucesso (HTTP `200 OK`), a API retorna:

```json
{
  "id": "e8a9f24b-32c1-4b10-8b9a-112233445566",
  "token": "4vK9L_8xYzQ1mNoP2rStUvWxYz0123456789abcde",
  "role": "client",
  "role_label": "Aluno",
  "validity_type": "never",
  "expires_at": null,
  "access_days": 365,
  "daily_request_limit": 5,
  "max_total_requests": 300,
  "request_limit_mode": "quota_then_daily",
  "allow_multiple_profiles": true,
  "max_extra_profiles": 5,
  "created_at": "2026-10-15T23:00:00Z",
  "invite_path": "/cadastro?token=4vK9L_8xYzQ1mNoP2rStUvWxYz0123456789abcde",
  "invite_url": "https://bussolaastrologica.com.br/cadastro?token=4vK9L_8xYzQ1mNoP2rStUvWxYz0123456789abcde"
}
```

> 🎯 **Dica para Automações:**
> O campo **`invite_url`** já entrega o **link completo e pronto** para ser enviado na mensagem de WhatsApp ou e-mail do seu aluno!

---

## 💻 4. Exemplos Práticos de Integração

### Exemplo 1: cURL (Terminal / Bash)
```bash
curl -X POST "http://localhost:8005/admin/invites" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: bussola_ext_sec_8f93a1c4e72b0d59" \
  -d '{
    "role": "client",
    "validity_type": "never"
  }'
```

### Exemplo 1.1: cURL Completo (Limites de IA + Múltiplos Perfis)
```bash
curl -X POST "https://SUA_API/admin/invites" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <SUA_EXTERNAL_API_KEY>" \
  -d '{
    "role": "client",
    "validity_type": "never",
    "access_days": 365,
    "request_limit_mode": "quota_then_daily",
    "max_total_requests": 300,
    "daily_request_limit": 5,
    "allow_multiple_profiles": true,
    "max_extra_profiles": 5
  }'
```

---

### Exemplo 2: JavaScript / Node.js (fetch)
```javascript
const response = await fetch("http://localhost:8005/admin/invites", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "bussola_ext_sec_8f93a1c4e72b0d59"
  },
  body: JSON.stringify({
    role: "client",
    validity_type: "never"
  })
});

const data = await response.json();
console.log("Link do Aluno:", data.invite_url);
```

---

### Exemplo 3: Python (requests)
```python
import requests

url = "http://localhost:8005/admin/invites"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "bussola_ext_sec_8f93a1c4e72b0d59"
}
payload = {
    "role": "client",
    "validity_type": "never"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

print("Link completo do convite:", data.get("invite_url"))
```

---

### Exemplo 4: No n8n ou Make (Integromat)
1. Crie um nó do tipo **HTTP Request**.
2. **Method:** `POST`.
3. **URL:** `https://sua-api.com/admin/invites` (ou `http://backend:8000/admin/invites` em redes docker).
4. **Headers:**
   * `X-API-Key`: `bussola_ext_sec_8f93a1c4e72b0d59`
   * `Content-Type`: `application/json`
5. **Body:**
   ```json
   {
     "role": "client",
     "validity_type": "never"
   }
   ```
6. No passo seguinte (ex: WhatsApp/Evolution API/Z-API), use a variável:
   `{{ $json.invite_url }}`


---

## ⚡ 5. Atualizar Limites de Requisições de IA de um Aluno Já Cadastrado

Você também pode configurar ou alterar o limite diário e o limite máximo total de um aluno já existente (ex.: após upgrade de plano ou recarga) usando a mesma `X-API-Key`.

* **Método:** `PATCH` (ou `PUT`)
* **URL:** `https://api.bussolaastrologica.com.br/admin/users/limits`
* **Headers:**
  ```http
  Content-Type: application/json
  X-API-Key: bussola_ext_sec_8f93a1c4e72b0d59
  ```
* **Body (JSON) — Exemplo Franquia inicial (100 livres) e depois 3/dia:**
  ```json
  {
    "email": "aluno@exemplo.com",
    "request_limit_mode": "quota_then_daily",
    "max_total_requests": 100,
    "daily_request_limit": 3
  }
  ```
* **Body (JSON) — Exemplo definindo 8/dia e 100 no total (bloqueia ao chegar em 100):**
  ```json
  {
    "email": "aluno@exemplo.com",
    "daily_request_limit": 8,
    "max_total_requests": 100
  }
  ```
* **Body (JSON) — Exemplo liberando ilimitado:**
  ```json
  {
    "email": "aluno@exemplo.com",
    "unlimited_total_requests": true,
    "unlimited_daily_requests": true
  }
  ```
  *(Também aceita `"daily_request_limit": null` e `"max_total_requests": null`, além dos campos opcionais `"ai_model_max_limit"` e `"ai_model_daily_limit"` — use `null` neles para seguir o padrão global. Você pode enviar apenas os campos que deseja alterar, ou passar `"user_id"` no lugar de `"email"`.)*

### Consultar limites e uso atual do aluno
* **Método:** `GET`
* **URL:** `https://api.bussolaastrologica.com.br/admin/users/limits?email=aluno@exemplo.com`
* **Header:** `X-API-Key: <SUA_EXTERNAL_API_KEY>`
* **Retorno:** inclui os limites configurados (`request_limit_mode`, `max_total_requests`, `daily_request_limit`), o consumo realizado (`total_used` e `daily_used` no fuso de Brasília) e o modelo de IA ativo.

> ⚠️ **Observação sobre múltiplos perfis em usuário já cadastrado:**
> O envio de `allow_multiple_profiles` e `max_extra_profiles` via `X-API-Key` funciona na criação do convite (`POST /admin/invites`). Para alterar essa permissão em um usuário já existente, o endpoint atual é `PUT /admin/users/{user_id}` usando autenticação `Authorization: Bearer <TOKEN_JWT_ADMIN>`.
