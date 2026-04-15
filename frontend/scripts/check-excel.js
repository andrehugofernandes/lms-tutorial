
const { PrismaClient } = require("../lib/generated/client");
const db = new PrismaClient();

async function main() {
  console.log("🔍 Buscando todos os cursos cadastrados...");
  try {
    const courses = await db.course.findMany({
      select: {
        id: true,
        title: true,
        isPublished: true,
        userId: true
      }
    });

    if (courses.length === 0) {
      console.log("⚠️ Nenhum curso encontrado no banco de dados.");
    } else {
      console.log(`✅ Encontrados ${courses.length} cursos:`);
      console.table(courses);
    }
    
    const excelCourse = courses.find(c => c.title.toLowerCase().includes("excel"));
    if (excelCourse) {
      console.log("🎯 Curso de EXCEL encontrado!");
      if (!excelCourse.isPublished) {
        console.log("❌ O curso não está PUBLICADO (isPublished: false).");
      } else {
        console.log("✅ O curso está publicado.");
      }
    } else {
      console.log("❌ Nenhum curso com 'Excel' no título foi encontrado.");
    }

  } catch (error) {
    console.error("❌ ERRO AO BUSCAR CURSOS:", error.message);
  } finally {
    await db.$disconnect();
  }
}

main();
