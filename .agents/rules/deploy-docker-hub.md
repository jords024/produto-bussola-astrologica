# Regra de Deploy e Versionamento (Docker Hub)

Toda vez que for realizar o build, atualização ou push de imagens para o Docker Hub, as regras abaixo são **MANDATÓRIAS e ABSOLUTAS**:

## 1. Obrigatoriedade de Atualização Dupla (Backend + Frontend)
- **SEMPRE** atualizar e gerar as **2 imagens juntas** (`backend` e `frontend`), exatamente na mesma versão.
- **NUNCA** atualizar apenas uma das imagens isoladamente. Ambas devem subir juntas e com a mesma numeração de tag (ex: `backend-1.0.6` e `frontend-1.0.6`).

## 2. Proibição Terminante da Tag LATEST
- **NUNCA** utilizar a tag `:latest` em qualquer circunstância (nem no build, nem no tag, nem no push, nem nos arquivos de stack/compose).
- O uso de `:latest` é expressamente proibido no projeto.

## 3. Padrão Obrigatório de Nomenclatura das Imagens
- Imagem Backend: `aryalvesfernandes/bussola-app:backend-<VERSAO>`
- Imagem Frontend: `aryalvesfernandes/bussola-app:frontend-<VERSAO>`
- Exemplo:
  - `aryalvesfernandes/bussola-app:backend-1.0.6`
  - `aryalvesfernandes/bussola-app:frontend-1.0.6`

## 4. Comandos de Build e Push Padrão
Sempre executar em sequência garantindo o sucesso de ambas:
```bash
# 1. Build de ambas as imagens
docker build -t aryalvesfernandes/bussola-app:backend-<VERSAO> -f docker/Dockerfile.backend backend
docker build -t aryalvesfernandes/bussola-app:frontend-<VERSAO> -f docker/Dockerfile.frontend frontend

# 2. Push de ambas as imagens
docker push aryalvesfernandes/bussola-app:backend-<VERSAO>
docker push aryalvesfernandes/bussola-app:frontend-<VERSAO>
```
