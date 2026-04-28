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
