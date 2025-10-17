// Test script to verify database storage is actually working
const { initializeApp } = require('firebase/app')
const { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } = require('firebase/firestore')

// Initialize Firebase (you'll need to add your config)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function testDatabaseStorage() {
  console.log('🧪 Testing Database Storage...')
  
  try {
    // Test 1: Try to store a transfer job
    const testJob = {
      id: 'test-transfer-123',
      userId: 'test-user-456',
      sourceService: 'google-drive',
      destinationService: 'onedrive',
      sourceFiles: [{ name: 'test.txt', size: '1MB' }],
      destinationPath: 'root',
      status: 'pending',
      progress: 0,
      startTime: Date.now(),
      currentFileIndex: 0,
      totalFiles: 1,
      transferredBytes: 0,
      totalBytes: 1048576
    }
    
    console.log('📝 Attempting to store transfer job...')
    await setDoc(doc(db, 'activeTransfers', testJob.id), {
      ...testJob,
      createdAt: new Date()
    })
    
    console.log('✅ Successfully stored transfer job!')
    
    // Test 2: Try to retrieve it
    console.log('📖 Attempting to retrieve transfer job...')
    const jobDoc = await getDoc(doc(db, 'activeTransfers', testJob.id))
    
    if (jobDoc.exists()) {
      console.log('✅ Successfully retrieved transfer job:', jobDoc.data())
    } else {
      console.log('❌ Transfer job not found!')
    }
    
    // Test 3: Try to query user's transfers
    console.log('🔍 Attempting to query user transfers...')
    const userTransfersQuery = query(
      collection(db, 'users', testJob.userId, 'activeTransfers'),
      where('status', 'in', ['pending', 'transferring', 'paused'])
    )
    
    const snapshot = await getDocs(userTransfersQuery)
    console.log(`✅ Found ${snapshot.docs.length} user transfers`)
    
    snapshot.docs.forEach(doc => {
      console.log('  - Transfer:', doc.id, doc.data().status)
    })
    
  } catch (error) {
    console.error('❌ Database storage test failed:', error)
    console.error('Error details:', error.message)
  }
}

// Run the test
testDatabaseStorage().catch(console.error)
