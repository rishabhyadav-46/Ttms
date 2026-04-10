const http = require('http');

const data = JSON.stringify({
  fullName: "PowerShell Test",
  companyName: "Test Co",
  email: "pstest@gmail.com",
  password: "password123",
  confirmPassword: "password123"
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    console.log('RESPONSE:', responseData);
  });
});

req.on('error', (error) => {
  console.error('ERROR:', error.message);
});

console.log('Sending signup request to localhost:3001...');
req.write(data);
req.end();
