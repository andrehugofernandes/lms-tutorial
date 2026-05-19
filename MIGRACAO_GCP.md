# 🚀 Guia de Migração: Firebase Emulator → GCP Produção

**Projeto:** `projeto_lms`  
**Estratégia de Auth:** Application Default Credentials (ADC)  
**Frontend:** Firebase App Hosting  
**Backend:** Google Cloud Run  

---

## 📋 Pré-requisitos

Antes de começar, confirme que você tem:

| Ferramenta | Verificar com | Instalar |
|---|---|---|
| Node.js 20+ | `node --version` | [nodejs.org](https://nodejs.org) |
| pnpm | `pnpm --version` | `npm i -g pnpm` |
| Firebase CLI | `npx firebase-tools --version` | Usar via `npx` |
| Google Cloud SDK | `gcloud --version` | [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install) |
| Docker | `docker --version` | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Python 3.11+ | `python --version` | [python.org](https://python.org) |

---

## FASE 1 — Autenticação e Configuração do Projeto

### 1.1 Login no Google Cloud (ADC)

```bash
# Autentica suas credenciais locais com o Google Cloud
# Este comando abre o navegador para login com sua conta Google
gcloud auth application-default login
```

> ✅ O ADC permite que o SDK do Firebase e o gcloud usem suas credenciais automaticamente  
> sem precisar de arquivos de chave JSON.

### 1.2 Configurar o projeto GCP

```bash
# Listar projetos disponíveis
gcloud projects list

# Selecionar o projeto
gcloud config set project projeto_lms

# Verificar configuração atual
gcloud config get-value project
```

### 1.3 Login no Firebase CLI e selecionar projeto

```bash
# Login no Firebase (abre o navegador)
npx -y firebase-tools@latest login

# Verificar projetos disponíveis no Firebase
npx -y firebase-tools@latest projects:list

# Selecionar o projeto
npx -y firebase-tools@latest use projeto_lms
```

### 1.4 Atualizar `.firebaserc` na raiz do projeto

```json
{
  "projects": {
    "default": "projeto_lms",
    "dev": "demo-project"
  }
}
```

---

## FASE 2 — Ativar Serviços no Firebase Console

Acesse [console.firebase.google.com](https://console.firebase.google.com) e no projeto `projeto_lms`:

- [ ] **Firestore Database** → Criar banco no modo **Native** (não Datastore)
- [ ] **Authentication** → Ativar o provedor **E-mail/Senha**
- [ ] **App Hosting** → Habilitar o serviço (para o frontend Next.js)

---

## FASE 3 — Exportar Dados do Emulator e Importar no Firestore Real

> ⚠️ **Importante:** O emulator precisa estar rodando antes de exportar.

### 3.1 Iniciar o emulator e exportar os dados

```bash
# Terminal 1 — iniciar o emulator com os dados atuais
npx -y firebase-tools@latest emulators:start --project demo-project

# Terminal 2 — exportar os dados do emulator
npx -y firebase-tools@latest emulators:export ./firestore-export --project demo-project
```

O diretório `./firestore-export` será criado com a estrutura:
```
firestore-export/
  firestore_export/
    all_namespaces/
      all_kinds/
        output-0
  firebase-export-metadata.json
```

### 3.2 Criar bucket no Google Cloud Storage

```bash
# Criar bucket (use o nome do seu projeto)
gsutil mb -p projeto_lms gs://projeto_lms-firestore-backup

# Fazer upload dos dados exportados para o bucket
gsutil -m cp -r ./firestore-export gs://projeto_lms-firestore-backup/v1
```

### 3.3 Importar para o Firestore de produção

```bash
# Importar os dados do bucket para o Firestore real
gcloud firestore import \
  gs://projeto_lms-firestore-backup/v1/firestore-export \
  --project=projeto_lms
```

> 🕐 Este processo pode levar alguns minutos dependendo do volume de dados.

### 3.4 Alternativa (se o import falhar): Re-executar o script de migração

Se o import via GCS apresentar problemas, execute o script de migração diretamente contra o Firestore de produção:

```bash
# Windows PowerShell — remover o emulator host e apontar para produção
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID = "projeto_lms"
Remove-Item Env:FIRESTORE_EMULATOR_HOST -ErrorAction SilentlyContinue

# Executar o script de migração (lê do Postgres e escreve no Firestore real)
pnpm tsx frontend/scripts/migrate-to-firestore.ts
```

### 3.5 Validar os dados no console

Acesse [console.firebase.google.com](https://console.firebase.google.com) → Firestore → verifique as coleções:
- `users` — contas dos usuários
- `profiles` — perfis (role: TEACHER / STUDENT)
- `courses` — cursos criados

---

## FASE 4 — Atualizar as Regras de Segurança do Firestore

> ⚠️ **CRÍTICO:** As regras atuais permitem acesso total a qualquer pessoa. Devem ser  
> substituídas **antes** do deploy em produção.

### 4.1 Substituir o conteúdo de `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Funções auxiliares ─────────────────────────────────────────────
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function getUserProfile() {
      return get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data;
    }

    function isTeacher() {
      return isAuthenticated() && getUserProfile().role == "TEACHER";
    }

    // ── Usuários ───────────────────────────────────────────────────────
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isOwner(userId) &&
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['id', 'email']);
      allow delete: if false;
    }

    // ── Perfis ─────────────────────────────────────────────────────────
    // Escrita apenas via Admin SDK (backend Flask / Next.js server-side)
    match /profiles/{profileId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }

    // ── Cursos ─────────────────────────────────────────────────────────
    match /courses/{courseId} {
      allow read: if resource.data.isPublished == true || isTeacher();
      allow create: if isTeacher();
      allow update: if isTeacher() && resource.data.userId == request.auth.uid;
      allow delete: if isTeacher() && resource.data.userId == request.auth.uid;
    }

    // ── Capítulos ──────────────────────────────────────────────────────
    match /chapters/{chapterId} {
      allow read: if isAuthenticated();
      allow write: if isTeacher();
    }

    // ── Progresso do aluno ────────────────────────────────────────────
    match /userProgress/{progressId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow write: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }

    // ── Compras ───────────────────────────────────────────────────────
    match /purchases/{purchaseId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if false;
    }

    // ── Quiz / Questões / Respostas ───────────────────────────────────
    match /quizzes/{quizId} {
      allow read: if isAuthenticated();
      allow write: if isTeacher();
    }

    match /questions/{questionId} {
      allow read: if isAuthenticated();
      allow write: if isTeacher();
    }

    match /answers/{answerId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow write: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }

    match /quizResults/{resultId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if false;
    }

    // ── Categorias ────────────────────────────────────────────────────
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if false;
    }

    // ── Sessões e Contas (NextAuth) ────────────────────────────────────
    // Nunca acessíveis pelo client — apenas via Admin SDK
    match /sessions/{sessionId} {
      allow read, write: if false;
    }

    match /accounts/{accountId} {
      allow read, write: if false;
    }

    match /verificationTokens/{tokenId} {
      allow read, write: if false;
    }

    // ── Fallback: bloquear tudo que não foi declarado ──────────────────
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4.2 Deploy das regras

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project projeto_lms
```

---

## FASE 5 — Atualizar Código para Produção

### 5.1 `frontend/lib/firebase-admin.ts`

Substitua o conteúdo pelo padrão ADC recomendado:

```typescript
import * as admin from 'firebase-admin';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'projeto_lms';

if (!admin.apps.length) {
  try {
    // Em dev: FIRESTORE_EMULATOR_HOST é lido automaticamente pelo SDK
    // Em prod (App Hosting / Cloud Run): ADC resolve as credenciais
    admin.initializeApp({
      projectId: projectId,
    });
    
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      console.log('Firebase Admin: modo emulator');
    } else {
      console.log('Firebase Admin: modo produção (ADC)');
    }
  } catch (error) {
    console.error('Firebase Admin init error:', error);
  }
}

