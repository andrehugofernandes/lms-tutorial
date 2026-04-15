
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando recuperação de dados...");

  // 1. Criar Usuário e Perfil de Professor (se não existir)
  const teacherId = "user_2p5X7t9W1q4R8z0Vy3n6M"; // ID fixo para consistência
  
  const user = await db.user.upsert({
    where: { id: teacherId },
    update: {},
    create: {
      id: teacherId,
      name: "Professor Diego",
      email: "diego@example.com",
    }
  });

  await db.profile.upsert({
    where: { userId: teacherId },
    update: { role: "ADMIN" }, // Garantir que ele possa gerenciar tudo
    create: {
      userId: teacherId,
      name: "Professor Diego",
      role: "ADMIN",
    }
  });

  console.log("✅ Usuário Professor configurado.");

  // 2. Criar Categorias
  const categories = [
    { name: "Programação" },
    { name: "Inteligência Artificial" },
    { name: "Redes e Infraestrutura" },
  ];

  for (const cat of categories) {
    await db.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  const allCategories = await db.category.findMany();
  const catMap = Object.fromEntries(allCategories.map(c => [c.name, c.id]));
  console.log("✅ Categorias configuradas.");

  // 3. Definir Cursos
  const coursesData = [
    {
      title: "Trilha de Lógica de Programação",
      description: "Aprenda os fundamentos da programação com o mestre Gustavo Guanabara. Essencial para quem está começando!",
      categoryId: catMap["Programação"],
      imageUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=2069&auto=format&fit=crop",
      chapters: [
        {
          title: "Lógica de Programação #01 - O que é Lógica?",
          description: "Nesta aula, vamos entender o conceito de lógica e como ela se aplica no mundo da programação.",
          videoUrl: "https://www.youtube.com/watch?v=8mei6uVttho",
          embedUrl: "https://www.youtube.com/embed/8mei6uVttho"
        }
      ]
    },
    {
      title: "Trilha de Inteligência Artificial",
      description: "Entenda como a IA está transformando o mundo e como você pode fazer parte dessa revolução.",
      categoryId: catMap["Inteligência Artificial"],
      imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop",
      chapters: [
        {
          title: "IA #01 - Introdução à Inteligência Artificial",
          description: "Conceitos básicos e a história da IA até os dias de hoje.",
          videoUrl: "https://www.youtube.com/watch?v=jQMbuK6URws",
          embedUrl: "https://www.youtube.com/embed/jQMbuK6URws"
        }
      ]
    },
    {
      title: "Trilha de Redes",
      description: "Domine a base da comunicação digital, protocolos e como a internet funciona por baixo do capô.",
      categoryId: catMap["Redes e Infraestrutura"],
      imageUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=2070&auto=format&fit=crop",
      chapters: [
        {
          title: "Redes #01 - O que é uma Rede?",
          description: "Entenda o conceito de redes e a importância da conexão de dados.",
          videoUrl: "https://www.youtube.com/watch?v=QkMbqL8QD9w",
          embedUrl: "https://www.youtube.com/embed/QkMbqL8QD9w"
        }
      ]
    }
  ];

  // 4. Inserir Cursos e Capítulos
  for (const data of coursesData) {
    const course = await db.course.create({
      data: {
        userId: teacherId,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        categoryId: data.categoryId,
        isPublished: true,
        chapters: {
          create: data.chapters.map((ch, index) => ({
            title: ch.title,
            description: ch.description,
            videoSourceType: "EXTERNAL",
            videoProvider: "YOUTUBE",
            videoUrl: ch.videoUrl,
            embedUrl: ch.embedUrl,
            position: index,
            isPublished: true,
            isFree: true,
          }))
        }
      }
    });
    console.log(`✅ Curso '${course.title}' criado com capítulos.`);
  }

  console.log("🏁 Recuperação concluída com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
