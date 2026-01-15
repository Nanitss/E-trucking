require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables (same as server)
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  process.exit(1);
}

const db = admin.firestore();

async function checkDeliveries() {
  try {
    console.log('🔍 Checking delivery records for user login ID...');
    
    const userLoginId = 'j412kdTjjvMNXWdLTHAc';
    
    // Check for deliveries with the user's login ID
    const deliveriesSnapshot = await db.collection('deliveries')
      .where('clientId', '==', userLoginId)
      .get();
    
    console.log(`\n📦 Found ${deliveriesSnapshot.size} deliveries with clientId: ${userLoginId}`);
    
    if (!deliveriesSnapshot.empty) {
      deliveriesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\n✅ Delivery ${doc.id}:`);
        console.log(`   clientId: ${data.clientId}`);
        console.log(`   clientName: ${data.clientName}`);
        console.log(`   deliveryRate: ${data.deliveryRate}`);
        console.log(`   deliveryStatus: ${data.deliveryStatus}`);
        console.log(`   truckPlate: ${data.truckPlate}`);
        
        // Check delivery date format
        if (data.deliveryDate) {
          if (data.deliveryDate.seconds) {
            const date = new Date(data.deliveryDate.seconds * 1000);
            console.log(`   deliveryDate: ${date.toISOString()}`);
          } else {
            console.log(`   deliveryDate: ${data.deliveryDate}`);
          }
        }
      });
    } else {
      console.log('❌ No deliveries found with the user login ID');
      
      // Check what deliveries exist
      console.log('\n🔍 Checking all deliveries in database...');
      const allDeliveries = await db.collection('deliveries').get();
      console.log(`Found ${allDeliveries.size} total deliveries:`);
      
      allDeliveries.forEach(doc => {
        const data = doc.data();
        console.log(`- Delivery ${doc.id}: clientId = ${data.clientId}, rate = ${data.deliveryRate}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking deliveries:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkDeliveries(); 