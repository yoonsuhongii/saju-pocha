// 상담사 스타일 프롬프트 → 포차 사장님 캐릭터(외형·말투·간판) JSON
import { getClient, MODEL, rateLimited, readBody } from './_shared.js';

const SYSTEM = `너는 2030년 "사주포차 거리" 월드모델의 캐릭터 디자이너다.
사용자가 원하는 상담사(포차 사장님) 스타일을 한 줄로 주면, 그 사람을 3D 귀여운 캐릭터로 만들 파라미터를 JSON으로만 답한다.
형식:
{"name":"호칭(예: 부산 김사장, 6자 이내)","stallName":"포차 간판 이름(8자 이내, 한글)","speech":"말투 설명(존댓말/반말, 사투리, 말버릇 1~2개, 50자 이내)","greeting":"첫 인사 한 문장(그 말투로)",
"look":{"skin":"#hex","hair":"#hex","hairStyle":"short|bun|long|ponytail|perm|spiky|bald","outfit":"#hex","apron":"#hex 또는 null","accessory":"none|glasses|headscarf|hat|beanie|catears|flower|towel|crown|hanbok","accessoryColor":"#hex","height":0.9~1.15,"eyes":"dot|line"},
"tarp":"천막 색 #hex","signColor":"간판 글자색 #hex"}
규칙: 실존 인물·연예인·상표 캐릭터를 흉내 내지 말고 분위기만 반영. 혐오·성적 요소 금지(요청되면 무난한 캐릭터로). JSON 외 텍스트 금지.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (rateLimited(req, 12)) return res.status(429).json({ error: 'too many requests' });
  try {
    const { prompt = '' } = readBody(req);
    const c = await getClient().chat.completions.create({
      model: MODEL, temperature: 0.9, max_tokens: 400, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: String(prompt).slice(0, 200) }],
    });
    res.status(200).json(JSON.parse(c.choices[0].message.content || '{}'));
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
