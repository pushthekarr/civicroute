const fetch = require('node-fetch');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-20b';
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const MIN_CONFIDENCE = 0.55;

function buildSystemPrompt(departmentNames) {
  return `You classify municipal complaints. Understand English, Hindi, Marathi, Hinglish, and mixed-language input. Choose exactly one department from: ${departmentNames.join(', ')}. Return JSON only: {"department":"<exact department>","category":"<2-4 words in English>","priority":<1-5; 1 is immediate safety/health danger>,"confidence":<0-1>}. Do not invent departments.`;
}

function validateResult(candidate, departmentNames) {
  if (!candidate || typeof candidate !== 'object' || !departmentNames.includes(candidate.department)) return null;
  const priority = Number(candidate.priority);
  const confidence = Number(candidate.confidence);
  if (!Number.isInteger(priority) || priority < 1 || priority > 5 || !Number.isFinite(confidence)) return null;
  return {
    department: candidate.department,
    category: String(candidate.category || 'General issue').slice(0, 80),
    priority,
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

async function requestClassification(messages, model, departmentNames) {
  if (!process.env.GROQ_API_KEY) return null;
  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 180, response_format: { type: 'json_object' } }),
      timeout: 12000,
    });
    const data = await response.json();
    if (!response.ok || !data.choices?.[0]?.message?.content) { console.error('Groq classification unavailable:', response.status); return null; }
    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    return validateResult(JSON.parse(raw), departmentNames);
  } catch (error) { console.error('Groq classification failed:', error.message); return null; }
}

function classifyText(text, departmentNames) {
  return requestClassification([{ role: 'system', content: buildSystemPrompt(departmentNames) }, { role: 'user', content: text }], TEXT_MODEL, departmentNames);
}
function classifyImage(base64Image, mimeType, departmentNames) {
  return requestClassification([{ role: 'system', content: buildSystemPrompt(departmentNames) }, { role: 'user', content: [{ type: 'text', text: 'Classify the civic issue visible in this image.' }, { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }] }], VISION_MODEL, departmentNames);
}

function combineClassifications(textResult, imageResult) {
  const usableText = textResult?.confidence >= MIN_CONFIDENCE ? textResult : null;
  const usableImage = imageResult?.confidence >= MIN_CONFIDENCE ? imageResult : null;
  if (!usableText && !usableImage) return null;
  if (usableText && usableImage && usableText.department === usableImage.department) {
    return { ...usableText, priority: Math.min(usableText.priority, usableImage.priority), confidence: Math.min(0.99, (usableText.confidence + usableImage.confidence) / 2 + 0.1), source: 'ai_text_image' };
  }
  const selected = [usableText, usableImage].filter(Boolean).sort((a, b) => b.confidence - a.confidence)[0];
  return { ...selected, source: selected === usableImage ? 'ai_image' : 'ai_text' };
}

module.exports = { classifyText, classifyImage, combineClassifications, MIN_CONFIDENCE };
