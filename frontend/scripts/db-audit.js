
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const tables = [
    "user",
    "profile",
    "course",
    "category",
    "chapter",
    "purchase",
    "account",
    "session",
    "attachment",
    "userProgress",
    "muxData",
    "quiz",
    "question",
    "option",
    "answer"
  ];

  console.log("=== AUDITORIA COMPLETA DO BANCO DE DADOS (SUPABASE) ===");
  
  for (const table of tables) {
    try {
      const count = await db[table].count();
      console.log(`${table.padEnd(15)}: ${count} registros`);
    } catch (error) {
      console.log(`${table.padEnd(15)}: Erro ao acessar (Tabela pode não existir)`);
    }
  }
  
  console.log("======================================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