export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
export const adminDb   = admin.apps.length > 0 ? admin.firestore() : null;
```

### 5.2 `backend/lms_backend/extensions.py`

O código já está correto para ADC. Em produção, o Cloud Run usa a Service Account padrão.

```python
# Em produção: firebase_admin.initialize_app() sem credenciais → usa ADC
# Em dev: FIRESTORE_EMULATOR_HOST + AnonymousCredentials (já implementado)
```

---

## FASE 6 — Deploy do Frontend com Firebase App Hosting

### 6.1 Inicializar App Hosting

```bash
# Na raiz do projeto (não dentro de /frontend)
npx -y firebase-tools@latest init apphosting
```

Responda às perguntas:
- **Project**: `projeto_lms`
- **Backend service resource name**: `lms-frontend`
- **Repository to connect**: (seu repositório GitHub)
- **Branch**: `main` ou `desenvolvimento-diego`

### 6.2 Criar `frontend/apphosting.yaml`

```yaml
# frontend/apphosting.yaml
runConfig:
  runtime: nodejs20
  concurrency: 80
  maxInstances: 10
  minInstances: 0

env:
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: projeto_lms

  - variable: NEXT_PUBLIC_AUTH_PROVIDER
    value: nextauth

  - variable: NEXT_PUBLIC_APP_URL
    value: https://projeto-lms.web.app

  - variable: NEXTAUTH_URL
    value: https://projeto-lms.web.app

  - variable: FLASK_API_URL
    value: https://lms-backend-XXXXXXXX-uc.a.run.app   # ← preencher após deploy do backend

  # Secrets (gerenciados pelo GCP Secret Manager — nunca hardcoded)
  - variable: NEXTAUTH_SECRET
    secret: nextauth-secret

  - variable: BACKEND_INTERNAL_TOKEN
    secret: backend-internal-token
