# Requisitos do Sistema — LMS (Learning Management System)

**Projeto:** Plataforma de Ensino a Distância — PMJG  
**Versão:** 1.0  
**Data:** Abril de 2026  
**Responsável:** Equipe de Desenvolvimento (Diego Evangelista & Arnaldo)

---

## 1. Visão Geral do Sistema

O sistema é uma plataforma de gerenciamento de aprendizagem (LMS) institucional que permite a professores criarem e publicarem cursos em vídeo, e a alunos consumirem esse conteúdo de forma gratuita (sem barreira de pagamento), acompanhando seu progresso e participando de atividades gamificadas.

A arquitetura é composta por:
- **Frontend**: Next.js 15 (App Router) em `/frontend`
- **Backend**: API REST em Python (Flask) em `/backend`
- **Banco de Dados**: PostgreSQL (Supabase)
- **ORM Frontend**: Prisma (para leituras no frontend)
- **Autenticação**: NextAuth.js (credenciais e sessões)

---

## 2. Perfis de Usuário (Roles)

| Role | Descrição |
|---|---|
| `STUDENT` | Aluno padrão — acessa cursos, acompanha progresso e realiza quizzes |
| `TEACHER` | Professor — cria, edita e publica cursos e capítulos |
| `ADMIN` | Administrador — possui todos os privilégios de professor e pode promover outros usuários |

---

## 3. Requisitos Funcionais

### RF01 — Autenticação e Gerenciamento de Sessão

| ID | Requisito |
|---|---|
| RF01.1 | O sistema deve permitir cadastro de novos usuários com e-mail e senha. |
| RF01.2 | O sistema deve permitir login com e-mail e senha (sessão via NextAuth.js + JWT). |
| RF01.3 | O sistema deve redirecionar usuários não autenticados para a página de login ao acessar rotas protegidas. |
| RF01.4 | O sistema deve persistir a sessão do usuário entre navegações. |
| RF01.5 | O sistema deve criar automaticamente um perfil (`Profile`) com role `STUDENT` no primeiro acesso. |
| RF01.6 | O sistema deve suportar fluxo de onboarding para novos alunos ao primeiro login. |
| RF01.7 | Usuários com role `TEACHER` ou `ADMIN` devem ser redirecionados ao painel do professor após o login. |

---

### RF02 — Catálogo e Descoberta de Cursos (Aluno)

| ID | Requisito |
|---|---|
| RF02.1 | O sistema deve exibir todos os cursos publicados (`isPublished = true`) no catálogo. |
| RF02.2 | O aluno deve poder buscar cursos por título via campo de texto. |
| RF02.3 | O aluno deve poder filtrar cursos por categoria. |
| RF02.4 | O sistema deve exibir, para cada curso no catálogo, o título, imagem de capa, categoria e número de capítulos. |
| RF02.5 | O sistema deve indicar visualmente se o aluno já está matriculado em um curso. |
| RF02.6 | O sistema deve exibir o percentual de progresso do aluno nos cursos em que ele está matriculado. |

---

### RF03 — Matrícula e Acesso a Cursos (Aluno)

| ID | Requisito |
|---|---|
| RF03.1 | O aluno deve poder se matricular em qualquer curso publicado de forma gratuita (sem pagamento). |
| RF03.2 | Ao se matricular, o sistema deve registrar a matrícula na tabela `Purchase`. |
| RF03.3 | Após a matrícula, o aluno deve ser redirecionado ao primeiro capítulo do curso. |
| RF03.4 | Capítulos marcados como gratuitos (`isFree = true`) devem ser acessíveis sem matrícula. |
| RF03.5 | Capítulos não gratuitos devem ser bloqueados para alunos não matriculados. |
| RF03.6 | O sistema deve exibir uma mensagem de bloqueio ao aluno que tentar acessar capítulo sem matrícula. |

---

### RF04 — Player de Vídeo e Consumo de Conteúdo (Aluno)

| ID | Requisito |
|---|---|
| RF04.1 | O sistema deve reproduzir vídeos hospedados na plataforma Mux (upload direto). |
| RF04.2 | O sistema deve reproduzir vídeos de fontes externas (YouTube, Vimeo, outros links). |
| RF04.3 | O aluno deve poder marcar um capítulo como concluído ao final do vídeo. |
| RF04.4 | O sistema deve exibir automaticamente o próximo capítulo ao concluir o atual. |
| RF04.5 | O sistema deve exibir efeito de celebração (confete) ao concluir o último capítulo do curso. |
| RF04.6 | O aluno deve poder visualizar os anexos (materiais de apoio) do curso na página do capítulo. |
| RF04.7 | O aluno deve poder criar e salvar anotações (notas) com timestamp vinculado ao capítulo. |
| RF04.8 | O aluno deve poder visualizar, editar e excluir suas anotações. |
| RF04.9 | O sistema deve exibir a barra lateral do curso com todos os capítulos publicados e seu status de conclusão. |

