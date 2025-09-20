#!/usr/bin/env node

/**
 * Test Billing Portal
 * 
 * This script helps debug the billing portal issue.
 */

async function testBillingPortal() {
  console.log('🧪 Testing Billing Portal...\n');

  try {
    // Test the API endpoint directly
    console.log('1. Testing billing portal API endpoint...');
    const response = await fetch('http://localhost:3000/api/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_token'
      }
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);

    if (response.status === 401) {
      console.log('   ✅ API endpoint exists (401 expected for invalid token)');
    } else if (response.status === 500) {
      console.log('   ❌ API endpoint has server error');
    } else {
      console.log(`   Status: ${response.status}`);
    }

    console.log('\n2. Check browser console for errors:');
    console.log('   - Open browser developer tools (F12)');
    console.log('   - Go to Console tab');
    console.log('   - Click "Manage billing" button');
    console.log('   - Look for error messages');

    console.log('\n3. Common issues:');
    console.log('   - Stripe portal configuration not set up');
    console.log('   - Environment variables missing in Vercel');
    console.log('   - Firebase auth token not working');
    console.log('   - API endpoint not deployed');

    console.log('\n4. Debugging steps:');
    console.log('   - Check browser console for errors');
    console.log('   - Check network tab for failed requests');
    console.log('   - Verify Stripe portal configuration');
    console.log('   - Check Vercel environment variables');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBillingPortal();
