/**
 * 显示设置 API 路由
 */
const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../config/display-settings.json');

const DEFAULT_SETTINGS = {
  messageFontSize: 14,
  uiFontSize: 14,
  spacing: 4
};

/**
 * 将值限制在范围内
 */
function clamp(value, min, max, fallback) {
  const num = Number(value);
  if (isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/**
 * 读取显示设置
 */
function getDisplaySettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
      return { ...DEFAULT_SETTINGS };
    }
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(content);
    // 验证并补全字段
    return {
      messageFontSize: clamp(settings.messageFontSize, 10, 20, 14),
      uiFontSize: clamp(settings.uiFontSize, 10, 18, 14),
      spacing: clamp(settings.spacing, 1, 8, 4)
    };
  } catch (err) {
    console.error('读取显示设置失败:', err.message);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 更新显示设置
 */
function updateDisplaySettings(newSettings) {
  const settings = {
    messageFontSize: clamp(newSettings.messageFontSize, 10, 20, 14),
    uiFontSize: clamp(newSettings.uiFontSize, 10, 18, 14),
    spacing: clamp(newSettings.spacing, 1, 8, 4)
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  return settings;
}

/**
 * 处理 GET /api/settings/display
 */
function handleGetDisplaySettings(req, res, sendJson) {
  const settings = getDisplaySettings();
  sendJson(res, 200, { success: true, data: settings });
}

/**
 * 处理 POST /api/settings/display
 */
async function handleUpdateDisplaySettings(req, res, sendJson, readBody) {
  const raw = await readBody(req);
  let payload = {};
  try {
    payload = JSON.parse(raw || '{}');
  } catch (e) {
    return sendJson(res, 400, { success: false, error: 'invalid_json' });
  }
  const settings = updateDisplaySettings(payload);
  sendJson(res, 200, { success: true, data: settings });
}

module.exports = {
  handleGetDisplaySettings,
  handleUpdateDisplaySettings,
  getDisplaySettings,
  updateDisplaySettings
};