---

### RF05 — Progresso e Gamificação (Aluno)

| ID | Requisito |
|---|---|
| RF05.1 | O sistema deve calcular e exibir o percentual de conclusão de cada curso para o aluno. |
| RF05.2 | O dashboard do aluno deve exibir: horas totais estudadas, cursos concluídos, cursos em andamento e conquistas (medalhas). |
| RF05.3 | O sistema deve registrar e exibir a ofensiva de estudos diários (*streak*) do aluno. |
| RF05.4 | O sistema deve conceder pontos de experiência (XP) ao aluno ao concluir quizzes. |
| RF05.5 | O sistema deve calcular o nível do aluno com base no XP acumulado (5 níveis: Iniciante → Especialista). |
| RF05.6 | O sistema deve conceder conquistas (achievements) ao aluno ao completar um curso inteiro. |
| RF05.7 | O dashboard do aluno deve exibir os cursos em andamento com atalho para continuar de onde parou. |

---

### RF06 — Quiz e Avaliações (Aluno)

| ID | Requisito |
|---|---|
| RF06.1 | O aluno deve poder realizar o quiz vinculado a um capítulo após assistir ao vídeo. |
| RF06.2 | O sistema deve apresentar as questões do quiz em sequência com alternativas de múltipla escolha. |
| RF06.3 | O sistema deve exibir o resultado do quiz (pontuação, XP ganho, aprovado/reprovado) ao finalizar. |
| RF06.4 | O sistema deve registrar o resultado do quiz e não permitir refazê-lo (uma tentativa por aluno). |
| RF06.5 | O sistema deve aplicar multiplicador de XP por combo de respostas consecutivas corretas (≥ 3 seguidas = 2x XP). |
| RF06.6 | O sistema deve suportar questões bônus com pontuação extra configurável. |
| RF06.7 | O sistema deve suportar limite de tempo por quiz (configurável pelo professor). |
| RF06.8 | Se o quiz for marcado como obrigatório, o aluno só deve poder avançar ao capítulo seguinte após aprovação. |

---

### RF07 — Criação e Gerenciamento de Cursos (Professor)

| ID | Requisito |
|---|---|
| RF07.1 | O professor deve poder criar um novo curso fornecendo apenas o título inicial. |
| RF07.2 | O professor deve poder editar: título, descrição (rich text), imagem de capa, categoria e preço do curso. |
| RF07.3 | O professor deve poder publicar (`isPublished = true`) e despublicar um curso. |
| RF07.4 | Um curso só pode ser publicado se tiver: título, descrição, imagem, categoria e ao menos 1 capítulo publicado. |
| RF07.5 | O professor deve poder excluir um curso, removendo junto todos os capítulos e anexos associados. |
| RF07.6 | O professor deve poder fazer upload de anexos (PDFs, documentos) para um curso. |
| RF07.7 | O professor deve poder remover anexos individualmente. |

---

### RF08 — Criação e Gerenciamento de Capítulos (Professor)

| ID | Requisito |
|---|---|
| RF08.1 | O professor deve poder adicionar capítulos a um curso existente. |
| RF08.2 | O professor deve poder reordenar capítulos via drag-and-drop. |
| RF08.3 | O professor deve poder editar: título, descrição, duração (em minutos), tipo e URL de vídeo. |
| RF08.4 | O sistema deve suportar dois tipos de vídeo: upload direto (Mux) e URL externa (YouTube/Vimeo/outros). |
| RF08.5 | Para vídeos externos do YouTube, o sistema deve transcrever automaticamente o áudio em segundo plano. |
| RF08.6 | O professor deve poder marcar um capítulo como gratuito (`isFree`) para acesso sem matrícula. |
| RF08.7 | O professor deve poder publicar e despublicar capítulos individualmente. |
| RF08.8 | Um capítulo só pode ser publicado se tiver título, descrição e vídeo associado. |
| RF08.9 | O professor deve poder excluir um capítulo (e o asset de vídeo associado no Mux). |

---

### RF09 — Criação e Gerenciamento de Quizzes (Professor)

| ID | Requisito |
|---|---|
| RF09.1 | O professor deve poder criar um quiz vinculado a um capítulo. |
| RF09.2 | O professor deve poder configurar: número máximo de questões, nota mínima de aprovação e limite de tempo. |
| RF09.3 | O professor deve poder adicionar, editar e remover questões manualmente. |
| RF09.4 | O professor deve poder gerar questões automaticamente via IA (Google Gemini) com base na transcrição do vídeo. |
| RF09.5 | O professor deve poder marcar questões como bônus e configurar a pontuação extra. |
| RF09.6 | O professor deve poder publicar e despublicar quizzes. |
| RF09.7 | O professor deve poder marcar um quiz como obrigatório. |
| RF09.8 | O professor deve poder excluir um quiz. |

