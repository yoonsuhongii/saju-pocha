// GPT 호출 (Vercel /api) + 오프라인 대체 규칙 (키가 없거나 미리보기 환경에서도 동작)
import { ELEMENTS, snackFor } from './saju.js';

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
  if (/존댓말/.test(sp)) return text.replace(/거야\./g, '거예요.').replace(/해\./g, '해요.').replace(/봐\./g, '봐요.').replace(/자\./g, '자요.').replace(/돼\./g, '돼요.').replace(/있어\./g, '있어요.');
  return text;
}

export function offlineCounsel({ persona, saju, fortune, message }) {
  const m = String(message);
  if (CRISIS.some((k) => m.includes(k))) {
    return '그런 마음까지 들 만큼 많이 힘들었구나. 지금은 사주 얘기보다 네가 더 중요해. 혼자 견디지 말고 자살예방상담전화 109(24시간)나 믿는 사람한테 지금 바로 연락해줘. 여기 자리는 계속 비워둘게.';
  }
  const topic = (TOPICS.find((x) => x.k.some((k) => m.includes(k))) || { t: 'etc' }).t;
  let body;
  if (topic === 'today') body = `오늘은 ${fortune.rel}의 날이야. ${fortune.tone}`;
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
