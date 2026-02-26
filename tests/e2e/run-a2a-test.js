/**
 * A2A API 集成测试（纯 Node.js HTTP）
 *
 * 测试 Claude 和 Codex 的互相艾特
 *
 * 运行方式：
 *   node tests/e2e/run-a2a-test.js
 */

const http = require('http');

const BASE_URL = process.env.CAT_CAFE_URL || 'http://localhost:3200';
const TIMEOUT = 120000;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🚀 启动 A2A API 集成测试...');
  console.log(`📍 目标 URL: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  // 测试 1: Bootstrap API
  console.log('📋 测试 1: Bootstrap API');
  try {
    const res = await request('GET', '/api/bootstrap');
    assert(res.status === 200, '状态码应为 200');
    assert(res.body.cats && res.body.cats.length === 3, '应有 3 只猫');
    assert(res.body.invocationId, '应有 invocationId');
    assert(res.body.callbackToken, '应有 callbackToken');
    console.log('  ✅ 通过');
    passed++;
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
  }

  // 测试 2: 猫猫列表
  console.log('📋 测试 2: 猫猫列表');
  try {
    const res = await request('GET', '/api/bootstrap');
    const cats = res.body.cats;
    assert(cats.includes('opus'), '应包含 opus');
    assert(cats.includes('codex'), '应包含 codex');
    assert(cats.includes('gemini'), '应包含 gemini');
    console.log('  ✅ 通过');
    passed++;
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
  }

  // 测试 3: 发送消息（仅验证 API 可达）
  console.log('📋 测试 3: 发送消息 API');
  try {
    const res = await request('POST', '/api/run', {
      threadId: 'test-' + Date.now(),
      cats: ['opus'],
      prompt: '请回复"测试成功"'
    });
    // API 应该接受请求
    assert(res.status === 200 || res.status === 202, '状态码应为 200 或 202');
    console.log('  ✅ 通过 (API 可达)');
    passed++;
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
  }

  console.log('\n📊 测试结果:');
  console.log(`  ✅ 通过: ${passed}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log(`  📈 成功率: ${Math.round(passed / (passed + failed) * 100)}%`);

  return failed === 0;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// 检查服务器
async function checkServer() {
  try {
    const res = await request('GET', '/');
    return res.status === 200;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 检查服务器...');
  const serverOk = await checkServer();
  if (!serverOk) {
    console.log('❌ 服务器未启动，请先运行: node server/index.js');
    process.exit(1);
  }
  console.log('✅ 服务器已就绪\n');

  const success = await runTests();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
