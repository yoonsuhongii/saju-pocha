// GPT 호출 (Vercel /api) + 오프라인 대체 규칙 (키가 없거나 미리보기 환경에서도 동작)
import { ELEMENTS, snackFor, yearLuck } from './saju.js';

let calls = 0;
const MAX_CALLS = 60;
async function post(path, body, ms = 15000) {
  if (calls >= MAX_CALLS) throw new Error('limit');
  calls++;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally { clearTimeout(t); }
}

// ---------------- 상담사 페르소나 ----------------
export const DEFAULT_PERSONA = {
  name: '포차 이모', stallName: '오행집', speech: '다정한 반말, 손님을 "우리 손님"이라 부름',
  greeting: '어서 와, 우리 손님. 비 오는데 고생했네. 일단 앉아.',
  look: { skin: '#f2c9a0', hair: '#3a2a20', hairStyle: 'perm', outfit: '#e64980', apron: '#fff4e6', accessory: 'headscarf', accessoryColor: '#ff6b6b', height: 1, eyes: 'line' },
  tarp: '#ff7a1a', signColor: '#fff3d6',
};

const PRESETS = [
  { k: ['부산', '경상', '사투리', '아재', '무뚝뚝'], p: { name: '부산 김사장', stallName: '해운대 포차', speech: '무뚝뚝한 부산 사투리 반말, "마", "아이가", "됐다 고마"를 씀', greeting: '마, 왔나. 앉아라. 뭐 묵을래.', look: { skin: '#d9a57a', hair: '#1a1a1a', hairStyle: 'spiky', outfit: '#364fc7', apron: '#212529', accessory: 'towel', accessoryColor: '#ffffff', height: 1.08, eyes: 'line' }, tarp: '#1c7ed6', signColor: '#ffe066' } },
  { k: ['할머니', '할매', '욕쟁이', '전라', '구수'], p: { name: '욕쟁이 할매', stallName: '할매집', speech: '구수한 전라도 사투리, 툭툭 던지지만 정 많음, "잉", "~당께"', greeting: '워메, 얼굴이 반쪽이여. 얼른 앉어잉.', look: { skin: '#eec39a', hair: '#e8e1d6', hairStyle: 'bun', outfit: '#7048e8', apron: '#ffe3e3', accessory: 'glasses', accessoryColor: '#000000', height: 0.92, eyes: 'line' }, tarp: '#e8590c', signColor: '#fff3d6' } },
  { k: ['스님', '절', '명상', '도사', '산'], p: { name: '산사 스님', stallName: '고요 포차', speech: '느리고 차분한 존댓말, "허허", 짧은 비유를 즐겨 씀', greeting: '허허, 비를 피해 잘 오셨습니다. 차 한 잔 드리지요.', look: { skin: '#f2c9a0', hair: '#2b1d14', hairStyle: 'bald', outfit: '#868e96', apron: null, accessory: 'none', accessoryColor: '#ffffff', height: 1, eyes: 'line' }, tarp: '#a9744f', signColor: '#fff8e1' } },
  { k: ['아이돌', '연습생', '밝', '텐션', '귀여'], p: { name: '반짝이 사장', stallName: '별빛 포차', speech: '텐션 높은 존댓말, "완전", "대박"을 자주 씀, 칭찬 많이 함', greeting: '어서 오세요! 오늘 오신 거 완전 잘하신 거예요!', look: { skin: '#ffe0c7', hair: '#f783ac', hairStyle: 'ponytail', outfit: '#ffffff', apron: '#ffdeeb', accessory: 'flower', accessoryColor: '#ffd43b', height: 1, eyes: 'dot' }, tarp: '#f06595', signColor: '#ffffff' } },
  { k: ['선비', '조선', '훈장', '양반', '사극'], p: { name: '훈장 선비', stallName: '서당 포차', speech: '사극 말투 "~하오", "~구려", 고사성어를 하나씩 섞음', greeting: '어서 오시오. 비 오는 밤엔 막걸리와 이야기가 제격이구려.', look: { skin: '#eec39a', hair: '#1a1a1a', hairStyle: 'bun', outfit: '#f8f9fa', apron: null, accessory: 'hat', accessoryColor: '#212529', height: 1.05, eyes: 'line' }, tarp: '#495057', signColor: '#ffe8cc' } },
  { k: ['고양이', '냥', '동물'], p: { name: '냥 사장', stallName: '야옹 포차', speech: '문장 끝에 "~냥"을 붙이는 반말, 느긋함', greeting: '어서 오라냥. 따뜻한 데 앉으라냥.', look: { skin: '#ffe0c7', hair: '#ffa94d', hairStyle: 'short', outfit: '#ffd8a8', apron: '#ffffff', accessory: 'catears', accessoryColor: '#ffa94d', height: 0.95, eyes: 'dot' }, tarp: '#ffa94d', signColor: '#5c3d00' } },
  { k: ['무당', '신점', '점쟁이', '신비', '보살'], p: { name: '달빛 보살', stallName: '신령 포차', speech: '신비로운 존댓말, "보이네요…", 말끝을 흐리며 뜸 들임', greeting: '어서 와요… 들어오기 전부터 기운이 보였어요.', look: { skin: '#f2c9a0', hair: '#1a1a1a', hairStyle: 'long', outfit: '#c92a2a', apron: null, accessory: 'hanbok', accessoryColor: '#5f3dc4', height: 1, eyes: 'line' }, tarp: '#862e9c', signColor: '#ffe066' } },
  { k: ['직장', '팀장', '선배', '회사', '꼰대', 'MZ'], p: { name: '김팀장', stallName: '퇴근 포차', speech: '현실적인 직장 선배 반말, "야 그거 내가 해봤는데"로 시작하곤 함', greeting: '야, 퇴근했냐. 오늘 하루 어땠냐, 앉아봐.', look: { skin: '#f2c9a0', hair: '#343a40', hairStyle: 'short', outfit: '#495057', apron: null, accessory: 'glasses', accessoryColor: '#000000', height: 1.05, eyes: 'dot' }, tarp: '#2f9e44', signColor: '#ffffff' } },
];

