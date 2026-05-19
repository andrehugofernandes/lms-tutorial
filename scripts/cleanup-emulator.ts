
import { adminDb } from '../frontend/lib/firebase-admin';

async function cleanup() {
  const collections = ['users', 'profiles', 'accounts', 'sessions'];
  const targets = ['teste_prof@teste.com', 'aluno1@lms.com', 'aluno2@lms.com', 'professor@diego.com'];
  
  console.log("Starting cleanup of duplicate/new users in emulator...");

  for (const col of collections) {
    const s = await adminDb.collection(col).get();
    console.log(`Checking collection ${col} (${s.size} docs)`);
    
    for (const d of s.docs) {
      const data = d.data();
      const email = data.email || data.userEmail;
      
      // For some collections, the email might be in the profile or user link
      // But we populated users and profiles with email field.
      
      if (email && targets.includes(email)) {
        if (col === 'users' || col === 'profiles') {
          if (!d.id.startsWith('cm')) {
            console.log(`Deleting from ${col}: ${d.id} (${email})`);
            await d.ref.delete();
          } else {
            console.log(`Keeping migrated ${col}: ${d.id} (${email})`);
          }
        } else {
            console.log(`Wiping related session/account: ${col}: ${d.id}`);
            await d.ref.delete();
        }
      } else if (col === 'accounts' || col === 'sessions') {
          // If no email, but it's a new session, we might want to wipe it too to be safe
          console.log(`Wiping session/account: ${col}: ${d.id}`);
          await d.ref.delete();
      }
    }
  }
  console.log("Cleanup finished.");
}

cleanup().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
