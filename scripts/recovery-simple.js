
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando recuperação simplificada...");

  const teacherId = "user_recovery_diego_" + Date.now();
  
  // 1. Criar Usuário e Perfil
  const user = await db.user.create({
    data: {
      id: teacherId,
      name: "Professor Diego",
      email: `diego_${Date.now()}@example.com`,
    }
  });

  await db.profile.create({
    data: {
      userId: teacherId,
      name: "Professor Diego",
      role: "ADMIN",
    }
  });

  console.log("✅ Usuário Professor criado:", teacherId);

  // 2. Categorias
  const catProg = await db.category.create({ data: { name: "Programação " + Date.now() } });
  const catIA = await db.category.create({ data: { name: "Inteligência Artificial " + Date.now() } });
  const catRedes = await db.category.create({ data: { name: "Redes " + Date.now() } });

  console.log("✅ Categorias criadas.");

  // 3. Cursos
  const courses = [
    {
      title: "Trilha de Lógica de Programação",
      catId: catProg.id,
      url: "https://www.youtube.com/watch?v=8mei6uVttho",
      embed: "https://www.youtube.com/embed/8mei6uVttho"
    },
    {
      title: "Trilha de Inteligência Artificial",
      catId: catIA.id,
      url: "https://www.youtube.com/watch?v=jQMbuK6URws",
      embed: "https://www.youtube.com/embed/jQMbuK6URws"
    },
    {
      title: "Trilha de Redes",
      catId: catRedes.id,
      url: "https://www.youtube.com/watch?v=QkMbqL8QD9w",
      embed: "https://www.youtube.com/embed/QkMbqL8QD9w"
    }
  ];

  for (const c of courses) {
    await db.course.create({
      data: {
        userId: teacherId,
        title: c.title,
        categoryId: c.catId,
        isPublished: true,
        chapters: {
          create: [{
            title: "Introdução e Boas-vindas",
            videoSourceType: "EXTERNAL",
            videoProvider: "YOUTUBE",
            videoUrl: c.url,
            embedUrl: c.embed,
            position: 0,
            isPublished: true,
            isFree: true,
          }]
        }
      }
    });
    console.log(`✅ Curso '${c.title}' criado.`);
  }

  console.log("🏁 Recuperação concluída!");
}

main().catch(console.error).finally(() => db.$disconnect());