---

### RF10 — Dashboard e Analytics (Professor)

| ID | Requisito |
|---|---|
| RF10.1 | O professor deve ter um painel com a lista de todos os seus cursos e seus status (publicado/rascunho). |
| RF10.2 | O painel do professor deve exibir o número total de alunos matriculados por curso. |
| RF10.3 | O professor deve poder acessar a área de analytics com gráficos de engajamento e matrículas. |
| RF10.4 | O painel do professor deve ser acessível apenas para usuários com role `TEACHER` ou `ADMIN`. |

---

### RF11 — Administração do Sistema (Admin)

| ID | Requisito |
|---|---|
| RF11.1 | O administrador deve poder promover um usuário ao role `TEACHER` via painel de administração. |
| RF11.2 | O administrador deve poder promover um usuário ao role `ADMIN`. |
| RF11.3 | O sistema deve disponibilizar uma rota de gerenciamento de categorias, acessível apenas para `TEACHER` e `ADMIN`. |
| RF11.4 | O administrador deve poder criar e listar categorias de cursos. |

---

### RF12 — Integração com Modelo de LLM Local

| ID | Requisito |
|---|---|
| RF12.1 | O sistema deve suportar integração com um modelo de linguagem (LLM) local, acessível via handler configurável. |
| RF12.2 | A comunicação com o modelo deve suportar streaming de respostas (tokens em tempo real). |
| RF12.3 | O sistema deve suportar execução assíncrona das queries ao modelo para não bloquear o servidor. |

---

## 4. Requisitos Não Funcionais

### RNF01 — Desempenho

| ID | Requisito |
|---|---|
| RNF01.1 | As páginas do catálogo e dashboard devem carregar em menos de 3 segundos em conexões de 10 Mbps. |
| RNF01.2 | As consultas ao banco de dados devem utilizar índices nas colunas de busca frequente (`courseId`, `userId`, `chapterId`). |
| RNF01.3 | O backend Python deve processar requisições de API em menos de 500ms para operações simples de CRUD. |
| RNF01.4 | A transcrição automática de vídeos do YouTube deve ser executada em thread separada (não bloqueante). |
| RNF01.5 | O sistema deve utilizar `joinedload` (eager loading) no SQLAlchemy para evitar o problema de N+1 queries. |

---

### RNF02 — Segurança

| ID | Requisito |
|---|---|
| RNF02.1 | Todas as rotas privadas devem verificar a autenticidade da sessão antes de processar qualquer dado. |
| RNF02.2 | Senhas de usuários devem ser armazenadas com hash seguro (bcrypt). |
| RNF02.3 | Chaves de API (Mux, Gemini, banco de dados) não devem ser expostas no código-fonte — devem ser carregadas via variáveis de ambiente. |
| RNF02.4 | O backend deve validar o token de autenticação em cada requisição via middleware dedicado. |
| RNF02.5 | Operações de criação/edição/exclusão de cursos e capítulos devem verificar se o usuário autenticado é o proprietário do recurso. |
| RNF02.6 | O sistema não deve expor dados de outros usuários em nenhuma resposta de API. |
| RNF02.7 | Arquivos `.pyc` e `__pycache__` não devem ser commitados no repositório. |

---

### RNF03 — Usabilidade

| ID | Requisito |
|---|---|
| RNF03.1 | A interface deve ser responsiva e funcionar em dispositivos móveis (≥ 320px) e desktops. |
| RNF03.2 | O sistema deve fornecer feedback visual imediato (toast/snackbar) para todas as ações do usuário (salvo, erro, etc.). |
| RNF03.3 | O player de vídeo deve exibir um indicador de carregamento enquanto o vídeo não está pronto. |
| RNF03.4 | O sistema deve exibir mensagens de erro em português para o usuário final. |
| RNF03.5 | A barra lateral do curso deve indicar visualmente quais capítulos estão concluídos e quais estão bloqueados. |

---

### RNF04 — Manutenibilidade e Arquitetura

| ID | Requisito |
|---|---|
| RNF04.1 | O projeto deve seguir a arquitetura monorepo com separação clara entre `frontend/` e `backend/`. |
| RNF04.2 | O backend deve seguir o padrão de camadas: `models.py` (dados), `services.py` (lógica de negócio), `routes.py` (HTTP) e `utils.py` (serialização). |
| RNF04.3 | O frontend deve utilizar Server Components do Next.js para busca de dados no servidor sempre que possível. |
| RNF04.4 | Toda comunicação entre frontend e backend deve ocorrer via a camada `serverApi` (abstração de fetch autenticado). |
| RNF04.5 | O schema do banco de dados deve ser versionado via Prisma Migrations. |
| RNF04.6 | O código deve seguir os padrões de linting e formatação configurados no projeto (ESLint/TypeScript). |

