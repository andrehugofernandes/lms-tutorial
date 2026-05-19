const { PrismaClient } = require('../lib/generated/db');
const admin = require('firebase-admin');

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Firebase Admin (Emulator)
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project";
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: projectId,
    });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Helper to convert Prisma Date to Firestore Timestamp safely
const toTimestamp = (date) => {
    if (!date) return null;
    return admin.firestore.Timestamp.fromDate(new Date(date));
};

async function migrate() {
    console.log("🚀 Starting migration from Postgres to Firestore (Emulator)...");

    try {
        // 1. Categories
        console.log("📦 Migrating Categories...");
        const categories = await prisma.category.findMany();
        for (const cat of categories) {
            await db.collection('categories').doc(cat.id).set({
                name: cat.name,
                createdAt: toTimestamp(cat.createdAt),
                updatedAt: toTimestamp(cat.updatedAt),
            });
        }

        // 2. Courses
        console.log("📚 Migrating Courses...");
        const courses = await prisma.course.findMany({
            include: { category: true }
        });
        for (const course of courses) {
            await db.collection('courses').doc(course.id).set({
                userId: course.userId,
                title: course.title,
                description: course.description,
                imageUrl: course.imageUrl,
                price: course.price,
                isPublished: course.isPublished,
                categoryId: course.categoryId,
                categoryName: course.category?.name || null,
                createdAt: toTimestamp(course.createdAt),
                updatedAt: toTimestamp(course.updatedAt),
            });
        }

        // 3. Chapters
        console.log("📖 Migrating Chapters...");
        const chapters = await prisma.chapter.findMany();
        for (const chapter of chapters) {
            await db.collection('chapters').doc(chapter.id).set({
                title: chapter.title,
                description: chapter.description,
                videoUrl: chapter.videoUrl,
                position: chapter.position,
                isPublished: chapter.isPublished,
                isFree: chapter.isFree,
                courseId: chapter.courseId,
                createdAt: toTimestamp(chapter.createdAt),
                updatedAt: toTimestamp(chapter.updatedAt),
            });
        }

        // 4. MuxData
        console.log("🎥 Migrating MuxData...");
        const muxData = await prisma.muxData.findMany();
        for (const mux of muxData) {
            await db.collection('muxData').doc(mux.id).set({
                assetId: mux.assetId,
                playbackId: mux.playbackId,
                chapterId: mux.chapterId,
            });
        }

        // 5. UserProgress
        console.log("📈 Migrating UserProgress...");
        const userProgress = await prisma.userProgress.findMany();
        for (const up of userProgress) {
            await db.collection('userProgress').doc(up.id).set({
                userId: up.userId,
                chapterId: up.chapterId,
                isCompleted: up.isCompleted,
                createdAt: toTimestamp(up.createdAt),
                updatedAt: toTimestamp(up.updatedAt),
            });
        }

        // 6. Attachments
        console.log("📎 Migrating Attachments...");
        const attachments = await prisma.attachment.findMany();
        for (const att of attachments) {
            await db.collection('attachments').doc(att.id).set({
                name: att.name,
                url: att.url,
                courseId: att.courseId,
                createdAt: toTimestamp(att.createdAt),
                updatedAt: toTimestamp(att.updatedAt),
            });
        }

        // 7. Purchases
        console.log("💰 Migrating Purchases...");
        const purchases = await prisma.purchase.findMany();
        for (const purchase of purchases) {
            await db.collection('purchases').doc(purchase.id).set({
                userId: purchase.userId,
                courseId: purchase.courseId,
                createdAt: toTimestamp(purchase.createdAt),
                updatedAt: toTimestamp(purchase.updatedAt),
            });
        }

        // 8. Profiles
        console.log("👤 Migrating Profiles...");
        const profiles = await prisma.profile.findMany();
        for (const profile of profiles) {
            await db.collection('profiles').doc(profile.id).set({
                userId: profile.userId,
                name: profile.name,
                imageUrl: profile.imageUrl,
                email: profile.email,
                createdAt: toTimestamp(profile.createdAt),
                updatedAt: toTimestamp(profile.updatedAt),
            });
        }

        // 9. Users
        console.log("👥 Migrating Users...");
        const users = await prisma.user.findMany();
        for (const user of users) {
            await db.collection('users').doc(user.id).set({
                name: user.name,
                email: user.email,
                image: user.image,
                createdAt: toTimestamp(user.createdAt),
                updatedAt: toTimestamp(user.updatedAt),
            });
        }

        // 10. Quizzes
        console.log("🧩 Migrating Quizzes...");
        const quizzes = await prisma.quiz.findMany();
        for (const quiz of quizzes) {
            await db.collection('quizzes').doc(quiz.id).set({
                chapterId: quiz.chapterId,
                isPublished: quiz.isPublished,
                createdAt: toTimestamp(quiz.createdAt),
                updatedAt: toTimestamp(quiz.updatedAt),
            });
        }

        // 11. Questions
        console.log("❓ Migrating Questions...");
        const questions = await prisma.question.findMany();
        for (const q of questions) {
            await db.collection('questions').doc(q.id).set({
                quizId: q.quizId,
                prompt: q.prompt,
                position: q.position,
                createdAt: toTimestamp(q.createdAt),
                updatedAt: toTimestamp(q.updatedAt),
            });
        }

        // 12. Options
        console.log("🔘 Migrating Options...");
        const options = await prisma.option.findMany();
        for (const opt of options) {
            await db.collection('options').doc(opt.id).set({
                questionId: opt.questionId,
                text: opt.text,
                isCorrect: opt.isCorrect,
            });
        }

        // 13. Answers
        console.log("📝 Migrating Answers...");
        const answers = await prisma.answer.findMany();
        for (const ans of answers) {
            await db.collection('answers').doc(ans.id).set({
                userId: ans.userId,
                questionId: ans.questionId,
                optionId: ans.optionId,
                createdAt: toTimestamp(ans.createdAt),
            });
        }

        // 14. QuizResults
        console.log("📊 Migrating QuizResults...");
        const quizResults = await prisma.quizResult.findMany();
        for (const res of quizResults) {
            await db.collection('quizResults').doc(res.id).set({
                userId: res.userId,
                quizId: res.quizId,
                score: res.score,
                passed: res.passed,
                createdAt: toTimestamp(res.createdAt),
            });
        }

        // 15. UserXP
        console.log("⭐ Migrating UserXP...");
        const userXPs = await prisma.userXP.findMany();
        for (const xp of userXPs) {
            await db.collection('userXP').doc(xp.id).set({
                userId: xp.userId,
                amount: xp.amount,
                createdAt: toTimestamp(xp.createdAt),
                updatedAt: toTimestamp(xp.updatedAt),
            });
        }

        // 16. Achievements
        console.log("🏆 Migrating Achievements...");
        const achievements = await prisma.achievement.findMany();
        for (const ach of achievements) {
            await db.collection('achievements').doc(ach.id).set({
                userId: ach.userId,
                type: ach.type,
                createdAt: toTimestamp(ach.createdAt),
            });
        }

        // 17. UserNotes
        console.log("📝 Migrating UserNotes...");
        const notes = await prisma.userNote.findMany();
        for (const note of notes) {
            await db.collection('userNotes').doc(note.id).set({
                userId: note.userId,
                chapterId: note.chapterId,
                content: note.content,
                createdAt: toTimestamp(note.createdAt),
                updatedAt: toTimestamp(note.updatedAt),
            });
        }

        // 18. UserStreaks
        console.log("🔥 Migrating UserStreaks...");
        const streaks = await prisma.userStreak.findMany();
        for (const streak of streaks) {
            await db.collection('userStreaks').doc(streak.id).set({
                userId: streak.userId,
                count: streak.count,
                lastActivity: toTimestamp(streak.lastActivity),
            });
        }

        // 19. Auth related (Accounts/Sessions)
        console.log("🔐 Migrating Auth Data...");
        const accounts = await prisma.account.findMany();
        for (const acc of accounts) {
            await db.collection('accounts').doc(acc.id).set({ ...acc });
        }
        const sessions = await prisma.session.findMany();
        for (const sess of sessions) {
            await db.collection('sessions').doc(sess.id).set({ ...sess });
        }
        const verificationTokens = await prisma.verificationToken.findMany();
        for (const token of verificationTokens) {
            // Verification tokens usually don't have a unique 'id' in Prisma nextauth schema
            // but we can use identifier+token as key
            await db.collection('verificationTokens').add({ ...token });
        }

        console.log("✅ Migration completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
