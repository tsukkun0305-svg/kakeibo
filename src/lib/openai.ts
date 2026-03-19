import OpenAI from 'openai';

export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null;
  }

  return new OpenAI({ apiKey });
}
