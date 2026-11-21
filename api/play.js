// 즉석 연극 대본 생성 (연출 지시 포함)
import { chat, rateLimited, readBody } from './_shared.js';

const SYSTEM = `너는 2030년 혜화역 대학로 마로니에공원 야외무대의 즉석 연극 연출가 겸 작가다.
관객이 던진 주제로 1분 30초짜리 소극장 코미디 한 편을 쓴다. 배우가 무대 위를 움직이고 몸으로 연기하도록 연출 지시까지 JSON으로만 답한다.
{"title":"제목(12자 이내)","place":"장소(14자 이내)","bg":["배경 하늘색 #hex","지평선 색 #hex"],
"props":["bench|table|lamp|tree|busstop|desk|pocha|door|moon|stars|flowers 중 장면에 맞는 것 2~4개"],
"cast":[{"name":"배역명(8자 이내)","outfit":"#hex","hair":"short|bun|long|ponytail|perm|spiky|bald","accessory":"none|glasses|hat|beanie|catears|flower|towel|headscarf|crown"}, ... 2~3명],
"lines":[{"who":배우번호(0부터) 또는 -1(해설),"text":"대사(45자 이내)","act":"talk|wave|cheer|jump|sit|bow|cry|laugh|angry|surprise|think|dance|point|hug|fall|walk","to":"left|center|right|front|back|frontleft|frontright 또는 생략(이동 없음)","emote":"감정 이모지 1개 또는 생략","sfx":"rimshot|chime|whoosh|boing|sad|drumroll 또는 생략","react":"laugh|gasp|aww|clap|none"}, ...]}
연출 규칙:
- 대사 10~13줄. 첫 줄은 해설(who:-1)로 상황 소개. 기(상황)→승(엉뚱한 갈등)→전(반전, 사주·운세 소재 활용)→결(훈훈하거나 빵 터지는 마무리).
- 매 줄마다 act를 다양하게 쓰고, 4줄 이상은 to로 무대 위 자리를 옮겨 동선을 만든다. 같은 act를 연속 3번 쓰지 않는다.
- 웃음 포인트에 sfx(rimshot/boing)와 react:"laugh", 반전에 react:"gasp", 감동에 react:"aww", 마지막 줄은 react:"clap".
- 말맛 있는 구어체, 대학로·포차·사주·붕어빵·막차·버스킹·혜화역 같은 동네 소재를 자연스럽게. 실존 인물·작품 패러디 금지, 혐오·성적·폭력 금지, 한자 금지.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (rateLimited(req, 6)) return res.status(429).json({ error: 'too many requests' });
  try {
    const { topic = '', mood = '' } = readBody(req);
    const user = `주제: ${String(topic).slice(0, 80) || '(자유 — 오늘 밤 대학로 포차 거리에서 생길 법한 일)'} / 지금 거리 분위기: ${String(mood).slice(0, 40)}`;
    const text = await chat([{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], { maxTokens: 1600, temperature: 1, json: true });
    res.status(200).json(JSON.parse(text.replace(/^```(json)?|```$/g, '')));
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
