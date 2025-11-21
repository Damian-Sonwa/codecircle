import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const API_BASE_URL = process.env.API_URL || process.env.SERVER_URL || 'http://localhost:5000';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let authToken = null;
let testUser = null;

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const testEndpoint = async (name, method, url, data = null, headers = {}) => {
  try {
    log(`\n🧪 Testing: ${name}`, 'cyan');
    log(`   ${method.toUpperCase()} ${url}`, 'blue');
    
    const config = {
      method,
      url: `${API_BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    log(`   ✅ Success: ${response.status}`, 'green');
    if (response.data) {
      console.log('   Response:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
    }
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    const status = error.response?.status || 'N/A';
    const message = error.response?.data?.error || error.message;
    
    if (error.code === 'ECONNREFUSED' || error.message.includes('connect')) {
      log(`   ❌ Failed: Server not running or not accessible`, 'red');
      log(`   💡 Make sure the server is running on ${API_BASE_URL}`, 'yellow');
    } else {
      log(`   ❌ Failed: ${status} - ${message}`, 'red');
    }
    return { success: false, error: message, status };
  }
};

const runTests = async () => {
  log('\n🚀 Starting API Tests...', 'yellow');
  log(`📍 API Base URL: ${API_BASE_URL}`, 'blue');
  log(`💡 Make sure your server is running! (npm run dev or npm start)\n`, 'yellow');
  
  // Test 1: Health check / Get users (public endpoint)
  await testEndpoint('Get Users (Public)', 'GET', '/api/users');
  
  // Test 2: Register a new user
  const testUsername = `testuser_${Date.now()}`;
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  // Try signup endpoint first
  let registerResult = await testEndpoint(
    'Signup User',
    'POST',
    '/api/auth/signup',
    {
      username: testUsername,
      email: testEmail,
      password: testPassword
    }
  );
  
  // If signup fails, try register endpoint
  if (!registerResult.success) {
    registerResult = await testEndpoint(
      'Register User (Legacy)',
      'POST',
      '/api/register',
      {
        username: testUsername,
        email: testEmail,
        password: testPassword
      }
    );
  }
  
  if (registerResult.success && registerResult.data?.token) {
    authToken = registerResult.data.token;
    testUser = registerResult.data;
    log(`\n✅ Registered user: ${testUsername}`, 'green');
    log(`   Token: ${authToken.substring(0, 50)}...`, 'blue');
  }
  
  // Test 3: Login
  if (!authToken) {
    log('\n⚠️  Registration failed, trying login with test credentials...', 'yellow');
    const loginResult = await testEndpoint(
      'Login',
      'POST',
      '/api/auth/login',
      {
        identifier: testUsername || 'Damian25',
        password: testPassword || 'password'
      }
    );
    
    if (loginResult.success && loginResult.data?.token) {
      authToken = loginResult.data.token;
      testUser = loginResult.data;
      log(`\n✅ Logged in successfully`, 'green');
    }
  }
  
  // Test 4: Get friends (requires auth)
  if (authToken) {
    await testEndpoint(
      'Get Friends',
      'GET',
      '/api/friends',
      null,
      { Authorization: `Bearer ${authToken}` }
    );
    
    // Test 5: Get tech groups
    await testEndpoint('Get Tech Groups', 'GET', '/api/tech-groups');
    
    // Test 6: Complete onboarding (requires auth)
    await testEndpoint(
      'Complete Onboarding',
      'POST',
      '/api/onboarding/complete',
      {},
      { Authorization: `Bearer ${authToken}` }
    );
  } else {
    log('\n⚠️  Skipping authenticated endpoints - no token available', 'yellow');
  }
  
  log('\n✨ API Tests Complete!', 'green');
  log('\n📝 Summary:', 'cyan');
  log('   - Use the token above to test authenticated endpoints', 'blue');
  log('   - You can also test endpoints manually using:', 'blue');
  log('     • curl', 'blue');
  log('     • Postman', 'blue');
  log('     • Thunder Client (VS Code extension)', 'blue');
  log(`   - API Base URL: ${API_BASE_URL}`, 'blue');
};

runTests().catch(console.error);

