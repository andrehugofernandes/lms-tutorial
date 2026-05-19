
import { db } from "../lib/db";
import { adminDb } from "../lib/firebase-admin";
import * as admin from 'firebase-admin';

async function migrate() {
  if (!adminDb) {
    console.error("Firebase Admin DB not initialized. Check your environment variables.");
    return;
  }

  console.log("Starting migration from Postgres to Firestore...");

  try {
    // 1. Categories
    console.log("Migrating Categories...");
    const categories = await db.category.findMany();
    for (const category of categories) {
      await adminDb.collection("categories").doc(category.id).set({
        name: category.name,
      });
    }

    // 2. Courses
    console.log("Migrating Courses...");
    const courses = await db.course.findMany({
      include: {
        category: true,
      }
    });
    for (const course of courses) {
      await adminDb.collection("courses").doc(course.id).set({
        userId: course.userId,
        title: course.title,
        description: course.description,
        imageUrl: course.imageUrl,
        isPublished: course.isPublished,
        categoryId: course.categoryId,
        categoryName: course.category?.name || null, // Denormalization
        price: course.price,
        createdAt: admin.firestore.Timestamp.fromDate(course.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(course.updatedAt),
      });
    }

    // 3. Attachments
    console.log("Migrating Attachments...");
    const attachments = await db.attachment.findMany();
    for (const attachment of attachments) {
      await adminDb.collection("attachments").doc(attachment.id).set({
        name: attachment.name,
        url: attachment.url,
        courseId: attachment.courseId,
        createdAt: admin.firestore.Timestamp.fromDate(attachment.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(attachment.updatedAt),
      });
    }

    // 4. Chapters
    console.log("Migrating Chapters...");
    const chapters = await db.chapter.findMany();
    for (const chapter of chapters) {
      await adminDb.collection("chapters").doc(chapter.id).set({
        title: chapter.title,
        description: chapter.description,
        videoSourceType: chapter.videoSourceType,
        videoUrl: chapter.videoUrl,
        externalUrl: chapter.externalUrl,
        embedUrl: chapter.embedUrl,
        videoProvider: chapter.videoProvider,
        position: chapter.position,
        isPublished: chapter.isPublished,
        isFree: chapter.isFree,
        courseId: chapter.courseId,
        transcript: chapter.transcript,
        transcriptStatus: chapter.transcriptStatus,
        duration: chapter.duration,
        createdAt: admin.firestore.Timestamp.fromDate(chapter.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(chapter.updatedAt),
      });
    }

    // 5. MuxData
    console.log("Migrating MuxData...");
    const muxData = await db.muxData.findMany();
    for (const data of muxData) {
      await adminDb.collection("muxData").doc(data.id).set({
        assetId: data.assetId,
        playbackId: data.playbackId,
        chapterId: data.chapterId,
      });
    }

    // 6. UserProgress
    console.log("Migrating UserProgress...");
    const userProgress = await db.userProgress.findMany();
    for (const progress of userProgress) {
      await adminDb.collection("userProgress").doc(progress.id).set({
        userId: progress.userId,
        chapterId: progress.chapterId,
        isCompleted: progress.isCompleted,
        createdAt: admin.firestore.Timestamp.fromDate(progress.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(progress.updatedAt),
      });
    }

    // 7. Quizzes
    console.log("Migrating Quizzes...");
    const quizzes = await db.quiz.findMany();
    for (const quiz of quizzes) {
      await adminDb.collection("quizzes").doc(quiz.id).set({
        chapterId: quiz.chapterId,
        isPublished: quiz.isPublished,
        isRequired: quiz.isRequired,
        maxQuestions: quiz.maxQuestions,
        passingScore: quiz.passingScore,
        timeLimit: quiz.timeLimit,
        createdAt: admin.firestore.Timestamp.fromDate(quiz.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(quiz.updatedAt),
      });
    }

    // 8. Questions
    console.log("Migrating Questions...");
    const questions = await db.question.findMany();
    for (const question of questions) {
      await adminDb.collection("questions").doc(question.id).set({
        quizId: question.quizId,
        prompt: question.prompt,
        position: question.position,
        bonusPoints: question.bonusPoints,
        isBonus: question.isBonus,
        pointWeight: question.pointWeight,
        createdAt: admin.firestore.Timestamp.fromDate(question.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(question.updatedAt),
      });
    }

    // 9. Options
    console.log("Migrating Options...");
    const options = await db.option.findMany();
    for (const option of options) {
      await adminDb.collection("options").doc(option.id).set({
        questionId: option.questionId,
        text: option.text,
        isCorrect: option.isCorrect,
        createdAt: admin.firestore.Timestamp.fromDate(option.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(option.updatedAt),
      });
    }

    // 10. Answers
    console.log("Migrating Answers...");
    const answers = await db.answer.findMany();
    for (const answer of answers) {
      await adminDb.collection("answers").doc(answer.id).set({
        userId: answer.userId,
        questionId: answer.questionId,
        optionId: answer.optionId,
        createdAt: admin.firestore.Timestamp.fromDate(answer.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(answer.updatedAt),
      });
    }

    // 11. QuizResults
    console.log("Migrating QuizResults...");
    const results = await db.quizResult.findMany();
    for (const result of results) {
      await adminDb.collection("quizResults").doc(result.id).set({
        userId: result.userId,
        quizId: result.quizId,
        score: result.score,
        xpEarned: result.xpEarned,
        passed: result.passed,
        completedAt: admin.firestore.Timestamp.fromDate(result.completedAt),
      });
    }

    // 12. UserXP
    console.log("Migrating UserXP...");
    const userXPs = await db.userXP.findMany();
    for (const xp of userXPs) {
      await adminDb.collection("userXP").doc(xp.id).set({
        userId: xp.userId,
        totalXp: xp.totalXp,
        level: xp.level,
        updatedAt: admin.firestore.Timestamp.fromDate(xp.updatedAt),
      });
    }

    // 13. Users & Profiles
    console.log("Migrating Users...");
    const users = await db.user.findMany({
      include: {
        profile: true,
      }
    });
    for (const user of users) {
      await adminDb.collection("users").doc(user.id).set({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified ? admin.firestore.Timestamp.fromDate(user.emailVerified) : null,
        image: user.image,
        password: user.password,
      });

      if (user.profile) {
        await adminDb.collection("profiles").doc(user.profile.id).set({
          userId: user.profile.userId,
          name: user.profile.name,
          email: user.profile.email,
          role: user.profile.role,
          createdAt: admin.firestore.Timestamp.fromDate(user.profile.createdAt),
          updatedAt: admin.firestore.Timestamp.fromDate(user.profile.updatedAt),
        });
      }
    }

    // 14. Purchases
    console.log("Migrating Purchases...");
    const purchases = await db.purchase.findMany();
    for (const purchase of purchases) {
      await adminDb.collection("purchases").doc(purchase.id).set({
        userId: purchase.userId,
        courseId: purchase.courseId,
        lastChapterId: purchase.lastChapterId,
        createdAt: admin.firestore.Timestamp.fromDate(purchase.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(purchase.updatedAt),
      });
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await db.$disconnect();
  }
}

migrate();