export function offlinePersona(prompt) {
  const s = String(prompt);
  const hit = PRESETS.find((x) => x.k.some((k) => s.includes(k)));
  if (hit) return { ...hit.p, offline: true };
  // 매칭 없으면: 프롬프트 단어로 이름만 반영
  const word = s.replace(/[^가-힣a-zA-Z ]/g, '').trim().split(/\s+/).slice(-1)[0] || '사장';
  return { ...DEFAULT_PERSONA, name: `${word.slice(0, 4)} 사장`, stallName: `${word.slice(0, 4)} 포차`, speech: `${s.slice(0, 40)} 느낌의 말투`, greeting: `어서 와요. 오늘은 ${word.slice(0, 6)} 스타일로 모실게요.`, offline: true };
}

const okHex = (v, d) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : d);
export async function makePersona(prompt) {
  try {
    const p = await post('/api/persona', { prompt }, 30000);
    if (!p || !p.name || !p.look) throw new Error('bad');
    const d = DEFAULT_PERSONA.look;
    p.look = {
      skin: okHex(p.look.skin, d.skin), hair: okHex(p.look.hair, d.hair), hairStyle: p.look.hairStyle || 'short', outfit: okHex(p.look.outfit, d.outfit),
      apron: p.look.apron ? okHex(p.look.apron, null) : null, accessory: p.look.accessory || 'none', accessoryColor: okHex(p.look.accessoryColor, '#ffffff'),
      height: Math.min(1.15, Math.max(0.9, +p.look.height || 1)), eyes: p.look.eyes === 'line' ? 'line' : 'dot',
    };
    p.tarp = okHex(p.tarp, '#ff7a1a'); p.signColor = okHex(p.signColor, '#fff3d6');
    p.name = String(p.name).slice(0, 8); p.stallName = String(p.stallName || p.name).slice(0, 10);
    ['speech', 'catchphrases', 'backstory', 'greeting', 'sample'].forEach((k) => { if (p[k]) p[k] = String(p[k]).slice(0, 200); });
    return p;
  } catch { return offlinePersona(prompt); }
}

