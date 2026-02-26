/**
 * 真实 CLI 调用集成测试
 *
 * 直接调用已配置好的 CLI 工具（API Key 已在 CLI 中配置）
 *
 * 运行方式：
 *    node --test tests/cli-integration.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('child_process');
const path = require('path');

// 超时时间（CLI 调用可能较慢）
const CLI_TIMEOUT = 120000; // 120 秒

/**
 * 调用 AI CLI 并返回结果
 */
function invokeAiCli(cli, prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`CLI timeout after ${options.timeout || CLI_TIMEOUT}ms`));
    }, options.timeout || CLI_TIMEOUT);

    // ai-cli.js 的调用方式：node ai-cli.js <claude|codex|gemini> "prompt" [--resume]
    const args = [
      path.join(__dirname, '../server/cli/ai-cli.js'),
      cli,  // 第一个参数是 CLI 类型
      prompt
    ];
    if (options.resume) {
      args.push('--resume');
    }

    const child = spawn('node', args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * 检查 CLI 是否可用
 */
async function checkCliAvailable(cli) {
  try {
    const result = await invokeAiCli(cli, 'hi', { timeout: 30000 });
    return result.code === 0;
  } catch {
    return false;
  }
}

describe('真实 CLI 调用集成测试', () => {
  describe('Claude CLI (布偶猫)', () => {
    it('应该能调用 Claude 并获得回复', async () => {
      const result = await invokeAiCli('claude', '请回复"测试成功"四个字，不要加其他内容');

      console.log('Claude stdout:', result.stdout.slice(0, 200));
      console.log('Claude stderr:', result.stderr.slice(0, 200));

      assert.strictEqual(result.code, 0, `CLI 应该成功退出，stderr: ${result.stderr}`);
      assert.ok(result.stdout.length > 0, '应该有输出');
    });

    it('应该能使用 resume 继续对话', async () => {
      // 第一轮：记住一个数字
      const first = await invokeAiCli('claude', '请记住数字 42，等下我会问你');
      console.log('第一轮完成，code:', first.code);

      assert.strictEqual(first.code, 0);

      // 第二轮：询问记住的数字
      const second = await invokeAiCli('claude', '我刚才让你记住的数字是多少？只回复数字', { resume: true });
      console.log('第二轮输出:', second.stdout.slice(0, 200));

      assert.strictEqual(second.code, 0);
      assert.ok(second.stdout.includes('42'), `应该记得数字 42，实际输出: ${second.stdout}`);
    });
  });

  describe('Codex CLI (缅因猫)', () => {
    it('应该能调用 Codex 并获得回复', async () => {
      const result = await invokeAiCli('codex', '请回复"codex测试"', { timeout: 90000 });

      console.log('Codex stdout:', result.stdout.slice(0, 200));
      console.log('Codex stderr:', result.stderr.slice(0, 500));

      // Codex 可能因网络问题超时，允许跳过
      if (result.code !== 0 && result.stderr.includes('timeout')) {
        console.log('⚠️ Codex 超时，跳过此测试');
        return;
      }

      assert.strictEqual(result.code, 0, `CLI 应该成功退出，stderr: ${result.stderr}`);
      assert.ok(result.stdout.length > 0, '应该有输出');
    });
  });

  describe('Gemini CLI (暹罗猫)', () => {
    it('应该能调用 Gemini 并获得回复', async () => {
      const result = await invokeAiCli('gemini', '回复"ok"', { timeout: 60000 });

      console.log('Gemini stdout:', result.stdout.slice(0, 200));
      console.log('Gemini stderr:', result.stderr.slice(0, 500));

      // Gemini 可能需要认证，允许跳过
      if (result.code !== 0 && result.stderr.includes('authenticat')) {
        console.log('⚠️ Gemini 需要认证，跳过此测试');
        return;
      }

      // Gemini 可能返回 500 错误，允许跳过
      if (result.code !== 0 && (result.stderr.includes('500') || result.stderr.includes('Internal Server Error'))) {
        console.log('⚠️ Gemini API 返回 500 错误，跳过此测试');
        return;
      }

      assert.strictEqual(result.code, 0, `CLI 应该成功退出，stderr: ${result.stderr}`);
      assert.ok(result.stdout.length > 0, '应该有输出');
    });
  });

  describe('A2A 路由与 CLI 联动', () => {
    it('布偶猫应该能 @ 缅因猫并触发 A2A', async () => {
      const { parseA2AMentions } = require('../server/a2a/mentions');
      const { getCatConfig } = require('../server/config/cats');

      // 模拟布偶猫的输出中包含 @缅因猫
      const a2aMessage = '@codex 帮我 review 这段代码';
      const mentions = parseA2AMentions(a2aMessage, 'opus', { mode: 'agent' });

      console.log('A2A 提及:', mentions);

      assert.ok(mentions.includes('codex'), '应该识别出 codex');

      // 验证配置
      const codexConfig = getCatConfig('codex');
      assert.strictEqual(codexConfig.cli, 'codex');
    });
  });

  describe('状态管理与 CLI 联动', () => {
    it('CLI 调用前后状态应该正确更新', async () => {
      const { CatStatusManager, CAT_STATUS } = require('../server/utils/cat-status');
      const manager = new CatStatusManager();

      // 初始状态应该是 idle
      assert.strictEqual(manager.getStatus('opus'), CAT_STATUS.IDLE);

      // 模拟状态变更
      manager.setStatus('opus', CAT_STATUS.THINKING);
      assert.strictEqual(manager.getStatus('opus'), CAT_STATUS.THINKING);

      // 调用 CLI
      const result = await invokeAiCli('claude', '回复"ok"');
      assert.strictEqual(result.code, 0);

      // 完成后重置状态
      manager.resetStatus('opus');
      assert.strictEqual(manager.getStatus('opus'), CAT_STATUS.IDLE);
    });
  });
});