---

### RNF05 — Disponibilidade e Escalabilidade

| ID | Requisito |
|---|---|
| RNF05.1 | O banco de dados deve ser hospedado em serviço gerenciado (Supabase/PostgreSQL) com backups automáticos. |
| RNF05.2 | O sistema deve suportar ao menos 50 usuários simultâneos sem degradação perceptível de desempenho. |
| RNF05.3 | O processamento de vídeo (Mux) deve ser assíncrono — o professor deve continuar trabalhando enquanto o vídeo é processado. |

---

### RNF06 — Compatibilidade

| ID | Requisito |
|---|---|
| RNF06.1 | O frontend deve ser compatível com os navegadores Chrome, Firefox, Edge e Safari (versões dos últimos 2 anos). |
| RNF06.2 | O backend deve ser compatível com Python 3.10+. |
| RNF06.3 | O frontend deve ser compatível com Node.js 18+. |
| RNF06.4 | O gerenciador de pacotes do frontend deve ser o `pnpm`. |

---

### RNF07 — Internacionalização e Localização

| ID | Requisito |
|---|---|
| RNF07.1 | O sistema deve operar em língua portuguesa (pt-BR) como idioma padrão. |
| RNF07.2 | A transcrição automática de vídeos deve priorizar o idioma português (`pt`, `pt-BR`) e inglês como fallback. |

---

## 5. Modelagem de Dados — Entidades Principais

| Entidade | Descrição |
|---|---|
| `User` | Conta de autenticação do usuário. |
| `Profile` | Perfil com role (`STUDENT`, `TEACHER`, `ADMIN`) vinculado ao `User`. |
| `Course` | Curso com título, descrição, imagem, categoria e status de publicação. |
| `Category` | Categoria de agrupamento de cursos. |
| `Chapter` | Capítulo de um curso com vídeo (Mux ou externo), descrição, posição e duração. |
| `MuxData` | Metadados do asset de vídeo processado pelo Mux (`assetId`, `playbackId`). |
| `Attachment` | Arquivo de material de apoio vinculado a um curso. |
| `UserProgress` | Registro de progresso do aluno por capítulo (`isCompleted`). |
| `Purchase` | Registro de matrícula do aluno em um curso. |
| `Quiz` | Quiz vinculado a um capítulo com configurações de tempo, nota e obrigatoriedade. |
| `Question` | Questão de um quiz com peso de pontuação e flag de bônus. |
| `Option` | Alternativa de uma questão com flag de resposta correta. |
| `Answer` | Resposta do aluno a uma questão (uma por tentativa). |
| `QuizResult` | Resultado consolidado do quiz por aluno (score, XP, aprovado). |
| `UserXP` | Pontos de experiência totais e nível do aluno. |
| `Achievement` | Conquista (medalha) concedida ao aluno por completar um curso. |
| `UserNote` | Anotação criada pelo aluno durante um capítulo, com timestamp. |
| `UserStreak` | Ofensiva de acesso diário consecutivo do aluno. |

---

## 6. Interfaces Externas e Integrações

| Serviço | Finalidade |
|---|---|
| **Mux** | Upload, processamento e reprodução de vídeos via CDN. |
| **Google Gemini (1.5 Flash)** | Geração automática de questões de quiz com base na transcrição do vídeo. |
| **YouTube Transcript API** | Transcrição automática de legendas de vídeos do YouTube. |
| **Supabase (PostgreSQL)** | Banco de dados relacional gerenciado na nuvem. |
| **UploadThing** | Upload de imagens de capa e anexos do curso. |
| **Modelo LLM Local** | Integração futura com modelo de linguagem local via handler plugável. |

---

*Documento gerado com base na análise do código-fonte do repositório em Abril de 2026.*

---

## 7. Status de Implementação

> Legenda: ✅ **Implementado** | ⚠️ **Parcialmente implementado** | ❌ **Não implementado**

### 7.1 Requisitos Funcionais