```

### 6.3 Criar secrets no GCP Secret Manager

```bash
# Gerar e salvar NEXTAUTH_SECRET
$secret = -join ((1..32) | ForEach-Object { "{0:x}" -f (Get-Random -Maximum 16) })
echo $secret | gcloud secrets create nextauth-secret --data-file=- --project=projeto_lms

# Gerar e salvar BACKEND_INTERNAL_TOKEN
$token = -join ((1..32) | ForEach-Object { "{0:x}" -f (Get-Random -Maximum 16) })
echo $token | gcloud secrets create backend-internal-token --data-file=- --project=projeto_lms
```

> ✅ Salve os valores gerados — você precisará do `BACKEND_INTERNAL_TOKEN` para o Cloud Run.

### 6.4 Dar acesso ao App Hosting nos secrets

```bash
# ID da Service Account do App Hosting (formato: service-NUMERO@...)
# Verificar no console: IAM > Service Accounts
gcloud secrets add-iam-policy-binding nextauth-secret \
  --member="serviceAccount:firebase-app-hosting-compute@projeto_lms.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=projeto_lms

gcloud secrets add-iam-policy-binding backend-internal-token \
  --member="serviceAccount:firebase-app-hosting-compute@projeto_lms.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=projeto_lms
```

### 6.5 Deploy

```bash
npx -y firebase-tools@latest deploy --only apphosting --project projeto_lms
```

---

## FASE 7 — Deploy do Backend Flask no Cloud Run

### 7.1 Criar `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fonte
COPY . .

# Configurações de produção
ENV FLASK_DEBUG=0
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

EXPOSE 8080

CMD ["python", "app.py"]
```

### 7.2 Criar `backend/.dockerignore`

```
venv/
__pycache__/
*.pyc
*.pyo
.env
*.log
.git
tests/
```

### 7.3 Verificar que `backend/app.py` usa a porta correta

O Flask precisa ouvir na porta 8080 para o Cloud Run:

```python
# No final de app.py, certificar que está assim:
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5328))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "0") == "1")
```

### 7.4 Build e Push da imagem Docker

```bash
# Configurar Docker para usar o Container Registry do GCP
gcloud auth configure-docker

# Build da imagem (estando na raiz do projeto)
docker build -t gcr.io/projeto_lms/lms-backend ./backend

# Push para o Container Registry
docker push gcr.io/projeto_lms/lms-backend
```

### 7.5 Deploy no Cloud Run

```bash
gcloud run deploy lms-backend \
  --image gcr.io/projeto_lms/lms-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 5 \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_PROJECT_ID=projeto_lms" \
  --set-env-vars "BACKEND_INTERNAL_TOKEN=<valor-do-secret-criado-na-fase-6>" \
  --project projeto_lms
```

### 7.6 Obter a URL do backend

```bash
# A URL será exibida ao final do deploy, no formato:
# https://lms-backend-XXXXXXXX-uc.a.run.app

# Copie esta URL e atualize o arquivo frontend/apphosting.yaml:
# FLASK_API_URL: https://lms-backend-XXXXXXXX-uc.a.run.app
```

### 7.7 Dar permissão ao Cloud Run para acessar o Firestore

```bash
# A SA padrão do Cloud Run já tem acesso ao Firestore via ADC
# Verificar permissões:
gcloud projects get-iam-policy projeto_lms \
  --flatten="bindings[].members" \
  --filter="bindings.role=roles/datastore.user"
