// Debug script to check localStorage contents
console.log('🔍 Debugging localStorage contents...')

try {
  const storedJobs = JSON.parse(localStorage.getItem('persistentTransfers') || '[]')
  console.log(`📊 Total jobs in localStorage: ${storedJobs.length}`)
  
  if (storedJobs.length > 0) {
    console.log('📋 Stored transfers:')
    storedJobs.forEach((job, index) => {
      console.log(`  ${index + 1}. ID: ${job.id}`)
      console.log(`     User: ${job.userId}`)
      console.log(`     Status: ${job.status}`)
      console.log(`     Progress: ${job.progress}%`)
      console.log(`     Files: ${job.sourceFiles?.length || 0}`)
      console.log(`     Start Time: ${new Date(job.startTime).toLocaleString()}`)
      console.log('     ---')
    })
  } else {
    console.log('❌ No transfers found in localStorage')
  }
  
  // Check for any other localStorage keys
  console.log('🔑 All localStorage keys:')
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    console.log(`  - ${key}`)
  }
  
} catch (error) {
  console.error('❌ Error reading localStorage:', error)
}

// Function to manually add a test transfer
window.addTestTransfer = function() {
  const testJob = {
    id: 'test-transfer-' + Date.now(),
    userId: 'test-user-123',
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
  
  try {
    const existingJobs = JSON.parse(localStorage.getItem('persistentTransfers') || '[]')
    existingJobs.push(testJob)
    localStorage.setItem('persistentTransfers', JSON.stringify(existingJobs))
    console.log('✅ Added test transfer:', testJob.id)
  } catch (error) {
    console.error('❌ Error adding test transfer:', error)
  }
}

// Function to clear all transfers
window.clearAllTransfers = function() {
  try {
    localStorage.removeItem('persistentTransfers')
    console.log('✅ Cleared all transfers from localStorage')
  } catch (error) {
    console.error('❌ Error clearing transfers:', error)
  }
}

console.log('💡 Available functions:')
console.log('  - addTestTransfer() - Add a test transfer')
console.log('  - clearAllTransfers() - Clear all transfers')
