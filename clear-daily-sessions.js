const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'posting-organizer-crm-new',
});

async function clearDailySessions() {
  try {
    console.log('🗑️ Clearing Daily Call Sessions...');
    const callSessions = await admin.firestore().collection('dailyCallSessions').get();
    for (const doc of callSessions.docs) {
      await doc.ref.delete();
      console.log('Deleted call session:', doc.id);
    }

    console.log('🗑️ Clearing Daily WhatsApp Sessions...');
    const whatsappSessions = await admin.firestore().collection('dailyWhatsAppSessions').get();
    for (const doc of whatsappSessions.docs) {
      await doc.ref.delete();
      console.log('Deleted WhatsApp session:', doc.id);
    }

    console.log('✅ All daily sessions cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing sessions:', error);
  } finally {
    process.exit(0);
  }
}

clearDailySessions();