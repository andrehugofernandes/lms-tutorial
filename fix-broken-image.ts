import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const courseId = "9fd4b666-056f-4d2a-8bf3-5efdb58ea346";

  console.log(`Updating Course ${courseId} to remove broken imageUrl...`);
  
  const updatedCourse = await prisma.course.update({
    where: { id: courseId },
    data: {
      imageUrl: null,
    },
  });

  console.log(`Successfully updated: ${updatedCourse.title}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
