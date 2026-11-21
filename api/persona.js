// 상담사 스타일 프롬프트 → 포차 사장님 캐릭터(외형·말투·간판) JSON
import { chat, rateLimited, readBody } from './_shared.js';

const SYSTEM = `너는 2030년 "사주포차 거리" 월드모델의 캐릭터 디자이너다.
사용자가 원하는 상담사(포차 사장님) 스타일을 한 줄로 주면, 개성이 뚜렷한 캐릭터를 만들어 JSON으로만 답한다.
{"name":"호칭(예: 부산 김사장, 6자 이내)","stallName":"포차 간판 이름(한글 8자 이내)",
"speech":"말투 규칙: 반말/존댓말, 지역 사투리의 실제 어미와 단어 3개 이상 예시 포함, 호칭(손님을 뭐라고 부르는지) (80자 이내)",
"catchphrases":"자주 쓰는 입버릇 3개를 / 로 구분",
"backstory":"이 사람이 포차를 하게 된 짧은 사연 한 문장(상담 관점에 영향을 줌)",
"greeting":"첫 인사 한두 문장(그 말투로, 개성이 확 드러나게)",
"sample":"고민 상담할 때의 말투 예시 두 문장",
"look":{"skin":"#hex","hair":"#hex","hairStyle":"short|bun|long|ponytail|perm|spiky|bald","outfit":"#hex","apron":"#hex 또는 null","accessory":"none|glasses|headscarf|hat|beanie|catears|flower|towel|crown|hanbok","accessoryColor":"#hex","height":0.9~1.15,"eyes":"dot|line"},
"tarp":"천막 색 #hex","signColor":"간판 글자색 #hex"}
규칙: 실존 인물·연예인·상표 캐릭터를 흉내 내지 말고 분위기만 반영. 혐오·비하·성적 요소 금지(요청되면 무난한 캐릭터로). 외형은 스타일에 어울리게 고른다. JSON 외 텍스트 금지.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (rateLimited(req, 12)) return res.status(429).json({ error: 'too many requests' });
  try {
    const { prompt = '' } = readBody(req);
    const text = await chat([{ role: 'system', content: SYSTEM }, { role: 'user', content: String(prompt).slice(0, 200) }], { maxTokens: 600, temperature: 1, json: true });
    res.status(200).json(JSON.parse(text.replace(/^```(json)?|```$/g, '') || '{}'));
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