| ID | Requisito (resumo) | Status | Evidência no código |
|---|---|:---:|---|
| **RF01 — Autenticação** ||||
| RF01.1 | Cadastro com e-mail e senha | ✅ | `frontend/app/(auth)/(routes)/sign-up/` |
| RF01.2 | Login com e-mail e senha (NextAuth + JWT) | ✅ | `frontend/app/(auth)/(routes)/sign-in/` + `frontend/lib/auth.ts` |
| RF01.3 | Redirecionamento de rotas protegidas | ✅ | `middleware.ts` + `redirect("/")` em todas as páginas autenticadas |
| RF01.4 | Persistência de sessão entre navegações | ✅ | NextAuth gerencia sessão com cookie seguro |
| RF01.5 | Criação automática de perfil STUDENT | ✅ | `backend/lms_backend/services.py` → `ensure_student_profile()` |
| RF01.6 | Fluxo de onboarding para novos alunos | ✅ | `frontend/app/student/onboarding/` |
| RF01.7 | Redirecionamento de professores ao painel | ✅ | `dashboard/page.tsx` → detecta `mode === "teacher"` e renderiza `TeacherDashboard` |
| **RF02 — Catálogo** ||||
| RF02.1 | Exibir cursos publicados no catálogo | ✅ | `backend/routes.py` → `build_catalog_payload()` filtra `isPublished=True` |
| RF02.2 | Busca por título | ✅ | `backend/routes.py` → `Course.title.ilike(f"%{title}%")` |
| RF02.3 | Filtro por categoria | ✅ | `backend/routes.py` → `Course.categoryId == category_id` |
| RF02.4 | Exibição de título, imagem, categoria e capítulos | ✅ | `serialize_course()` + `serialize_chapter()` em `utils.py` |
| RF02.5 | Indicação visual de matrícula do aluno | ✅ | `build_catalog_payload()` compara `course.id in purchases` |
| RF02.6 | Percentual de progresso no catálogo | ✅ | `get_progress(user_id, course.id)` chamado para cursos com matrícula |
| **RF03 — Matrícula** ||||
| RF03.1 | Matrícula gratuita sem pagamento | ✅ | Rota de enroll no backend cria `Purchase` sem cobrança |
| RF03.2 | Registro de matrícula na tabela `Purchase` | ✅ | `backend/lms_backend/models.py` → classe `Purchase` |
| RF03.3 | Redirecionamento ao primeiro capítulo | ✅ | Rota de enroll redireciona para `chapters[0]` após `Purchase` criado |
| RF03.4 | Capítulos gratuitos acessíveis sem matrícula | ✅ | `chapter.isFree` verificado na rota de dados do capítulo |
| RF03.5 | Bloqueio de capítulos não gratuitos sem matrícula | ⚠️ | `isLocked` está hardcoded como `false` em `page.tsx` — validação existe no backend mas não bloqueia a UI |
| RF03.6 | Mensagem de bloqueio ao aluno sem matrícula | ⚠️ | Componente `<Lock>` existe no `VideoPlayer` mas não é ativado (`isLocked=false`) |
| **RF04 — Player de Vídeo** ||||
| RF04.1 | Reprodução de vídeos Mux | ✅ | `VideoPlayer` usa `<MuxPlayer>` quando `videoSourceType === "UPLOAD"` |
| RF04.2 | Reprodução de vídeos externos (YouTube/Vimeo) | ✅ | `VideoPlayer` usa `<ReactPlayer>` quando `videoSourceType === "EXTERNAL"` |
| RF04.3 | Marcar capítulo como concluído | ✅ | `<CourseProgressButton>` chama `PUT /api/courses/.../progress` |
| RF04.4 | Exibição automática do próximo capítulo | ✅ | `onEnd()` em `video-player.tsx` redireciona via `router.push` para `nextChapterId` |
| RF04.5 | Efeito de celebração (confete) no último capítulo | ✅ | `useConfettiStore` disparado quando não há `nextChapterId` |
| RF04.6 | Exibição de anexos do curso | ✅ | `chapter/page.tsx` lista `attachments` com link para download |
| RF04.7 | Criar anotações com timestamp | ✅ | `<ChapterNotes>` com `getCurrentTime()` passado como prop |
| RF04.8 | Visualizar, editar e excluir anotações | ✅ | `<ChapterNotes>` implementa CRUD completo de notas |
| RF04.9 | Barra lateral com capítulos e status | ✅ | `<CourseSidebar>` exibe todos os capítulos com ícone de conclusão |
| **RF05 — Progresso e Gamificação** ||||
| RF05.1 | Percentual de conclusão de cada curso | ✅ | `get_progress()` em `services.py` calcula capítulos concluídos / total |
| RF05.2 | Dashboard com métricas do aluno | ✅ | `dashboard/page.tsx` exibe horas, cursos concluídos, em andamento e medalhas |
| RF05.3 | Streak de estudos diários | ✅ | `UserStreak` model + `update_user_streak()` + `<StreakCard>` no dashboard |
| RF05.4 | Concessão de XP ao concluir quiz | ✅ | `backend/routes.py` → `update_chapter_progress` acumula XP em `UserXP` |
| RF05.5 | Cálculo de nível por XP (5 níveis) | ✅ | `calc_level()` e `LEVEL_LABELS` em `services.py` |
| RF05.6 | Conquistas ao completar curso | ✅ | `Achievement` model + lógica de award quando progresso atinge 100% |
| RF05.7 | Atalho "Continuar Assistindo" no dashboard | ✅ | `<CheckpointCard>` com `coursesInProgress` no dashboard |
| **RF06 — Quiz** ||||
| RF06.1 | Realizar quiz vinculado ao capítulo | ✅ | `<QuizPlayer>` renderizado em `chapter/page.tsx` quando `quiz.isPublished` |
| RF06.2 | Questões em sequência com múltipla escolha | ✅ | `<QuizPlayer>` itera questões com opções de resposta |
| RF06.3 | Resultado com pontuação, XP e status | ✅ | `QuizResult` retornado pelo backend após submissão |
| RF06.4 | Uma tentativa por aluno (sem refazer) | ✅ | `UniqueConstraint("userId", "quizId")` em `QuizResult` |
| RF06.5 | Multiplicador 2x XP por combo ≥ 3 corretas | ✅ | `calc_question_xp()` em `services.py` → `if combo_count >= 3: xp *= 2` |
| RF06.6 | Questões bônus com pontuação extra | ✅ | `isBonus` + `bonusPoints` no modelo `Question` |
| RF06.7 | Limite de tempo configurável por quiz | ✅ | Campo `timeLimit` no modelo `Quiz` |
| RF06.8 | Quiz obrigatório bloqueia avanço ao capítulo | ⚠️ | Campo `isRequired` existe no modelo mas a lógica de bloqueio não está implementada na UI |
| **RF07 — Criação de Cursos** ||||
| RF07.1 | Criar curso com só o título | ✅ | `POST /api/courses` no backend aceita apenas `title` |
| RF07.2 | Editar título, descrição, imagem, categoria, preço | ✅ | `PATCH /api/courses/{id}` aceita todos os campos opcionais |
| RF07.3 | Publicar e despublicar curso | ✅ | `PATCH /api/courses/{id}/publish` e `/unpublish` |
| RF07.4 | Validação antes de publicar | ✅ | Backend valida título, descrição, imagem, categoria e ≥1 capítulo publicado |
| RF07.5 | Excluir curso com cascata | ✅ | `DELETE /api/courses/{id}` com `ondelete="CASCADE"` nos relacionamentos |
| RF07.6 | Upload de anexos | ✅ | `POST /api/courses/{id}/attachments` |
| RF07.7 | Remover anexo individual | ✅ | `DELETE /api/courses/{id}/attachments/{attachmentId}` + remoção no Mux |
| **RF08 — Capítulos** ||||
| RF08.1 | Adicionar capítulos ao curso | ✅ | `POST /api/courses/{id}/chapters` |
| RF08.2 | Reordenar via drag-and-drop | ✅ | `PUT /api/courses/{id}/chapters/reorder` |
| RF08.3 | Editar título, descrição, duração, vídeo | ✅ | `PATCH /api/courses/{id}/chapters/{id}` |
| RF08.4 | Suporte a vídeo Mux e externo | ✅ | `VideoSourceTypeEnum` → `UPLOAD` / `EXTERNAL` |
| RF08.5 | Transcrição automática de YouTube em background | ✅ | `start_transcription()` em `services.py` → `threading.Thread(daemon=True)` |
| RF08.6 | Marcar capítulo como gratuito | ✅ | Campo `isFree` no modelo `Chapter` |
| RF08.7 | Publicar e despublicar capítulos | ✅ | `PATCH /api/courses/{id}/chapters/{id}/publish` e `/unpublish` |
| RF08.8 | Validação antes de publicar capítulo | ✅ | Backend valida título, descrição e presença de vídeo |
| RF08.9 | Excluir capítulo e asset Mux | ✅ | `DELETE` + `delete_mux_asset(mux_data.assetId)` |
| **RF09 — Quizzes (Professor)** ||||
| RF09.1 | Criar quiz vinculado ao capítulo | ✅ | `POST /api/courses/{id}/chapters/{id}/quiz` |
| RF09.2 | Configurar maxQuestions, passingScore, timeLimit | ✅ | Todos os campos no modelo `Quiz` e rota PATCH |
| RF09.3 | CRUD manual de questões | ✅ | Rotas de criação, edição e exclusão de `Question` |
| RF09.4 | Geração de questões via IA (Gemini) | ✅ | `generate_quiz_questions()` em `services.py` usa `gemini-1.5-flash` |
| RF09.5 | Questões bônus com pontuação extra | ✅ | `isBonus` + `bonusPoints` configuráveis |
| RF09.6 | Publicar e despublicar quiz | ✅ | `PATCH /api/courses/{id}/chapters/{id}/quiz/publish` e `/unpublish` |
| RF09.7 | Marcar quiz como obrigatório | ✅ | Campo `isRequired` no modelo `Quiz` |
| RF09.8 | Excluir quiz | ✅ | `DELETE /api/courses/{id}/chapters/{id}/quiz` |
| **RF10 — Dashboard do Professor** ||||
| RF10.1 | Lista de cursos com status | ✅ | `TeacherDashboard` lista cursos com badges de publicação |
| RF10.2 | Total de alunos matriculados por curso | ✅ | `backend/routes.py` retorna `stats` com contagem de matrículas |
| RF10.3 | Analytics com gráficos | ✅ | Rota `/teacher/analytics` com gráficos de engajamento |
| RF10.4 | Acesso restrito a TEACHER/ADMIN | ✅ | `layout.tsx` do grupo `teacher/` verifica role |
| **RF11 — Administração** ||||
| RF11.1 | Promover usuário a TEACHER via painel | ⚠️ | `promote_admin_profile()` existe no backend; painel admin no frontend é um placeholder vazio |
| RF11.2 | Promover usuário a ADMIN | ⚠️ | Lógica existe no backend mas sem UI funcional no frontend |
| RF11.3 | Rota de categorias restrita a TEACHER/ADMIN | ✅ | `require_roles` aplicado nas rotas de categoria no backend |
| RF11.4 | Criar e listar categorias | ✅ | `GET/POST /api/meta/categories` implementados |
| **RF12 — LLM Local** ||||
| RF12.1 | Integração com LLM local via handler | ✅ | `backend/llm.py` + `backend/lms_backend/con_model.py` |
| RF12.2 | Streaming de respostas do modelo | ✅ | `backend/lms_backend/utils_stream.py` → `iter_sync()` |
| RF12.3 | Execução assíncrona de queries | ✅ | `backend/lms_backend/utils_async_runner.py` |

