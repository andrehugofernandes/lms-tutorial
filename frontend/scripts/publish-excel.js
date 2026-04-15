
const { PrismaClient } = require("../lib/generated/client");
const db = new PrismaClient();

async function main() {
  console.log("🚀 Publicando curso de Excel...");
  try {
    const result = await db.course.updateMany({
      where: {
        title: {
          contains: "Excel",
          mode: "insensitive"
        }
      },
      data: {
        isPublished: true
      }
    });

    console.log(`✅ Sucesso! ${result.count} curso(s) publicado(s).`);
  } catch (error) {
    console.error("❌ ERRO AO PUBLICAR:", error.message);
  } finally {
    await db.$disconnect();
  }
}

main();
