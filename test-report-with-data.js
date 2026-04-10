const http = require('http');

// Login with the user that has gate entries
const loginData = JSON.stringify({
  email: "test@gmail.com",
  password: "123456"
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

console.log('Logging in with user that has entries: test@gmail.com...');

const loginReq = http.request(loginOptions, (res) => {
  let loginResponse = '';
  res.on('data', (chunk) => { loginResponse += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(loginResponse);
      if (parsed.token) {
        console.log('✅ Login successful!\n');
        testDashboard(parsed.token);
      } else {
        console.error('❌ Login failed:', parsed.error);
      }
    } catch (e) {
      console.error('❌ Error:', loginResponse.substring(0, 100));
    }
  });
});

loginReq.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

loginReq.write(loginData);
loginReq.end();

function testDashboard(token) {
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
          console.log('✅ DASHBOARD REPORT ENDPOINT IS NOW WORKING!\n');
          console.log('📊 Summary:');
          console.log(`   Total Entries: ${parsed.summary.totalEntries}`);
          console.log(`   Pending Entries: ${parsed.summary.pendingEntries}`);
          console.log(`   Completed Entries: ${parsed.summary.completedEntries}`);
          console.log(`   Avg Turnaround Time: ${parsed.summary.avgTurnaroundTime} hours\n`);
          
          console.log('🚗 Breakdown by Vehicle Type:');
          parsed.breakdown.byVehicleType.forEach(item => {
            console.log(`   ${item.vehicleType}: ${item._count} entries`);
          });

          console.log('\n📦 Breakdown by Inward Type:');
          parsed.breakdown.byInwardType.forEach(item => {
            console.log(`   ${item.inwardType}: ${item._count} entries`);
          });

          console.log(`\n📋 Recent Entries: ${parsed.recentEntries.length} entries shown`);
        } else {
          console.error('❌ Error:', parsed.error || parsed);
        }
      } catch (e) {
        console.error('❌ Parse error:', e.message);
      }
    });
  });

  dashReq.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  dashReq.end();
}
