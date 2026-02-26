#!/usr/bin/env node

/**
 * Cat Café Server 主入口
 *
 * 用法:
 *   node server/index.js              # 启动聊天服务器 (默认)
 *   node server/index.js --callback   # 启动回调服务器
 *   node server/index.js --both       # 同时启动两个服务器
 */

const path = require('path');

function showUsage() {
  console.log('Cat Café Server');
  console.log('');
  console.log('用法:');
  console.log('  node server/index.js              启动聊天服务器 (默认)');
  console.log('  node server/index.js --callback   启动回调服务器');
  console.log('  node server/index.js --both       同时启动两个服务器');
  console.log('');
  console.log('环境变量:');
  console.log('  CAT_CAFE_PORT          聊天服务器端口 (默认 3200)');
  console.log('  CAT_CAFE_CALLBACK_PORT 回调服务器端口 (默认 3201)');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }

  const startChat = args.includes('--both') || (!args.includes('--callback'));
  const startCallback = args.includes('--both') || args.includes('--callback');

  if (startChat) {
    console.log('启动聊天服务器...');
    require('./servers/chat-server');
  }

  if (startCallback && !startChat) {
    console.log('启动回调服务器...');
    require('./servers/callback-server');
  }
}

main().catch((err) => {
  console.error('启动失败:', err.message);
  process.exit(1);
});
