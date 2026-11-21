import OpenAI from 'openai';

export const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let client = null;
export function getClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY 환경변수가 없습니다');
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

// 아주 단순한 IP별 호출 제한 (서버 인스턴스 단위, 비용 폭주 방지용 안전장치)
const hits = new Map();
export function rateLimited(req, limit = 40, windowMs = 60_000) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > limit;
}

export function readBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    if (b.length > 8000) throw new Error('body too large');
    return JSON.parse(b);
  }
  return b;
}
