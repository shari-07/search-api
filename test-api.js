#!/usr/bin/env node

/**
 * API Testing Script for Product Search API
 * Usage: node test-api.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test data
const testCases = [
  {
    name: 'Taobao Product Details',
    method: 'GET',
    url: '/product/details',
    params: { platform: 'taobao', id: '123456789', lang: 'en' }
  },
  {
    name: '1688 Product Details',
    method: 'GET',
    url: '/product/details',
    params: { platform: '1688', id: '123456789', lang: 'en' }
  },
  {
    name: 'Weidian Product Details',
    method: 'GET',
    url: '/product/details',
    params: { platform: 'micro', id: '123456789', lang: 'en' }
  },
  {
    name: 'Link Conversion',
    method: 'POST',
    url: '/product/link',
    data: { link: 'https://item.taobao.com/item.htm?id=123456789' }
  },
  {
    name: 'Image Proxy',
    method: 'GET',
    url: '/image/image-proxy',
    params: { url: 'https://via.placeholder.com/300x200.jpg' }
  }
];

async function testEndpoint(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('─'.repeat(50));
  
  try {
    const config = {
      method: testCase.method,
      url: `${BASE_URL}${testCase.url}`,
      timeout: 10000
    };

    if (testCase.params) {
      config.params = testCase.params;
    }
    
    if (testCase.data) {
      config.data = testCase.data;
      config.headers = { 'Content-Type': 'application/json' };
    }

    const response = await axios(config);
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response Size: ${JSON.stringify(response.data).length} characters`);
    
    if (testCase.name === 'Image Proxy') {
      console.log(`🖼️  Content-Type: ${response.headers['content-type']}`);
      console.log(`📏 Content-Length: ${response.headers['content-length']} bytes`);
    } else {
      console.log(`📄 Response Preview:`);
      const preview = JSON.stringify(response.data, null, 2).substring(0, 200);
      console.log(preview + (JSON.stringify(response.data).length > 200 ? '...' : ''));
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    if (error.response) {
      console.log(`📊 Status: ${error.response.status}`);
      console.log(`📄 Error Response:`, error.response.data);
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Tests');
  console.log('='.repeat(50));
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/product/details?platform=taobao&id=test`);
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('💡 Make sure to start your server with: bun run dev');
    process.exit(1);
  }
  
  // Run all tests
  for (const testCase of testCases) {
    await testEndpoint(testCase);
  }
  
  console.log('\n🏁 All tests completed');
  console.log('='.repeat(50));
}

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});

/*
curl "http://localhost:3000/product/details?platform=taobao&id=976965730448"
curl "http://localhost:3000/product/details?platform=micro&id=7272754802"
curl "http://localhost:3000/product/details?platform=1688&id=977208207464"
*/