# Referência da API (LMS)

A aplicação utiliza [Route Handlers do Next.js (App Router)](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) localizados no diretório `app/api/`. Todas as rotas abaixo requerem autenticação (os blocos usam `auth()` do Clerk, futuro Firebase Auth).

---

## 📚 Categorias de Recursos

### 1. Cursos (`/api/courses`)

#### `POST /api/courses`
Cria um novo rascunho de curso.
- **Requisitos**: Ser Professor (`isTeacher`).
- **Body**: `{ "title": "string" }`
- **Response**: `201 Created` - Retorna o objeto do novo curso.

#### `PATCH /api/courses/:courseId`
Atualiza dados do curso (descrição, thumbnail, preço, categoria).
- **Body**: `{ "description": "string", "imageUrl": "string", "price": 10.0, "categoryId": "uuid" }` (Parâmetros opcionais).
- **Response**: `200 OK` - Retorna o curso atualizado.

#### `DELETE /api/courses/:courseId`
Remove definitivamente um curso e todos os seus anexos e capítulos associados (também remove os arquivos upstream - Mux/Storage).
- **Requisitos**: Autenticação + Dono do Curso.
- **Response**: `200 OK` - Retorna o curso deletado.

#### `PATCH /api/courses/:courseId/publish`
Transita o status do curso para Publicado (`isPublished: true`).
- **Requisitos**: O curso exige pelo menos 1 capítulo publicado, título, descrição, imagem de capa e categoria atribuída antes de aceitar publicar.

#### `PATCH /api/courses/:courseId/unpublish`
Transita o status do curso para Despublicado (`isPublished: false`), tornando-o invisível para a listagem dos alunos.

---

### 2. Capítulos (`/api/courses/:courseId/chapters`)

#### `POST /api/courses/:courseId/chapters`
Cria um novo capítulo num curso existente.
- **Body**: `{ "title": "string" }`
- **Response**: Retorna o objeto base do capítulo (sem vídeo anexado inicialmente).

#### `PUT /api/courses/:courseId/chapters/reorder`
Reordena a lista de capítulos (função Drag 'N Drop do painel).
- **Body**: `{ "list": [{ id: "string", position: number }] }`
- **Response**: `200 OK`

#### `PATCH /api/courses/:courseId/chapters/:chapterId`
Atualiza propriedades do capítulo (descrição curta, se é gratuito, link público de vídeo).
- **Body**: Opcionalmente aceita `videoUrl`, `description`, `isFree`.
- **Response**: `200 OK`

#### `DELETE /api/courses/:courseId/chapters/:chapterId`
Apaga um capítulo e o vídeo interligado na plataforma de hospedagem de vídeos.

#### `PATCH /api/courses/:courseId/chapters/:chapterId/publish`
Publica individualmente um capítulo (só é aceito se existir vídeo e conteúdo mínimo cadastrados na página).

#### `PATCH /api/courses/:courseId/chapters/:chapterId/unpublish`
Exclui temporariamente a visualização do capítulo da jornada do aluno.

#### `PUT /api/courses/:courseId/chapters/:chapterId/progress`
Registra/atualiza o status de conclusão de um capítulo pelo aluno atual.
- **Requisitos**: O aluno precisa ter comprado o curso ou o capítulo ser gratuito.
- **Body**: `{ "isCompleted": boolean }`
- **Response**: Atualiza a coleção `user_progress` recalculando o percentil na UI (Interface).

---

### 3. Anexos (`/api/courses/:courseId/attachments`)

#### `POST /api/courses/:courseId/attachments`
Atrela arquivos de apoio e materiais didáticos extra ao Curso.
- **Body**: `{ "url": "string" }` (Após upload via Uploadthing ou Firebase Storage).
- **Response**: Documento JSON do anexo armazenado.

#### `DELETE /api/courses/:courseId/attachments/:attachmentId`
Deleta permanentemente o anexo/material de apoio da nuvem e do banco de dados relacional.

---

### 4. Pagamentos & Webhooks (`/api/webhook`)

#### `POST /api/webhook` *(Stripe Webhook Provider)*
Ponto cego (Webhook Endpoint) que não exige Header de Usuário logado (`auth()`), usado apenas pela plataforma da **Stripe** para informar eventos seguros que processam pagamento do usuário.
- **Requisitos**: Assinatura criptografada válida do Webhook Header (`Stripe-Signature`).
- **Comportamento**: Quando um evento `checkout.session.completed` é escutado, este endpoint escreve a autorização na tabela de **Purchases** no banco, liberando instantaneamente as aulas privadas para o aluno.
