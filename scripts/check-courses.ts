
import { db } from "./lib/db";

async function main() {
  const courses = await db.course.findMany({
    include: {
      category: true,
      chapters: {
        where: {
          isPublished: true,
        },
      },
    },
  });

  console.log("=== LISTA DE CURSOS NO SUPABASE ===");
  courses.forEach((course) => {
    console.log(`ID: ${course.id}`);
    console.log(`Título: ${course.title}`);
    console.log(`Categoria: ${course.category?.name || "Sem categoria"}`);
    console.log(`Capítulos Publicados: ${course.chapters.length}`);
    console.log(`Publicado: ${course.isPublished}`);
    console.log("-----------------------------------");
  });
  console.log(`Total de cursos: ${courses.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

