// 즉석 연극 대본 생성
import { chat, rateLimited, readBody } from './_shared.js';

const SYSTEM = `너는 2030년 혜화역 대학로 마로니에공원 야외무대의 즉석 연극 작가다.
관객이 던진 주제(없으면 오늘 밤 포차 거리 분위기)로 1분짜리 짧은 소극장 연극 한 장면을 쓴다. JSON으로만 답한다.
{"title":"제목(12자 이내)","cast":[{"name":"배역명(8자 이내)"},{"name":"..."},{"name":"..."}],
"lines":[{"who":0,"text":"대사(40자 이내)","act":"talk|wave|cheer|walk"}, ...]}
규칙: 배역 2~3명, 대사 7~9줄. 웃기고 따뜻하게 시작→갈등→반전→훈훈한 마무리. 대학로·포차·사주·붕어빵·막차·버스킹 같은 동네 소재를 자연스럽게.
실존 인물·작품 패러디 금지, 혐오·성적·폭력 금지, 한자·이모지 금지. 마지막 줄은 다 같이 기분 좋아지는 대사.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (rateLimited(req, 6)) return res.status(429).json({ error: 'too many requests' });
  try {
    const { topic = '', mood = '' } = readBody(req);
    const user = `주제: ${String(topic).slice(0, 80) || '(자유)'} / 지금 거리 분위기: ${String(mood).slice(0, 40)}`;
    const text = await chat([{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], { maxTokens: 900, temperature: 1, json: true });
    const j = JSON.parse(text.replace(/^```(json)?|```$/g, ''));
    res.status(200).json(j);
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
