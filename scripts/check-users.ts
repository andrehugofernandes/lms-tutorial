
import { adminDb } from '../frontend/lib/firebase-admin';

async function checkUsers() {
  console.log('--- USERS ---');
  const users = await adminDb.collection('users').get();
  users.forEach(d => console.log(d.id, d.data().email));
  
  console.log('--- PROFILES ---');
  const profiles = await adminDb.collection('profiles').get();
  profiles.forEach(d => console.log(d.id, d.data().email, d.data().role));
}

checkUsers().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
