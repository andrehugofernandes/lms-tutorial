# Guia de Onboarding - Projeto LMS

Bem-vindo ao projeto LMS! Este documento contém as informações necessárias para configurar seu ambiente de desenvolvimento e começar a contribuir.

## 🛠️ Tecnologias Principais

- **Framework:** [Next.js 15/16](https://nextjs.org/) (App Router)
- **Linguagem:** TypeScript
- **Banco de Dados:** PostgreSQL (via [Supabase](https://supabase.com/))
- **ORM:** [Prisma](https://www.prisma.io/)
- **Autenticação:** [Clerk](https://clerk.com/)
- **Upload de Arquivos:** [UploadThing](https://uploadthing.com/)
- **Processamento de Vídeo:** [Mux](https://www.mux.com/)
- **Pagamentos:** [Stripe](https://stripe.com/)
- **Estilização:** Tailwind CSS & Shadcn UI

## 📋 Pré-requisitos

Certifique-se de ter instalado:
- Node.js (versão 18 ou superior)
- **pnpm** (Gerenciador de pacotes recomendado)

## 🚀 Configuração Inicial

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd lms-tutorial
   ```

2. **Instale as dependências:**
   ```bash
   pnpm install
   ```

3. **Configuração do Ambiente (`.env`):**
   Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis. Você precisará solicitar as chaves de API para os serviços correspondentes.

   ```env
   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/student/onboarding
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/student/onboarding

   # Database (Supabase)
   DATABASE_URL=
   DIRECT_URL=

   # UploadThing
   UPLOADTHING_SECRET=
   UPLOADTHING_APP_ID=

   # Mux
   MUX_TOKEN_ID=
   MUX_TOKEN_SECRET=

   # Stripe
   STRIPE_API_KEY=
   STRIPE_WEBHOOK_SECRET=

   # App URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Prepare o Banco de Dados:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Inicie o servidor de desenvolvimento:**
   ```bash
   pnpm dev
   ```

## 🏗️ Estrutura do Projeto

- `/app`: Rotas e layouts da aplicação.
- `/components`: Componentes reutilizáveis da UI.
- `/actions`: Server Actions para lógica de backend.
- `/lib`: Utilitários e instâncias de clientes (Prisma, Clerk, etc).
- `/prisma`: Schema do banco de dados e migrações.

## 🔐 Observações Importantes

- **Autenticação:** O projeto usa o Clerk para gerenciar usuários. Certifique-se de configurar os Webhooks se necessário.
- **Mux:** O processamento de vídeo é assíncrono. Verifique os status dos assets no painel do Mux durante o desenvolvimento.
- **UploadThing:** Usado para anexos de curso e imagens de capa.
