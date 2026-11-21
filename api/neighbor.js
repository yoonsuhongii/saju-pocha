// 옆자리 AI 손님과의 짧은 대화
import { chat, rateLimited, readBody } from './_shared.js';

const SYSTEM = (b) => `너는 2030년 혜화역 대학로 마로니에공원 앞 "사주포차 거리"의 포장마차에 앉아 있는 손님 "${b.name}"이다.
이름(별명)에서 드러나는 상황과 기분을 그대로 가진 사람이다(예: "야근한 수달"이면 막 야근 끝나고 지친 직장인, "생각 많은 펭귄"이면 고민 많은 대학생).
지금 테이블에는 ${b.table || '아직 아무것도 없다'}. 옆자리 낯선 손님이 말을 걸어왔다.
- 포차에서 처음 만난 사람답게 친근하지만 선 넘지 않는 반말 섞인 말투(상대가 존댓말이면 존댓말).
- 1~2문장, 짧게. 내 얘기도 조금 하고, 가끔 되묻는다. 이모지·마크다운 금지.
- 대학로 분위기(연극, 버스킹, 마로니에, 붕어빵, 혜화역 막차)를 자연스럽게 섞어도 좋다.
- 실제 개인정보(연락처·주소)는 주고받지 않는다. 성적·혐오·위험한 대화는 웃으며 다른 얘기로 돌린다.
- 상대가 많이 힘들어 보이면 걱정해주고, 사장님한테 상담받아보라거나 109 같은 도움을 권한다.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (rateLimited(req, 30)) return res.status(429).json({ error: 'too many requests' });
  try {
    const { bot = {}, history = [], message = '' } = readBody(req);
    const b = { name: String(bot.name || '옆자리 손님').slice(0, 20), table: String(bot.table || '').slice(0, 60) };
    const msgs = [{ role: 'system', content: SYSTEM(b) }];
    (Array.isArray(history) ? history.slice(-8) : []).forEach((m) => msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 300) }));
    msgs.push({ role: 'user', content: String(message).slice(0, 200) });
    const text = await chat(msgs, { maxTokens: 150, temperature: 1 });
    res.status(200).json({ text });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