// ---------------- 상담 ----------------
const TOPICS = [
  { k: ['진로', '취업', '전공', '편입', '시험', '공부', '면접', '합격'], t: 'career' },
  { k: ['연애', '남친', '여친', '썸', '헤어', '좋아하', '연락', '이별'], t: 'love' },
  { k: ['돈', '월급', '알바', '용돈', '투자', '주식'], t: 'money' },
  { k: ['친구', '관계', '가족', '엄마', '아빠', '사람'], t: 'people' },
  { k: ['지쳐', '힘들', '피곤', '번아웃', '무기력', '우울', '불안', '잠'], t: 'tired' },
  { k: ['운세', '오늘'], t: 'today' },
];
const CRISIS = ['죽고', '자살', '사라지고', '끝내고 싶', '자해'];
const EL_TRAIT = {
  wood: '뻗어나가려는 나무 기운', fire: '타오르는 불 기운', earth: '묵직하게 버티는 흙 기운', metal: '날카롭게 정리하는 쇠 기운', water: '깊게 생각하는 물 기운',
};
const ADVICE = {
  career: (s) => `${EL_TRAIT[s.dominant]}이 강해서 한 번 정하면 끝까지 가는 편인데, 지금 막힌 건 방향보다 속도 문제로 보여. 오늘은 할 일을 딱 하나만 적어보고 그것만 끝내.`,
  love: (s) => `${ELEMENTS[s.weak].ko} 기운이 약한 사주라 마음을 ${s.weak === 'fire' ? '표현하는 게' : s.weak === 'water' ? '기다리는 게' : '정리하는 게'} 서툴 수 있어. 상대 마음을 맞히려 하지 말고, 내가 원하는 걸 한 문장으로 먼저 말해봐.`,
  money: (s) => `돈 문제는 사주보다 숫자가 정확해. 다만 ${EL_TRAIT[s.dominant]}이 강하면 한 번에 크게 움직이려는 경향이 있으니, 큰 결정은 하루 자고 정해. 투자 같은 건 꼭 전문가랑 상의하고.`,
  people: (s) => `일간이 ${s.dayMaster.stem}${ELEMENTS[s.dayMaster.element].ko}, ${s.dayMaster.desc.split('.')[0]} 같은 사람이야. 사람 때문에 지칠 땐 거리를 반 걸음만 둬도 숨이 쉬어져.`,
  tired: (s) => `${ELEMENTS[s.weak].ko} 기운이 약하면 쉽게 방전돼. 오늘은 뭘 더 하지 말고, ${snackFor(s.weak).name} 같은 따뜻한 거 먹고 일찍 자. 그것도 큰일 한 거야.`,
  today: () => '',
  etc: (s) => `${EL_TRAIT[s.dominant]}이 센 사람은 생각이 한쪽으로 몰리기 쉬워. 지금 고민을 종이에 한 줄로 줄여보면, 의외로 답이 보일 거야.`,
};