---

### 7.2 Requisitos Não Funcionais

| ID | Requisito (resumo) | Status | Evidência / Observação |
|---|---|:---:|---|
| **RNF01 — Desempenho** ||||
| RNF01.1 | Páginas carregam em < 3s em 10 Mbps | ⚠️ | Arquitetura favorece isso mas não há testes de carga documentados |
| RNF01.2 | Índices nas colunas de busca frequente | ✅ | `models.py` define `Index` em `chapterId`, `courseId`, `userId`, `questionId` |
| RNF01.3 | Backend responde < 500ms em CRUD simples | ⚠️ | Sem benchmarks formais; estrutura de queries é eficiente |
| RNF01.4 | Transcrição em thread separada (não bloqueante) | ✅ | `start_transcription()` usa `threading.Thread(daemon=True)` |
| RNF01.5 | `joinedload` para evitar N+1 queries | ✅ | `routes.py` usa `joinedload(Course.category)`, `joinedload(Course.chapters)` |
| **RNF02 — Segurança** ||||
| RNF02.1 | Verificação de sessão em rotas protegidas | ✅ | `get_current_user()` chamado no início de todas as rotas privadas |
| RNF02.2 | Senhas com hash seguro (bcrypt) | ✅ | NextAuth com provider Credentials usa bcrypt por padrão |
| RNF02.3 | Chaves de API via variáveis de ambiente | ✅ | `config.py` lê todas as chaves via `os.environ` |
| RNF02.4 | Token validado em cada requisição no backend | ✅ | `backend/lms_backend/auth.py` → middleware `get_current_user()` |
| RNF02.5 | Verificação de proprietário do recurso | ✅ | Rotas de curso/capítulo comparam `course.userId == current_user.id` |
| RNF02.6 | Não expõe dados de outros usuários | ✅ | Queries sempre filtradas por `userId` do usuário autenticado |
| RNF02.7 | Arquivos `.pyc` não commitados | ❌ | Arquivos `__pycache__/*.pyc` foram incluídos no commit `7f15f766` — necessário adicionar ao `.gitignore` |
| **RNF03 — Usabilidade** ||||
| RNF03.1 | Interface responsiva (mobile e desktop) | ✅ | Tailwind CSS com classes responsivas (`md:`, `lg:`) em todos os componentes |
| RNF03.2 | Feedback visual imediato (toast) | ✅ | `react-hot-toast` usado em toda a aplicação |
| RNF03.3 | Indicador de carregamento no player | ✅ | `chapter/page.tsx` exibe spinner enquanto `loading === true` |
| RNF03.4 | Mensagens de erro em português | ✅ | Todas as mensagens de UI estão em pt-BR |
| RNF03.5 | Barra lateral indica status dos capítulos | ✅ | `<CourseSidebar>` exibe ícone de check/lock por capítulo |
| **RNF04 — Manutenibilidade** ||||
| RNF04.1 | Arquitetura monorepo com `frontend/` e `backend/` | ✅ | `pnpm-workspace.yaml` define o monorepo |
| RNF04.2 | Separação em camadas no backend | ✅ | `models.py` / `services.py` / `routes.py` / `utils.py` bem definidos |
| RNF04.3 | Server Components para busca de dados | ⚠️ | `chapter/page.tsx` usa `"use client"` — mistura de padrões; `dashboard/page.tsx` é Server Component correto |
| RNF04.4 | Comunicação via camada `serverApi` | ✅ | `frontend/lib/server-api.ts` abstrai todos os fetches autenticados |
| RNF04.5 | Schema versionado via Prisma Migrations | ✅ | `frontend/prisma/migrations/` com migration `0_init` |
| RNF04.6 | Padrões de linting (ESLint/TypeScript) | ✅ | `tsconfig.json` e configuração ESLint presentes |
| **RNF05 — Disponibilidade** ||||
| RNF05.1 | Banco gerenciado com backups automáticos | ✅ | Supabase configurado como banco (`DATABASE_URL` via env) |
| RNF05.2 | Suporte a ≥ 50 usuários simultâneos | ⚠️ | Sem teste de carga; Supabase e Flask podem escalar mas não validado |
| RNF05.3 | Processamento de vídeo Mux assíncrono | ✅ | Mux processa o asset de forma assíncrona; backend apenas registra IDs |
| **RNF06 — Compatibilidade** ||||
| RNF06.1 | Compatível com Chrome, Firefox, Edge, Safari | ⚠️ | Sem testes formais entre browsers documentados |
| RNF06.2 | Backend compatível com Python 3.10+ | ✅ | Uso de `type hints` modernos e arquivos `.pyc` com `cpython-310` confirmado |
| RNF06.3 | Frontend compatível com Node.js 18+ | ✅ | `package.json` e Next.js 15 exigem Node ≥ 18 |
| RNF06.4 | Gerenciador de pacotes `pnpm` | ✅ | `pnpm-lock.yaml` e `pnpm-workspace.yaml` presentes |
| **RNF07 — Internacionalização** ||||
| RNF07.1 | Sistema em pt-BR | ✅ | Toda a interface, mensagens e labels estão em português |
| RNF07.2 | Transcrição prioriza pt/pt-BR | ✅ | `start_transcription()` → `languages=["pt", "pt-BR", "en"]` |

