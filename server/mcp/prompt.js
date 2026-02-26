function buildMcpCallbackInstructions(options) {
  const apiUrl = options.apiUrl;
  const threadId = options.threadId || '$CAT_CAFE_THREAD_ID';
  const catId = options.catId || '$CAT_CAFE_CAT_ID';

  return `## 发送消息给团队

可用艾特：@opus，@codex，@gemini。仅在需要对方回复时才使用 @，并把 @ 放在新的一行行首。

### 发送消息（必须使用此格式）

请使用以下单行格式发送消息给团队：

\`\`\`
CAT_CAFE_POST_MESSAGE {"content":"你的消息（可包含 @opus/@codex/@gemini）","threadId":"${threadId}"}
\`\`\`

**重要**：
- 每条消息单独一行
- content 中的双引号需要转义为 \\"
- 不要使用 curl，直接输出上述格式的单行文本即可

### 示例

回复团队成员：
CAT_CAFE_POST_MESSAGE {"content":"@opus 我已完成代码审查，请查看。","threadId":"${threadId}"}

简单回复：
CAT_CAFE_POST_MESSAGE {"content":"收到，正在处理中。","threadId":"${threadId}"}
`;
}

module.exports = {
  buildMcpCallbackInstructions
};