```

---

## FASE 8 — Configurar CORS no Backend para Produção

Em `backend/lms_backend/__init__.py`, certifique-se que a URL de produção está na lista de origens permitidas:

```python
from flask_cors import CORS

# Atualizar para incluir a URL de produção
CORS(app, origins=[
    "http://localhost:3000",
    "https://projeto-lms.web.app",
    "https://projeto-lms.firebaseapp.com",
    # Adicione o domínio personalizado se houver
])
```

---

## FASE 9 — Verificação Final Pós-Deploy

### 9.1 Testar o backend

```bash
# Verificar se o backend está saudável
curl https://lms-backend-XXXXXXXX-uc.a.run.app/api/health
# Esperado: {"status": "ok"}
```

### 9.2 Testar o frontend

Acesse `https://projeto-lms.web.app` e verifique:

- [ ] Página inicial carrega (sem erros no console do navegador)
- [ ] Botão "Quero me cadastrar" redireciona para `/sign-up`
- [ ] Login com `teste_prof@teste.com` / `123456` funciona
- [ ] Cursos do professor aparecem em `/teacher/courses`
- [ ] Login com `aluno1@lms.com` funciona
- [ ] Catálogo de cursos aparece em `/search`

### 9.3 Verificar Firestore no console

Acesse [console.firebase.google.com](https://console.firebase.google.com) → `projeto_lms` → Firestore:

- [ ] Coleção `users` contém os usuários migrados
- [ ] Coleção `profiles` contém os perfis com `role: TEACHER / STUDENT`
- [ ] Coleção `courses` contém os cursos do professor

### 9.4 Verificar que NENHUMA variável de emulator está ativa

```bash
# Confirmar que FIRESTORE_EMULATOR_HOST não está em produção
# No apphosting.yaml — NÃO deve ter esta linha:
# FIRESTORE_EMULATOR_HOST: 127.0.0.1:8080  ← NUNCA em produção
```

---

## 🔁 Sequência Resumida (Copiar e Executar em Ordem)

```bash
# ── 1. AUTENTICAÇÃO ────────────────────────────────────────────
gcloud auth application-default login
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use projeto_lms
gcloud config set project projeto_lms

# ── 2. EXPORTAR DADOS DO EMULATOR ──────────────────────────────
# (Com emulator rodando em outro terminal)
npx -y firebase-tools@latest emulators:export ./firestore-export --project demo-project

# ── 3. ENVIAR PARA GCS E IMPORTAR ──────────────────────────────
gsutil mb gs://projeto_lms-firestore-backup
gsutil -m cp -r ./firestore-export gs://projeto_lms-firestore-backup/v1
gcloud firestore import gs://projeto_lms-firestore-backup/v1/firestore-export --project=projeto_lms

# ── 4. REGRAS DE SEGURANÇA ─────────────────────────────────────
# (Após atualizar firestore.rules conforme Fase 4)
npx -y firebase-tools@latest deploy --only firestore:rules --project projeto_lms

# ── 5. DEPLOY DO FRONTEND ──────────────────────────────────────
# (Após criar frontend/apphosting.yaml conforme Fase 6)
npx -y firebase-tools@latest deploy --only apphosting --project projeto_lms

# ── 6. DEPLOY DO BACKEND ───────────────────────────────────────
# (Após criar backend/Dockerfile conforme Fase 7)
docker build -t gcr.io/projeto_lms/lms-backend ./backend
docker push gcr.io/projeto_lms/lms-backend
gcloud run deploy lms-backend \
  --image gcr.io/projeto_lms/lms-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_PROJECT_ID=projeto_lms" \
  --project projeto_lms
```

---

## 🆘 Troubleshooting Comum

| Problema | Causa | Solução |
|---|---|---|
| `fetch failed` no frontend | Backend URL errada no `apphosting.yaml` | Atualizar `FLASK_API_URL` com a URL real do Cloud Run |
| `permission denied` no Firestore | Regras muito restritivas | Verificar se o Admin SDK está sendo usado (não o client SDK) |
| `FIRESTORE_EMULATOR_HOST` em prod | Variável não removida | Remover do `apphosting.yaml` |
| Cursos não aparecem | Perfil não encontrado por UID | Verificar se o UID do Firebase Auth bate com o `userId` nos profiles |
| CORS error | Origem não permitida | Adicionar URL de produção no `CORS(app, origins=[...])` |
| Cloud Run sem acesso ao Firestore | SA sem permissão | Adicionar role `roles/datastore.user` na SA do Cloud Run |
