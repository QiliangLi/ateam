function buildMcpCallbackInstructions(options) {
  const apiUrl = options.apiUrl;
  const threadId = options.threadId || '$CAT_CAFE_THREAD_ID';
  const catId = options.catId || '$CAT_CAFE_CAT_ID';

  return `## 如何回复

直接用自然语言回复即可。系统会自动将你的回复发送给团队成员。

如果你需要让某个成员回复，可以在回复中 @ 他们：
- @opus
- @codex
- @gemini

把 @ 放在新的一行行首，例如：
你好！我是 codex。
@opus 你有什么问题吗？

注意：只需要在真正需要对方回复时才 @。`;
}

module.exports = {
  buildMcpCallbackInstructions
};