export function styleize(text, persona) {
  const sp = persona.speech || '';
  if (/냥/.test(sp)) return text.replace(/([가-힣])([.!?])/g, '$1냥$2');
  if (/부산|경상/.test(sp)) return `마, ${text.replace(/거야\./g, '기다.').replace(/해\./g, '해라.')} 됐다 고마, 묵고 가라.`;
  if (/전라|할매/.test(sp)) return `${text.replace(/거야\./g, '거여.').replace(/해\./g, '혀잉.')}`;
  if (/하오|사극|선비/.test(sp)) return `${text.replace(/거야\./g, '것이오.').replace(/해\./g, '하시오.').replace(/봐\./g, '보시오.')} 과유불급이라 했소.`;
  if (/존댓말/.test(sp)) return text.replace(/나왔어\./g, '나왔어요.').replace(/줄게\./g, '줄게요.').replace(/딱이야\./g, '딱이에요.').replace(/마셔\./g, '드세요.').replace(/먹어\./g, '드세요.').replace(/맵다\./g, '매워요.').replace(/돼\./g, '돼요.').replace(/거야\./g, '거예요.').replace(/거야\./g, '거예요.').replace(/해\./g, '해요.').replace(/봐\./g, '봐요.').replace(/자\./g, '자요.').replace(/돼\./g, '돼요.').replace(/있어\./g, '있어요.');
  return text;
}

export function offlineCounsel({ persona, saju, fortune, message }) {
  const m = String(message);
  if (CRISIS.some((k) => m.includes(k))) {
    return '그런 마음까지 들 만큼 많이 힘들었구나. 지금은 사주 얘기보다 네가 더 중요해. 혼자 견디지 말고 자살예방상담전화 109(24시간)나 믿는 사람한테 지금 바로 연락해줘. 여기 자리는 계속 비워둘게.';
  }
  const topic = (TOPICS.find((x) => x.k.some((k) => m.includes(k))) || { t: 'etc' }).t;
  let body;
  const ym = m.match(/(19[3-9]\d|20\d\d|21\d\d)\s*년/);
  const yr = /내년/.test(m) ? new Date().getFullYear() + 1 : /올해|금년/.test(m) ? new Date().getFullYear() : /후년/.test(m) ? new Date().getFullYear() + 2 : ym ? Number(ym[1]) : null;
  if (yr && saju?.pillars) {
    const line = yearLuck(saju, yr).replace(/^\d+년 /, '');
    return styleize(`${yr}년은 ${line.split(' — ')[0]}의 해야. 그 해엔 ${line.split(' — ')[1]}이 들어와. 흐름을 타되 너무 몰아붙이진 마.`, persona);
  }
  if (topic === 'today') body = `오늘은 ${fortune.relPlain || fortune.나와의관계 || '평범한 날'}이야. ${fortune.tone || fortune.풀이 || ''}`;
  else body = ADVICE[topic](saju);
  const snack = snackFor(saju.weak);
  const tail = topic === 'tired' ? '' : ` 안주는 ${snack.name} 어때, ${snack.why}.`;
  return styleize(`${body}${tail}`, persona);
}

export async function counsel(args, raw) {
  if (!raw) args = { ...args };
  try {
    const r = await post('/api/counsel', args, 30000);
    if (!r.text) throw new Error('empty');
    return { text: r.text, offline: false };
  } catch {
    if (!raw) return { text: '', offline: true };
    return { text: offlineCounsel({ ...args, saju: raw }), offline: true };
  }
}

// 거리의 포차 8곳 기본 사장님 (다양한 분위기)
const STALL_KEYS = ['할머니', '부산', '고양이', '스님', null, '선비', '아이돌', '직장'];
export function stallDefault(i) {
  const k = STALL_KEYS[i % STALL_KEYS.length];
  const p = k ? PRESETS.find((x) => x.k.includes(k)).p : DEFAULT_PERSONA;
  return JSON.parse(JSON.stringify(p));
}

