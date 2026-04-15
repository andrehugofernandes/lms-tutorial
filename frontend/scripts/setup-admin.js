
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const email = "professor@diego.com";
  const password = "diego123";
  const name = "Professor Diego";

  console.log(`🔐 Configurando acesso para ${name}...`);

  // Como o Prisma Client pode estar com problemas de trava, vamos usar SQL direto de novo
  const userId = "admin_diego_permanent";
  
  // Limpar se já existir algo com esse email ou ID pra evitar erro de Unique
  await db.$executeRawUnsafe(`DELETE FROM "User" WHERE email = '${email}'`);
  await db.$executeRawUnsafe(`DELETE FROM "Profile" WHERE "userId" = '${userId}'`);
  await db.$executeRawUnsafe(`DELETE FROM "User" WHERE id = '${userId}'`);

  // Inserir Usuário com Senha (o sistema usa plain text conforme lib/next-auth.ts)
  await db.$executeRawUnsafe(`
    INSERT INTO "User" (id, name, email, password) 
    VALUES ('${userId}', '${name}', '${email}', '${password}')
  `);

  // Inserir Perfil como ADMIN
  await db.$executeRawUnsafe(`
    INSERT INTO "Profile" (id, "userId", name, email, role, "updatedAt") 
    VALUES ('profile_admin_diego', '${userId}', '${name}', '${email}', 'ADMIN', NOW())
  `);

  // Vincular os cursos anteriores a este novo usuário admin para que ele possa gerenciar
  await db.$executeRawUnsafe(`UPDATE "Course" SET "userId" = '${userId}'`);

  console.log("✅ Acesso configurado com sucesso!");
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Senha: ${password}`);
}

main().catch(console.error).finally(() => db.$disconnect());
