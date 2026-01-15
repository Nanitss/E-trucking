// Script to clear existing driver document records from database
const { db } = require('./client/server/config/firebase');

async function clearDriverDocuments() {
  console.log('🧹 Clearing existing driver document records...');
  
  try {
    // Get all drivers
    const driversSnapshot = await db.collection('drivers').get();
    console.log(`📋 Found ${driversSnapshot.size} drivers`);
    
    let clearedCount = 0;
    
    for (const driverDoc of driversSnapshot.docs) {
      const driverData = driverDoc.data();
      const driverId = driverDoc.id;
      
      console.log(`\n🔍 Checking driver: ${driverData.DriverName || driverData.name || driverId}`);
      
      if (driverData.documents && Object.keys(driverData.documents).length > 0) {
        console.log(`   📄 Found documents: ${Object.keys(driverData.documents).join(', ')}`);
        
        // Clear the documents field
        await db.collection('drivers').doc(driverId).update({
          documents: {}
        });
        
        console.log(`   ✅ Cleared documents for ${driverData.DriverName || driverData.name || driverId}`);
        clearedCount++;
      } else {
        console.log(`   ℹ️ No documents found for ${driverData.DriverName || driverData.name || driverId}`);
      }
    }
    
    console.log(`\n🎉 Cleared documents for ${clearedCount} drivers`);
    console.log('\n📋 Next steps:');
    console.log('1. Go to your driver management page');
    console.log('2. Re-upload documents for each driver');
    console.log('3. Each driver will now get unique document filenames');
    console.log('4. No more cross-contamination between drivers!');
    
  } catch (error) {
    console.error('❌ Error clearing driver documents:', error);
  }
}

// Run the script
clearDriverDocuments().then(() => {
  console.log('✅ Driver document clearing completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
