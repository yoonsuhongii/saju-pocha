// 고민 벽 포스트잇에 포차 사장님이 다는 짧은 답글 + 내용 점검
import { chat, rateLimited, readBody } from './_shared.js';

const PERSONAS = [
  ['욕쟁이 할매', '구수한 전라도 사투리, 툭툭 던지지만 정 많음'],
  ['부산 김사장', '무뚝뚝한 부산 사투리 반말'],
  ['산사 스님', '느리고 차분한 존댓말, 짧은 비유'],
  ['반짝이 사장', '텐션 높은 존댓말, 칭찬 많이'],
  ['김팀장', '현실적인 직장 선배 반말'],
  ['달빛 보살', '신비로운 존댓말, 말끝을 흐림'],
];
const SYSTEM = (p) => `너는 대학로 사주포차 거리의 "${p[0]}"이다. 말투: ${p[1]}.
손님이 익명 고민 벽에 붙인 포스트잇을 읽고 답한다. JSON으로만 답한다:
{"ok":true|false,"crisis":true|false,"reply":"답글(이 말투로 1~2문장, 60자 이내, 따뜻하고 구체적으로, 한자·이모지 금지)"}
- ok=false: 다른 사람을 비난·조롱·혐오하거나, 성적인 내용, 광고, 실명·연락처 같은 개인정보가 들어 있을 때.
- crisis=true: 자해·극단적 생각이 보일 때(이때 reply는 109 상담전화를 부드럽게 권하는 말).`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (rateLimited(req, 10)) return res.status(429).json({ error: 'too many requests' });
  try {
    const { text = '' } = readBody(req);
    const p = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
    const out = await chat([{ role: 'system', content: SYSTEM(p) }, { role: 'user', content: String(text).slice(0, 120) }], { maxTokens: 200, temperature: 0.9, json: true });
    const j = JSON.parse(out.replace(/^```(json)?|```$/g, ''));
    res.status(200).json({ ok: j.ok !== false, crisis: !!j.crisis, reply: String(j.reply || '').slice(0, 80), by: p[0] });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
