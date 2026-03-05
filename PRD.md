# Documento de Requisitos do Produto (PRD) - LMS

## 1. Visão Geral
Este projeto é um **Learning Management System (LMS)** completo projetado para permitir a criação, venda e consumo de cursos online. A aplicação possui dois perfis principais: Professores (que criam conteúdo e analisam vendas) e Alunos (que navegam pelos cursos, realizam compras e acompanham seu progresso).

A arquitetura está sendo modernizada para adotar uma infraestrutura baseada 100% no ecossistema e ferramentas integráveis do **Firebase** (Auth, Firestore, Cloud Storage), focada na facilidade de uso do ecossistema Google, alta escalabilidade e uso de Server Components no Next.js.

---

## 2. Público-Alvo e Papéis (Roles)

1.  **Teacher (Professor / Administrador):**
    *   Tem permissão para acessar a área do Dashboard Administrativo.
    *   Pode criar cursos, definir preços, fazer upload de vídeos/arquivos e organizar os capítulos.
    *   Possui acesso a relatórios de Analytics e vendas totais.
    *   *Nota técnica: O acesso é conferido via comparação da ID do usuário contra uma chave mestra (TEACHER_ID) definida no ambiente.*
2.  **Student (Aluno / Usuário Final):**
    *   Acessa o catálogo e busca cursos por título e categoria.
    *   Pode ver detalhes e capítulos gratuitos sem comprar.
    *   Faz a compra via Stripe.
    *   Visualiza e consome as aulas no Player de Vídeo e acompanha seu percentual de conclusão (Progress Tracking).

---

## 3. Escopo Funcional (Features)

### 3.1. Autenticação & Gestão de Acesso (Em migração para Firebase Auth)
*   **Sign-In / Sign-Up:** Formulários limpos integrados via Firebase Auth (Email/Senha ou Social Providers no futuro).
*   **Sessão no Servidor:** Validação da sessão rodando nos Server Components/Actions do Next.js via Admin SDK e verificação de Cookies (garantindo proteção de rotas antes mesmo da tela renderizar).

### 3.2. Catálogo e Descoberta de Cursos
*   **Pesquisa (Search):** Busca otimizada de cursos baseada num título gerado via query local / searchParams.
*   **Filtros Inteligentes:** Listagem e separação inteligente baseada em `Categorias` dinâmicas ("Tecnologia", "Linguagens", etc).
*   **Abertura e Preços:** Identificação visual se um curso foi comprado, e apresentação das etiquetas de preços com formatação monetária (BRL/USD).

### 3.3. Criação de Cursos (Teacher Mode)
*   **Draft System:** Os cursos podem permanecer despublicados até a conclusão de edição (`isPublished`).
*   **Personalização Rica do Curso:**
    *   Título (Title)
    *   Descrição Rica / Rico em Texto (React Quill)
    *   Upload de Capa da Thumb do Curso via Firebase Storage.
    *   Definição de preço customizável e edição de categoria.
*   **Upload de Anexos:** Envio e organização de PDFs/Documentos como material de apoio (Firebase Storage).

### 3.4. Criação de Capítulos e Conteúdo
*   **Gestão de Capítulos:** Adição e reordenação (Drag 'N Drop) da ordem de exibição do módulo.
*   **Preview Mode:** Botão Toggle para definir se o capítulo será *Gratuito para assistir* e servir como isca de marketing.
*   **Player de Vídeo (Migração Exclusiva Mux -> Firebase Storage):** Upload dos arquivos `.mp4` diretamente para a conta do Storage com o componente nativo de vídeo renderizando os bytes da aula sem limite de horas mensais.

### 3.5. Consumo e Pagamento
*   **Checkout via Stripe:** Integração nativa de pagamentos em plataforma Segura com Geração Dinâmica de links do Stripe.
*   **Webhooks Seguros:** Receptor (Webhook) interno no NextJS que escuta o sucesso de uma transação na nuvem e lança as *purchases* confirmadas no banco.
*   **Tracking de Progresso:** Um clique para marcar o vídeo do capítulo atual como finalizado, preenchendo as métricas globais e a barra circular de percentual gerando engajamento e sensação de término.

### 3.6. Dashboard Analítico do Professor
*   **Estatísticas (Analytics):** Visualização consolidada da Receita Total do LMS e total de Matrículas Ativas geradas historicamente em gráficos interativos (Recharts / Chart.js).

---

## 4. Arquitetura e Stack Tecnológica

### Frontend & Core
*   **Framework:** Next.js (Versão App Router v15).
*   **Interface:** React (Server e Client Components).
*   **UI/UX Componentes:** Tailwind CSS, Shadcn UI (Headless UX), Radix Primitives.
*   **Gerenciadores de Estado Local:** Zustand (Para Mobile sidebar e lógicas de menus fluidos).

### Backend & Serviços Cloud (Visão Pós-Migração)
*   **Database:** Firebase Firestore (Coleções: Cursos, Capítulos, Anexos, Categorias, Progresso, Compras, StripeCustomers).
*   **Auth Provider:** Firebase Authentication (Tokens, User Accounts).
*   **Storage Provider:** Firebase Cloud Storage (Imagens de Cover, PDFs, Arquivos MP4 dos capítulos).
*   **Payment Gateway:** Stripe Payments Checkout + Webhooks.

---

## 5. Modelagem de Dados Resumida (Firestore Collections)

1.  **`courses`**: Guarda o núcleo e detalhes de capa.
2.  **`categories`**: Dicionário de listagens, ligado à `categoryId` num curso.
3.  **`chapters`**: Guardam o texto da aula, booleano de gratuidade, sua "position" (número de ordenação) e `videoUrl` (Endereço Público do Storage).
4.  **`attachments`**: Arquivos extras interligados pelo campo ID do curso de destino.
5.  **`purchases`**: Guarda o `userId` (ID Firebase do aluno) + `courseId` do curso que ele comprou.
6.  **`user_progress`**: Documenta o `userId`, `chapterId` e o `isCompleted` como métrica ativa.
7.  **`stripe_customers`**: Faz a ponte ligando o ID do auth com o ID seguro na plataforma contábil (pagamento).