// ---------------- 옆자리 손님 ----------------
const NB = [
  { k: ['안녕', '하이', '반가'], r: ['어 안녕하세요! 여기 처음 오셨어요?', '반가워요~ 여기 어묵 국물 진짜 맛있어요.'] },
  { k: ['뭐 마', '술', '소주', '막걸리', '맥주'], r: ['저는 오늘 소주요. 하루가 좀 길었거든요.', '막걸리 마셔봐요, 비 오는 날엔 막걸리지.'] },
  { k: ['붕어빵', '팥', '슈크림'], r: ['붕어빵은 무조건 팥이죠. 슈붕파세요?', '저기 혜화역 쪽 붕어빵집 진짜 맛있어요.'] },
  { k: ['연극', '공연', '버스킹'], r: ['아까 마로니에 버스킹 봤어요? 노래 좋던데.', '저 방금 소극장에서 연극 보고 나왔어요!'] },
  { k: ['사주', '운세', '상담'], r: ['여기 사장님 사주 잘 봐요. 저도 아까 봤는데 소름.', '저 올해 운 별로라는데 그냥 술이나 마시려고요 ㅎㅎ'] },
  { k: ['힘들', '지쳐', '우울', '피곤'], r: ['에고… 오늘 많이 힘드셨구나. 사장님한테 얘기 한번 해봐요, 은근 위로돼요.', '저도요. 그래도 여기 앉아 있으니까 좀 낫네요.'] },
];
export function offlineNeighbor(message) {
  const m = String(message);
  const hit = NB.find((x) => x.k.some((k) => m.includes(k)));
  const pool = hit ? hit.r : ['하하 그러게요. 여기 분위기 좋죠?', '오 진짜요? 더 얘기해줘요.', '그쵸, 이런 날엔 포차가 최고예요.'];
  return pool[Math.floor(Math.random() * pool.length)];
}
export async function neighbor(args) {
  try { const r = await post('/api/neighbor', args, 20000); if (!r.text) throw new Error('empty'); return r.text; }
  catch { return offlineNeighbor(args.message); }
}

