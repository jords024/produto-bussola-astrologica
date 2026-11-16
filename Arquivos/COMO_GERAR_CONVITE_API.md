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
