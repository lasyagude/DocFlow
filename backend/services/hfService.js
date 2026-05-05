const axios = require('axios');

const LOCAL_AI_SERVICE_URL = 'http://localhost:5001';
const HF_FALLBACK_MODEL = process.env.HF_FALLBACK_MODEL || null;
const HF_API_KEY = process.env.HF_API_KEY || null;
const HF_FALLBACK_URL = HF_FALLBACK_MODEL
  ? `https://api-inference.huggingface.co/models/${HF_FALLBACK_MODEL}`
  : null;

async function runFallbackInference(prompt) {
  if (!HF_FALLBACK_URL || !HF_API_KEY) {
    throw new Error('Hugging Face fallback is not configured.');
  }

  console.log('Falling back to Hugging Face');
  const res = await axios.post(
    HF_FALLBACK_URL,
    { inputs: prompt },
    {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }
  );

  const generatedText = Array.isArray(res.data)
    ? res.data[0]?.generated_text
    : res.data?.generated_text;

  console.log('HF response received');
  if (!generatedText || typeof generatedText !== 'string') {
    throw new Error('Invalid response from Hugging Face fallback');
  }

  return generatedText;
}

async function runInference(prompt) {
  try {
    console.log('Using local AI service');
    const res = await axios.post(
      `${LOCAL_AI_SERVICE_URL}/generate`,
      { prompt },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );

    if (res.data && typeof res.data.result === 'string') {
      return res.data.result;
    }

    throw new Error('Invalid response from local AI service');
  } catch (err) {
    console.error('Local AI service error:', err.response?.data || err.message);

    try {
      return await runFallbackInference(prompt);
    } catch (fallbackErr) {
      console.error('Hugging Face fallback error:', fallbackErr.response?.data || fallbackErr.message);
      throw new Error('AI inference failed for both local and Hugging Face services.');
    }
  }
}

module.exports = {
  runInference,
};