---

### 7.3 Resumo Geral

| Grupo | Total | ✅ Implementado | ⚠️ Parcial | ❌ Não implementado |
|---|:---:|:---:|:---:|:---:|
| RF01 — Autenticação | 7 | 7 | 0 | 0 |
| RF02 — Catálogo | 6 | 6 | 0 | 0 |
| RF03 — Matrícula | 6 | 4 | 2 | 0 |
| RF04 — Player de Vídeo | 9 | 9 | 0 | 0 |
| RF05 — Progresso/Gamificação | 7 | 7 | 0 | 0 |
| RF06 — Quiz (Aluno) | 8 | 7 | 1 | 0 |
| RF07 — Criação de Cursos | 7 | 7 | 0 | 0 |
| RF08 — Capítulos | 9 | 9 | 0 | 0 |
| RF09 — Quizzes (Professor) | 8 | 8 | 0 | 0 |
| RF10 — Dashboard Professor | 4 | 4 | 0 | 0 |
| RF11 — Administração | 4 | 2 | 2 | 0 |
| RF12 — LLM Local | 3 | 3 | 0 | 0 |
| **Total RF** | **78** | **73** | **5** | **0** |
| RNF01 — Desempenho | 5 | 3 | 2 | 0 |
| RNF02 — Segurança | 7 | 6 | 0 | 1 |
| RNF03 — Usabilidade | 5 | 5 | 0 | 0 |
| RNF04 — Manutenibilidade | 6 | 5 | 1 | 0 |
| RNF05 — Disponibilidade | 3 | 2 | 1 | 0 |
| RNF06 — Compatibilidade | 4 | 3 | 1 | 0 |
| RNF07 — Internacionalização | 2 | 2 | 0 | 0 |
| **Total RNF** | **32** | **26** | **5** | **1** |
| **TOTAL GERAL** | **110** | **99** | **10** | **1** |

---

### 7.4 Pendências Prioritárias

| Prioridade | ID | Descrição |
|:---:|---|---|
| 🔴 Alta | RF03.5 / RF03.6 | Ativar bloqueio de capítulos na UI — `isLocked` está hardcoded como `false` em `chapter/page.tsx` |
| 🔴 Alta | RNF02.7 | Adicionar `__pycache__/` e `*.pyc` ao `.gitignore` e remover do repositório |
| 🟡 Média | RF06.8 | Implementar bloqueio de avanço de capítulo quando quiz obrigatório não foi aprovado |
| 🟡 Média | RF11.1 / RF11.2 | Desenvolver UI funcional no painel admin para promoção de usuários |
| 🟢 Baixa | RNF01.1 / RNF01.3 | Executar testes de carga e documentar benchmarks de performance |
| 🟢 Baixa | RNF04.3 | Refatorar `chapter/page.tsx` para usar Server Component com fetch no servidor |
| 🟢 Baixa | RNF05.2 / RNF06.1 | Realizar testes formais de carga e compatibilidade entre navegadores |

---

*Status auditado em Abril de 2026 com base na análise direta do código-fonte.*
