// 프롬프트 → 거리 테마(날씨·하늘·장식·현수막·행인 옷·음악 분위기)
import { chat, rateLimited, readBody } from './_shared.js';

const SYSTEM = `너는 2030년 혜화역 대학로 "사주포차 거리" 월드모델의 무대감독이다.
사용자가 거리 분위기를 한 줄로 요청하면, 거리를 바꿀 파라미터를 JSON으로만 답한다.
{"title":"테마 이름(12자 이내)","weather":"clear|rain|snow|fog|petals|leaves|embers",
"sky":["하늘 위쪽 #hex","지평선 쪽 #hex"],"fog":"#hex","bulb":"전구 줄 색 #hex",
"decor":"none|snowmen|pumpkins|xmas|lanterns|flowers|balloons","banner":"거리 현수막 문구(16자 이내, 한글)","bannerBg":"#hex",
"outfits":["행인 옷 색 #hex 4~6개"],"accessory":"none|beanie|hat|catears|flower|crown|headscarf|glasses",
"mood":"warm|sad|festive|snow","busker":"버스커가 할 한마디(20자 이내)",
"set":"none|campus|hanok|cyber|market|beach|forest|festival (요청 장소·분위기에 가장 가까운 무대 세트. 장소가 바뀌는 요청이면 반드시 none이 아닌 것을 고름)",
"gate":"공원 입구 게이트 현판 문구(12자 이내)","backdrop":"공원 뒤 배경 건물 간판 문구(16자 이내)",
"booths":["포차 사이 부스 4곳 간판 문구(각 10자 이내)"],
"signs":["길 건너 상가 간판 13개를 테마에 맞게 바꾼 가게 이름(각 7자 이내, 실존 상호 금지)"],"signColors":["간판 네온 색 #hex 3~5개"],
"buildingColor":"길 건너 건물 색 #hex","ground":"공원 바닥 색 #hex","leaves":["공원 나무 잎 색 #hex 3~5개"]}
예: "캠퍼스 분위기"면 set=campus, 게이트 "2030 대학교 정문", 부스 "동아리 박람회/학생회/과잠 판매/중고책 장터", 간판 "북카페, 복사실, 학식당, 과방, 문구점…", 잎은 초록.
밤 거리라는 점을 유지하고(하늘은 어둡게), 요청 분위기가 확 느껴지게 고른다. 혐오·성적·위험 요소 요청은 무난한 축제 테마로 바꾼다. JSON 외 텍스트 금지.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (rateLimited(req, 6)) return res.status(429).json({ error: 'too many requests' });
  try {
    const { prompt = '' } = readBody(req);
    const text = await chat([{ role: 'system', content: SYSTEM }, { role: 'user', content: String(prompt).slice(0, 120) }], { maxTokens: 900, temperature: 0.9, json: true });
    res.status(200).json(JSON.parse(text.replace(/^```(json)?|```$/g, '')));
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
