const http = require('http');

function getPage(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, length: data.length, headers: res.headers, bodySnippet: data.substring(0, 300) });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const urls = [
    'http://localhost:3000/login',
    'http://localhost:3000/dashboard',
    'http://localhost:3000/reception',
    'http://localhost:3000/billing',
    'http://localhost:3000/whatsapp',
    'http://localhost:3000/reports',
    'http://localhost:3000/workouts',
    'http://localhost:3000/superadmin/dashboard',
    'http://localhost:3000/reception/dashboard',
    'http://localhost:3000/trainer/dashboard',
    'http://localhost:3000/accountant/dashboard',
    'http://localhost:3000/manager/dashboard',
    'http://localhost:3000/staff/dashboard'
  ];

  console.log('Testing Web Endpoints:');
  for (const url of urls) {
    const res = await getPage(url);
    console.log(`- ${url} => Status ${res.status} (${res.length} bytes)`);
  }
}

run().catch(console.error);
