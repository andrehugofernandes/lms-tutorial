
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
  console.log("🚀 Iniciando recuperação via SQL Direto...");

  const teacherId = "user_recov_" + Date.now();
  
  // 1. Inserir Usuário
  await db.$executeRawUnsafe(`
    INSERT INTO "User" (id, name, email) 
    VALUES ('${teacherId}', 'Professor Diego', 'diego_sql_${Date.now()}@example.com')
  `);

  // 2. Inserir Perfil
  await db.$executeRawUnsafe(`
    INSERT INTO "Profile" (id, "userId", name, role, "updatedAt") 
    VALUES ('${uuidv4()}', '${teacherId}', 'Professor Diego', 'ADMIN', NOW())
  `);

  console.log("✅ Usuário e Perfil criados via SQL.");

  // 3. Categorias
  const catNames = ["Programação", "Inteligência Artificial", "Redes"];
  const catIds = [];
  for (const name of catNames) {
    const id = uuidv4();
    await db.$executeRawUnsafe(`
      INSERT INTO "Category" (id, name) 
      VALUES ('${id}', '${name}')
    `);
    catIds.push(id);
  }

  console.log("✅ Categorias criadas via SQL.");

  // 4. Cursos e Capítulos
  const courses = [
    {
      title: "Trilha de Lógica de Programação",
      catId: catIds[0],
      url: "https://www.youtube.com/watch?v=8mei6uVttho",
      embed: "https://www.youtube.com/embed/8mei6uVttho"
    },
    {
      title: "Trilha de Inteligência Artificial",
      catId: catIds[1],
      url: "https://www.youtube.com/watch?v=jQMbuK6URws",
      embed: "https://www.youtube.com/embed/jQMbuK6URws"
    },
    {
      title: "Trilha de Redes",
      catId: catIds[2],
      url: "https://www.youtube.com/watch?v=QkMbqL8QD9w",
      embed: "https://www.youtube.com/embed/QkMbqL8QD9w"
    }
  ];

  for (const c of courses) {
    const courseId = uuidv4();
    await db.$executeRawUnsafe(`
      INSERT INTO "Course" (id, "userId", title, "categoryId", "isPublished", "updatedAt") 
      VALUES ('${courseId}', '${teacherId}', '${c.title}', '${c.catId}', true, NOW())
    `);

    const chapterId = uuidv4();
    await db.$executeRawUnsafe(`
      INSERT INTO "Chapter" (
        id, title, "courseId", position, "isPublished", "isFree", 
        "videoSourceType", "videoProvider", "videoUrl", "embedUrl", "updatedAt"
      ) 
      VALUES (
        '${chapterId}', 'Aula 01 - Introdução', '${courseId}', 0, true, true, 
        'EXTERNAL', 'YOUTUBE', '${c.url}', '${c.embed}', NOW()
      )
    `);
    console.log(`✅ Curso '${c.title}' e Capítulo criados via SQL.`);
  }

  console.log("🏁 Recuperação via SQL concluída!");
}

main().catch(console.error).finally(() => db.$disconnect());
