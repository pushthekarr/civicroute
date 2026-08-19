// Calls Groq's OpenAI-compatible chat completions API to classify a complaint
// into { department, category, priority, reasoning }. Falls back to null on
// any failure so the caller can use the trie-based classifier instead.

const fetch = require('node-fetch');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TEXT_MODEL = 'openai/gpt-oss-20b';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

function buildSystemPrompt(departmentNames) {
  return `You are a civic complaint classification engine. Given a citizen's complaint, classify it.
Valid departments (choose EXACTLY one from this list): ${departmentNames.join(', ')}.
Respond ONLY with strict JSON, no markdown, no preamble, in this exact shape:
{"department": "<one of the valid departments>", "category": "<short 2-4 word issue category>", "priority": <integer 1-5, 1=most urgent e.g. safety/health risk, 5=least urgent>, "confidence": <float 0-1>}`;
}

async function classifyText(text, departmentNames) {
  if (!process.env.GROQ_API_KEY) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(departmentNames) },
          { role: 'user', content: text },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.choices) {
      console.error('Groq API error response:', JSON.stringify(data));
      return null;
    }
    const raw = data.choices[0].message.content.trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Groq text classification failed:', err.message);
    return null;
  }
}

async function classifyImage(base64Image, mimeType, departmentNames) {
  if (!process.env.GROQ_API_KEY) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: buildSystemPrompt(departmentNames) + '\nAnalyze this image of a civic issue.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.choices) {
      console.error('Groq API error response:', JSON.stringify(data));
      return null;
    }
    const raw = data.choices[0].message.content.trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Groq image classification failed:', err.message);
    return null;
  }
}

module.exports = { classifyText, classifyImage };
