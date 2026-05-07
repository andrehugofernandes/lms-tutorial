const { PrismaClient } = require('./lib/generated/db');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({ where: { id: 'cmmxreghl0000kgisy7lt71l2' }});
  console.log('User holding the courses:', u);
}

main().finally(() => prisma.$disconnect());
