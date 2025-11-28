const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'posting-organizer-crm-new',
});

async function fixWhatsAppSession() {
  try {
    console.log('🛠️ Fixing Daily WhatsApp Session...');
    
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's session
    const sessionQuery = await db.collection('dailyWhatsAppSessions')
      .where('date', '==', today)
      .limit(1)
      .get();
    
    if (sessionQuery.empty) {
      console.log('No WhatsApp session found for today, nothing to fix.');
      return;
    }
    
    const sessionDoc = sessionQuery.docs[0];
    const session = sessionDoc.data();
    
    console.log('📊 Current session:', {
      selectedCount: session.selectedCallCenterIds?.length || 0,
      sentTodayCount: session.sentTodayIds?.length || 0,
      selectedIds: session.selectedCallCenterIds?.slice(0, 3) || [],
      sentTodayIds: session.sentTodayIds?.slice(0, 3) || []
    });
    
    // Check if any of the IDs exist in the database
    const allIds = [...(session.selectedCallCenterIds || []), ...(session.sentTodayIds || [])];
    const validIds = [];
    const invalidIds = [];
    
    for (const id of allIds) {
      const doc = await db.collection('callcenters').doc(id).get();
      if (doc.exists && doc.data()) {
        validIds.push(id);
      } else {
        invalidIds.push(id);
        console.log('❌ Invalid ID found:', id);
      }
    }
    
    console.log('📊 Validation results:', {
      validIds: validIds.length,
      invalidIds: invalidIds.length,
      validIds: validIds.slice(0, 5),
      invalidIds: invalidIds.slice(0, 5)
    });
    
    // Clear the session to force regeneration
    await sessionDoc.ref.update({
      selectedCallCenterIds: [],
      sentTodayIds: [],
      sessionScoreData: {},
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Cleared invalid session data. WhatsApp service will regenerate on next request.');
    
  } catch (error) {
    console.error('❌ Error fixing session:', error);
  } finally {
    process.exit(0);
  }
}

fixWhatsAppSession();