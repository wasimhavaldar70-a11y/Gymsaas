const http = require('http');

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let resp = '';
      res.on('data', chunk => resp += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resp) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: resp });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Testing Super Admin (Wasim Havaldar) Login ---');
  const r1 = await postJson('http://localhost:4000/api/v1/auth/login', {
    identifier: 'wasimhavaldar70@gmail.com',
    password: 'wasimhavaldar70'
  });
  console.log('Status:', r1.status);
  console.log('Role:', r1.body?.data?.role);
  console.log('Redirect:', r1.body?.data?.redirect_to);

  console.log('\n--- 2. Testing Gym Owner Login (owner@fitnex.in) ---');
  const r2 = await postJson('http://localhost:4000/api/v1/auth/login', {
    identifier: 'owner@fitnex.in',
    password: 'fitnex2026'
  });
  console.log('Status:', r2.status);
  console.log('Role:', r2.body?.data?.role);
  console.log('Redirect:', r2.body?.data?.redirect_to);

  console.log('\n--- 3. Testing Generic Gym Login (Unifies to Gym Owner) ---');
  const r3 = await postJson('http://localhost:4000/api/v1/auth/login', {
    identifier: 'reception@fitnex.in',
    password: 'fitnex2026'
  });
  console.log('Status:', r3.status);
  console.log('Role:', r3.body?.data?.role);
  console.log('Redirect:', r3.body?.data?.redirect_to);
}

run().catch(console.error);
