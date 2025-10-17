// Test script for persistent transfer APIs
const testUserId = 'test-user-123'

async function testSimpleAPI() {
  console.log('🧪 Testing Simple Transfer API...')
  
  try {
    // Test POST (queue transfer)
    const queueResponse = await fetch('http://localhost:3000/api/transfers/simple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        sourceService: 'google-drive',
        destinationService: 'onedrive',
        sourceFiles: [{ name: 'test.txt', size: '1MB' }],
        destinationPath: 'root',
        priority: 1
      })
    })
    
    if (queueResponse.ok) {
      const queueResult = await queueResponse.json()
      console.log('✅ Simple queue API working:', queueResult)
    } else {
      console.error('❌ Simple queue API failed:', queueResponse.status)
    }
    
    // Test GET (fetch status)
    const statusResponse = await fetch(`http://localhost:3000/api/transfers/simple?userId=${testUserId}`)
    
    if (statusResponse.ok) {
      const statusResult = await statusResponse.json()
      console.log('✅ Simple status API working:', statusResult)
    } else {
      console.error('❌ Simple status API failed:', statusResponse.status)
    }
    
  } catch (error) {
    console.error('❌ Simple API test failed:', error)
  }
}

async function testMainAPI() {
  console.log('🧪 Testing Main Transfer API...')
  
  try {
    // Test POST (queue transfer)
    const queueResponse = await fetch('http://localhost:3000/api/transfers/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        sourceService: 'google-drive',
        destinationService: 'onedrive',
        sourceFiles: [{ name: 'test.txt', size: '1MB' }],
        destinationPath: 'root',
        priority: 1
      })
    })
    
    if (queueResponse.ok) {
      const queueResult = await queueResponse.json()
      console.log('✅ Main queue API working:', queueResult)
    } else {
      console.error('❌ Main queue API failed:', queueResponse.status)
    }
    
    // Test GET (fetch status)
    const statusResponse = await fetch(`http://localhost:3000/api/transfers/status?userId=${testUserId}`)
    
    if (statusResponse.ok) {
      const statusResult = await statusResponse.json()
      console.log('✅ Main status API working:', statusResult)
    } else {
      console.error('❌ Main status API failed:', statusResponse.status)
    }
    
  } catch (error) {
    console.error('❌ Main API test failed:', error)
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Persistent Transfer API Tests...\n')
  
  await testSimpleAPI()
  console.log('')
  await testMainAPI()
  
  console.log('\n✅ All tests completed!')
}

runTests().catch(console.error)