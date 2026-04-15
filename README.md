# LMS Monorepo

Estrutura atual:

```text
backend/   -> API em Python Flask
frontend/  -> interface em Next.js
```

## Como rodar

1. Instale as dependencias do frontend:

```bash
pnpm install
```

2. Instale as dependencias do backend:

```bash
pip install -r backend/requirements.txt
```

3. Suba os dois com um unico comando:

```bash
pnpm dev
```

Portas padrao:

- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:5328`

## Variaveis de ambiente

O arquivo `.env` continua na raiz e eh compartilhado pelo orquestrador.

Chaves importantes:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_AUTH_PROVIDER`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `UPLOADTHING_SECRET`
- `UPLOADTHING_APP_ID`
- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `GEMINI_API_KEY`

## Observacoes

- O frontend manteve `NextAuth` e `UploadThing`.
- A logica de negocio do LMS foi movida para `backend/`.
- O frontend agora conversa com o Flask por HTTP e usa um proxy em `frontend/app/api/[...path]/route.ts`.
- Documentacao legada segue na raiz em `API.md`, `PRD.md` e `ONBOARDING.md`.
