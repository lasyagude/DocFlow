const Config = require('../models/Config');

const AI_SETTINGS_KEY = 'ai_settings';
const DEFAULT_AI_SETTINGS = {
  aiEnabled: true,
  fallbackOnly: false,
};

async function getAiSettings() {
  const config = await Config.findOne({ key: AI_SETTINGS_KEY }).lean();
  return {
    ...DEFAULT_AI_SETTINGS,
    ...(config?.value || {}),
  };
}

async function setAiSettings(input = {}) {
  const nextValue = {
    ...DEFAULT_AI_SETTINGS,
    aiEnabled: input.aiEnabled !== undefined ? Boolean(input.aiEnabled) : DEFAULT_AI_SETTINGS.aiEnabled,
    fallbackOnly: input.fallbackOnly !== undefined ? Boolean(input.fallbackOnly) : DEFAULT_AI_SETTINGS.fallbackOnly,
  };

  if (!nextValue.aiEnabled) {
    nextValue.fallbackOnly = true;
  }

  const config = await Config.findOneAndUpdate(
    { key: AI_SETTINGS_KEY },
    {
      $set: {
        value: nextValue,
        updatedAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return {
    ...DEFAULT_AI_SETTINGS,
    ...(config?.value || nextValue),
  };
}

module.exports = {
  AI_SETTINGS_KEY,
  DEFAULT_AI_SETTINGS,
  getAiSettings,
  setAiSettings,
};
