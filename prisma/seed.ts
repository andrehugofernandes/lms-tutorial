import { PrismaClient } from "../lib/generated/db";

const db = new PrismaClient();

async function main() {
  try {
    console.log("Seeding database...");

    // 1. Create Teacher User and Profile
    const teacherEmail = "teste_prof@teste.com";
    const teacher = await db.user.upsert({
      where: { email: teacherEmail },
      update: {},
      create: {
        email: teacherEmail,
        name: "Professor Teste",
        password: "123456", // In production this would be hashed
      },
    });

    await db.profile.upsert({
      where: { userId: teacher.id },
      update: { role: "TEACHER" },
      create: {
        userId: teacher.id,
        name: teacher.name || "Professor",
        email: teacher.email,
        role: "TEACHER",
      },
    });

    // 2. Create Categories
    const categories = [
      { name: "Sistemas de Informação" },
      { name: "Desenvolvimento Web" },
      { name: "Cibersegurança" },
      { name: "Data Science" },
      { name: "Mobile" },
    ];

    for (const category of categories) {
      await db.category.upsert({
        where: { name: category.name },
        update: {},
        create: category,
      });
    }

    const devWebCategory = await db.category.findUnique({
      where: { name: "Desenvolvimento Web" },
    });

    // 3. Create a Test Course for the Teacher
    await db.course.create({
      data: {
        userId: teacher.id,
        title: "LMS Modern Pro: Dominando o Desenvolvimento",
        description: "Um curso completo sobre as novas funcionalidades da plataforma, incluindo gamificação e métricas avançadas.",
        imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
        isPublished: true,
        categoryId: devWebCategory?.id,
        chapters: {
          create: [
            {
              title: "Introdução ao Sistema",
              description: "Bem-vindo ao curso!",
              position: 1,
              isPublished: true,
              isFree: true,
            },
            {
              title: "Gamificação: Quizzes e XP",
              description: "Aprenda a criar engajamento.",
              position: 2,
              isPublished: true,
            }
          ]
        }
      }
    });

    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
