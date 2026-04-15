
const { PrismaClient } = require("../lib/generated/db");
const db = new PrismaClient();

async function main() {
  console.log("🔍 Testando findUnique no modelo User...");
  try {
    const user = await db.user.findUnique({
      where: { email: "professor@diego.com" }
    });
    console.log("✅ Resultado:", user ? "Encontrado" : "Não encontrado");
  } catch (error) {
    console.error("❌ ERRO NO PRISMA:", error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await db.$disconnect();
  }
}

main();
