const axios = require('axios');

async function testPaymentEndpoint() {
  try {
    console.log('🔍 Testing payment endpoint...');
    
    // Test the payment endpoint
    const response = await axios.get('http://localhost:5000/api/payments/client/j412kdTjjvMNXWdLTHAc', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_token' // Will need proper auth in real usage
      }
    });
    
    console.log('✅ Payment endpoint response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data?.data?.payments) {
      console.log('\n📋 Payment Details:');
      console.log('Payments found:', response.data.data.payments.length);
      console.log('Total Amount Due: ₱' + (response.data.data.totalAmountDue || 0));
      console.log('Pending Payments:', response.data.data.pendingPayments || 0);
      
      if (response.data.data.payments.length > 0) {
        console.log('\n💰 First Payment:');
        const payment = response.data.data.payments[0];
        console.log('ID:', payment.id);
        console.log('Amount: ₱' + payment.amount);
        console.log('Status:', payment.status);
        console.log('Due Date:', payment.dueDate);
        console.log('Delivery ID:', payment.deliveryId);
        console.log('Pickup:', payment.metadata?.pickupLocation);
        console.log('Dropoff:', payment.metadata?.deliveryAddress);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing payment endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testPaymentEndpoint(); 