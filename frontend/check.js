const { PrismaClient } = require('./lib/generated/db');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      profile: true
    }
  });
  
  for (const user of users) {
    const courses = await prisma.course.count({ where: { userId: user.id }});
    console.log(`Email: ${user.email} (ID: ${user.id}) -> Courses: ${courses}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
