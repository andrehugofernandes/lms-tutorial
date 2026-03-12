import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const brokenUrlPart = "deaf4f52-4a0b-4a57-89dd-1ab6f38aaff8";

  console.log("Searching for broken URL in Courses...");
  const courses = await prisma.course.findMany({
    where: {
      imageUrl: {
        contains: brokenUrlPart,
      },
    },
  });

  if (courses.length > 0) {
    console.log("Found in Courses:");
    courses.forEach(c => console.log(`- ID: ${c.id}, Title: ${c.title}`));
  } else {
    console.log("Not found in Courses.");
  }

  console.log("\nSearching for broken URL in Chapters...");
  const chapters = await prisma.chapter.findMany({
    where: {
      videoUrl: {
        contains: brokenUrlPart,
      },
    },
  });

  if (chapters.length > 0) {
    console.log("Found in Chapters:");
    chapters.forEach(ch => console.log(`- ID: ${ch.id}, Title: ${ch.title}`));
  } else {
    console.log("Not found in Chapters.");
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
