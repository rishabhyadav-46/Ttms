const http = require('http');

// First, let's login to get a token
const loginData = JSON.stringify({
  email: "pstest@gmail.com",
  password: "password123"
});

const loginOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('Step 1: Logging in to get auth token...');

const loginReq = http.request(loginOptions, (res) => {
  let loginResponse = '';
  res.on('data', (chunk) => { loginResponse += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(loginResponse);
      if (parsed.token) {
        console.log('✅ Login successful! Token obtained.');
        testDashboard(parsed.token);
      } else {
        console.error('❌ No token in response:', parsed);
      }
    } catch (e) {
      console.error('❌ Login error:', loginResponse);
    }
  });
});

loginReq.on('error', (error) => {
  console.error('❌ Login request failed:', error.message);
});

loginReq.write(loginData);
loginReq.end();

function testDashboard(token) {
  console.log('\nStep 2: Testing dashboard report endpoint...');
  
  const dashOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/reports/dashboard',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const dashReq = http.request(dashOptions, (res) => {
    let dashResponse = '';
    res.on('data', (chunk) => { dashResponse += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(dashResponse);
        if (parsed.summary) {
          console.log('✅ Dashboard report endpoint working!');
          console.log('Summary:', JSON.stringify(parsed.summary, null, 2));
          console.log('\nBreakdown by vehicle type:', JSON.stringify(parsed.breakdown.byVehicleType, null, 2));
          console.log('\nBreakdown by inward type:', JSON.stringify(parsed.breakdown.byInwardType, null, 2));
        } else {
          console.error('❌ Unexpected response:', parsed);
        }
      } catch (e) {
        console.error('❌ Dashboard response error:', dashResponse);
      }
    });
  });

  dashReq.on('error', (error) => {
    console.error('❌ Dashboard request failed:', error.message);
  });

  dashReq.end();
}