// 금칙어 가리기 (간단)
const BAD = ['시발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '좆', '개새', '닥쳐', '꺼져', '미친놈', '미친년', '애미', '느금'];
export function cleanChat(t) {
  let s = String(t).replace(/\s+/g, ' ').trim().slice(0, 80);
  BAD.forEach((w) => { s = s.split(w).join('♡'.repeat(w.length)); });
  return s;
}

// ---------------- 즉석 연극 ----------------
export async function makePlay(topic, mood) {
  try {
    const j = await post('/api/play', { topic, mood }, 30000);
    if (!j?.lines?.length || !j?.cast?.length) throw new Error('bad');
    const n = Math.min(3, j.cast.length);
    return {
      title: String(j.title || '즉석 연극').slice(0, 14),
      cast: j.cast.slice(0, n).map((c) => ({ name: String(c.name || '배우').slice(0, 10) })),
      lines: j.lines.slice(0, 10).map((l) => ({ who: Math.max(0, Math.min(n - 1, +l.who || 0)), text: cleanChat(String(l.text || '…')).slice(0, 60), act: ['talk', 'wave', 'cheer', 'walk'].includes(l.act) ? l.act : 'talk' })),
    };
  } catch { return null; }
}

// ---------------- 거리 테마 ----------------
const THEME_PRESETS = [
  { k: ['캠퍼스', '대학', '학교', '개강', '축제 기간', '동아리'], t: { title: '2030 캠퍼스의 밤', weather: 'clear', sky: ['#060a1c', '#24305a'], fog: '#141a30', bulb: '#fff3c4', decor: 'none', banner: '대학로 캠퍼스 나이트', bannerBg: '#7a1f2b', outfits: ['#7a1f2b', '#1c4e9c', '#f1f3f5', '#2b8a3e', '#495057'], accessory: 'none', mood: 'festive', busker: '과제 끝난 사람 박수!', set: 'campus', gate: '2030 대학교 정문', backdrop: '중앙도서관 · 24시 열람실', booths: ['동아리 박람회', '학생회 부스', '과잠 판매', '중고책 장터'], signs: ['북카페', '복사·제본', '학식당', '과방', '문구점', '스터디카페', '자취방 부동산', '분식집', '노래연습장', '편의점', '복학생 PC방', '인쇄소', '빨래방'], signColors: ['#ffd43b', '#4dabf7', '#ff8787'], buildingColor: '#2a2a3a', ground: '#5f6b5a', leaves: ['#2f9e44', '#40c057', '#5c940d'] } },
  { k: ['한옥', '전통', '조선', '궁'], t: { title: '한옥 마당의 밤', weather: 'clear', sky: ['#06060f', '#2a2238'], fog: '#18141f', bulb: '#ffcf8a', decor: 'lanterns', banner: '대학로 전통 야행', bannerBg: '#2b2b30', outfits: ['#f8f0e3', '#b02a2a', '#2b4a8a', '#e8c070'], accessory: 'hat', mood: 'warm', busker: '국악 한 곡 갑니다', set: 'hanok', gate: '혜화 한옥문', backdrop: '대학로 한옥 마당', booths: ['전통차', '한지 공방', '탈 만들기', '떡 체험'], signs: ['찻집', '한지방', '전통주', '서예원', '떡집', '목공방', '도자기', '한복대여', '국악당', '약과집', '부채방', '책방', '주막'], signColors: ['#ffe8b0', '#ffb3a0'], buildingColor: '#3a2e28', ground: '#8a7a64', leaves: ['#d9822b', '#b5651d', '#e8a33d'] } },
  { k: ['사이버', '미래', '네온', 'sf', 'SF', '로봇'], t: { title: '네오 혜화 2077', weather: 'rain', sky: ['#05001a', '#2a0a4a'], fog: '#1a0a2e', bulb: '#ff3df0', decor: 'none', banner: 'NEO HYEHWA', bannerBg: '#3b1a6b', outfits: ['#00e5ff', '#ff3df0', '#14142a', '#7cff6b'], accessory: 'glasses', mood: 'festive', busker: '전자기타 모드 ON', set: 'cyber', gate: 'NEO HYEHWA', backdrop: 'NEO HYEHWA 2077', booths: ['로봇 수리', '홀로그램 사주', '전뇌 라면', '드론 배달'], signs: ['사이버 사주', 'AI 노래방', '로봇카페', '홀로PC방', '뉴럴 편의점', '드론택배', '메타 극장', '전뇌분식', 'VR방', '칩 수리', '네온바', '클론 미용실', '우주정거장'], signColors: ['#00e5ff', '#ff3df0', '#7cff6b'], buildingColor: '#14142a', ground: '#1a1a2e', leaves: ['#7048e8', '#00e5ff', '#ff3df0'] } },
  { k: ['시장', '야시장', '장터'], t: { title: '대학로 야시장', weather: 'clear', sky: ['#0a0612', '#3a2418'], fog: '#201410', bulb: '#ffb86b', decor: 'lanterns', banner: '대학로 야시장 오픈', bannerBg: '#d9480f', outfits: ['#e8590c', '#f59f00', '#495057', '#f1f3f5'], accessory: 'headscarf', mood: 'festive', busker: '시장 노래 갑니다!', set: 'market', gate: '대학로 야시장', backdrop: '대학로 야시장', booths: ['꼬치구이', '빈대떡', '수제 액세서리', '중고 레코드'], signs: ['빈대떡', '순대국', '꽈배기', '어묵집', '호떡', '수산', '청과', '반찬가게', '방앗간', '닭강정', '분식', '잡화', '포목점'], signColors: ['#ffd43b', '#ff922b'], buildingColor: '#3a2a22', ground: '#7a5a48', leaves: [] } },
  { k: ['바다', '해변', '여름 바다', '비치'], t: { title: '혜화 비치', weather: 'clear', sky: ['#020a1c', '#1a4a6a'], fog: '#0a1a2a', bulb: '#a5f3ff', decor: 'balloons', banner: '혜화역에 바다가 왔다', bannerBg: '#1c7ed6', outfits: ['#ffd43b', '#4dabf7', '#ff8787', '#ffffff'], accessory: 'hat', mood: 'festive', busker: '파도 소리 들리죠?', set: 'beach', gate: '혜화 비치', backdrop: '혜화 비치', booths: ['튜브 대여', '수박 주스', '조개구이', '선크림'], signs: ['횟집', '서핑샵', '빙수', '조개구이', '비치펍', '튜브대여', '해물라면', '수영복', '아이스크림', '선베드', '물회', '편의점', '등대카페'], signColors: ['#66d9e8', '#ffd43b'], buildingColor: '#e8e0c8', ground: '#d8c08a', leaves: ['#2b8a3e', '#40c057'] } },
  { k: ['숲', '캠핑', '산'], t: { title: '마로니에 숲 캠핑', weather: 'embers', sky: ['#020a06', '#12301e'], fog: '#0a1a10', bulb: '#ffe066', decor: 'none', banner: '도심 속 숲 캠핑', bannerBg: '#2b5a2a', outfits: ['#2b8a3e', '#8a5a35', '#495057', '#e8590c'], accessory: 'beanie', mood: 'warm', busker: '모닥불 노래!', set: 'forest', gate: '마로니에 숲길', backdrop: '', booths: ['마시멜로', '랜턴 대여', '텐트', '숲 해설'], signs: ['캠핑장', '장작', '산장', '등산용품', '모닥불', '버섯집', '산채비빔밥', '숲카페', '목공소', '약초방', '야영장', '오두막', '숲속 편의점'], signColors: ['#d8f5a2', '#ffd43b'], buildingColor: '#2a2018', ground: '#3a4a2a', leaves: ['#2b6a3a', '#1b4d2b', '#40c057'] } },
  { k: ['눈', '겨울', '첫눈'], t: { title: '첫눈 오는 대학로', weather: 'snow', sky: '#0a1024,#3a4a6a'.split(','), fog: '#1a2236', bulb: '#dff1ff', decor: 'snowmen', banner: '첫눈 오는 날 마로니에에서', bannerBg: '#1c7ed6', outfits: ['#f8f9fa', '#ff6b6b', '#4dabf7', '#ffd43b', '#868e96'], accessory: 'beanie', mood: 'snow', busker: '첫눈엔 이 노래죠' } },
  { k: ['벚꽃', '봄'], t: { title: '봄밤 벚꽃 축제', weather: 'petals', sky: '#140a1e,#4a2a4a'.split(','), fog: '#2a1a2a', bulb: '#ffc2d6', decor: 'flowers', banner: '대학로 봄밤 벚꽃 축제', bannerBg: '#e64980', outfits: ['#ffdeeb', '#fcc2d7', '#ffffff', '#d0ebff', '#fff3bf'], accessory: 'flower', mood: 'warm', busker: '봄노래 갑니다' } },
  { k: ['할로윈', '호박', '귀신'], t: { title: '대학로 할로윈', weather: 'fog', sky: '#0a0514,#3a1a3a'.split(','), fog: '#24122a', bulb: '#ff922b', decor: 'pumpkins', banner: '해피 할로윈 대학로', bannerBg: '#5f3dc4', outfits: ['#212529', '#7048e8', '#ff922b', '#2b8a3e', '#c92a2a'], accessory: 'hat', mood: 'festive', busker: '으스스한 거 한 곡!' } },
  { k: ['크리스마스', '성탄', '산타'], t: { title: '크리스마스 이브', weather: 'snow', sky: '#050a18,#2a2a4a'.split(','), fog: '#1a1a2e', bulb: '#ffe066', decor: 'xmas', banner: '메리 크리스마스 대학로', bannerBg: '#c92a2a', outfits: ['#c92a2a', '#2b8a3e', '#ffffff', '#ffd43b'], accessory: 'beanie', mood: 'snow', busker: '캐럴 느낌으로!' } },
  { k: ['축제', '여름', '불꽃', '신나'], t: { title: '한여름 밤 축제', weather: 'embers', sky: '#0a0518,#4a1a2a'.split(','), fog: '#2a1414', bulb: '#ff8787', decor: 'lanterns', banner: '대학로 한여름 밤 축제', bannerBg: '#f08c00', outfits: ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#f783ac'], accessory: 'none', mood: 'festive', busker: '다 같이 박수!', set: 'festival', gate: '한여름 밤 축제', booths: ['솜사탕', '사격 게임', '페이스 페인팅', '물풍선'] } },
  { k: ['비', '재즈', '감성'], t: { title: '비 오는 재즈 밤', weather: 'rain', sky: '#02040c,#16203a'.split(','), fog: '#0a1020', bulb: '#ffd8a8', decor: 'none', banner: '비 오는 날엔 대학로 재즈', bannerBg: '#343a40', outfits: ['#495057', '#343a40', '#1864ab', '#862e9c'], accessory: 'hat', mood: 'sad', busker: '비 오는 날 노래' } },
];
export function offlineTheme(prompt) {
  const s = String(prompt);
  const hit = THEME_PRESETS.find((x) => x.k.some((k) => s.includes(k)));
  const t = hit ? hit.t : { ...THEME_PRESETS.find((p) => p.k.includes('축제')).t, title: s.slice(0, 12) || '거리 축제', banner: s.slice(0, 16) || '대학로 거리 축제', decor: 'balloons', set: 'festival', gate: s.slice(0, 12) || '거리 축제', booths: [s.slice(0, 10) || '축제 부스'] };
  return JSON.parse(JSON.stringify(t));
}
export async function makeTheme(prompt) {
  try {
    const t = await post('/api/theme', { prompt }, 30000);
    if (!t?.title) throw new Error('bad');
    const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : d);
    return {
      title: String(t.title).slice(0, 14), weather: ['clear', 'rain', 'snow', 'fog', 'petals', 'leaves', 'embers'].includes(t.weather) ? t.weather : 'clear',
      sky: [hex(t.sky?.[0], '#05060f'), hex(t.sky?.[1], '#2a1f45')], fog: hex(t.fog, '#1a1424'), bulb: hex(t.bulb, '#ffd89a'),
      decor: ['none', 'snowmen', 'pumpkins', 'xmas', 'lanterns', 'flowers', 'balloons'].includes(t.decor) ? t.decor : 'balloons',
      banner: cleanChat(String(t.banner || t.title)).slice(0, 18), bannerBg: hex(t.bannerBg, '#c92a2a'),
      outfits: (Array.isArray(t.outfits) ? t.outfits : []).map((c) => hex(c, null)).filter(Boolean).slice(0, 6),
      accessory: ['none', 'beanie', 'hat', 'catears', 'flower', 'crown', 'headscarf', 'glasses'].includes(t.accessory) ? t.accessory : 'none',
      mood: ['warm', 'sad', 'festive', 'snow'].includes(t.mood) ? t.mood : 'warm', busker: cleanChat(String(t.busker || '')).slice(0, 24),
      set: ['none', 'campus', 'hanok', 'cyber', 'market', 'beach', 'forest', 'festival'].includes(t.set) ? t.set : 'festival',
      gate: cleanChat(String(t.gate || t.title)).slice(0, 14), backdrop: cleanChat(String(t.backdrop || '')).slice(0, 18),
      booths: (Array.isArray(t.booths) ? t.booths : []).map((x) => cleanChat(String(x)).slice(0, 12)).filter(Boolean).slice(0, 4),
      signs: (Array.isArray(t.signs) ? t.signs : []).map((x) => cleanChat(String(x)).slice(0, 8)).filter(Boolean).slice(0, 13),
      signColors: (Array.isArray(t.signColors) ? t.signColors : []).map((c) => hex(c, null)).filter(Boolean).slice(0, 5),
      buildingColor: hex(t.buildingColor, null), ground: hex(t.ground, null),
      leaves: (Array.isArray(t.leaves) ? t.leaves : []).map((c) => hex(c, null)).filter(Boolean).slice(0, 5),
    };
  } catch { return offlineTheme(prompt); }
}
