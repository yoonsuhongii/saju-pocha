// 간이 만세력: 생년월일시 → 사주팔자(년·월·일·시주), 오행 분포, 오늘의 일진
// ※ 절기 경계는 평균 날짜로 근사 (정밀 만세력과 하루 정도 차이 날 수 있음)

export const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const STEMS_H = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const BRANCHES_H = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

export const ELEMENTS = {
  wood: { ko: '목', h: '木', name: '나무', color: '#3ddc84', weather: '봄비 내리는 초록 밤' },
  fire: { ko: '화', h: '火', name: '불', color: '#ff5d3a', weather: '등불이 타오르는 따뜻한 밤' },
  earth: { ko: '토', h: '土', name: '흙', color: '#e0a65a', weather: '노을빛 안개 낀 밤' },
  metal: { ko: '금', h: '金', name: '쇠', color: '#e8eef7', weather: '첫눈과 달빛' },
  water: { ko: '수', h: '水', name: '물', color: '#4dabf7', weather: '장맛비 쏟아지는 밤' },
};
const STEM_EL = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
const BRANCH_EL = ['water', 'earth', 'wood', 'wood', 'earth', 'fire', 'fire', 'earth', 'metal', 'metal', 'earth', 'water'];
// 상생: 목→화→토→금→수→목
const GEN = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
// 상극: 목→토→수→화→금→목
const CTRL = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

// 일간(나를 상징하는 글자) 성향 — 직접 작성한 짧은 설명
const DAY_MASTER = [
  '곧게 뻗는 큰 나무. 한번 정하면 끝까지 밀고 가는 뚝심이 있어요.',
  '덩굴과 꽃. 부드럽지만 어디서든 길을 찾아 뻗어가는 유연함이 있어요.',
  '한낮의 태양. 밝고 솔직해서 주변을 환하게 만들어요.',
  '촛불과 등불. 섬세하고 따뜻하게 한 사람을 끝까지 비춰줘요.',
  '큰 산. 묵직하고 믿음직해서 사람들이 기대러 와요.',
  '기름진 밭. 받아주고 키워내는 포용력이 있어요.',
  '단단한 바위와 칼. 결단력 있고 의리가 강해요.',
  '빛나는 보석. 예민한 만큼 감각이 날카롭고 완벽을 추구해요.',
  '넓은 바다와 강. 생각이 깊고 스케일이 커요.',
  '이슬과 빗물. 조용히 스며들어 사람 마음을 잘 읽어요.',
];

// 절기 시작일(양력, 평균) — 인월(寅)=입춘부터
const TERMS = [ // [월, 일, 지지 index]
  [1, 6, 1], [2, 4, 2], [3, 6, 3], [4, 5, 4], [5, 6, 5], [6, 6, 6],
  [7, 7, 7], [8, 8, 8], [9, 8, 9], [10, 8, 10], [11, 7, 11], [12, 7, 0],
];

const mod = (a, n) => ((a % n) + n) % n;
const pillar = (s, b) => ({ s, b, ko: STEMS[s] + BRANCHES[b], h: STEMS_H[s] + BRANCHES_H[b] });

function dayIndex(y, m, d) {
  // 1900-01-01 = 갑술(甲戌) 일 = 60갑자 index 10
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 1)) / 86400000);
  return mod(10 + days, 60);
}

/**
 * @param {{y:number,m:number,d:number,hour?:number|null}} b 양력 생년월일, 시(0~23, 모르면 null)
 */
export function calcSaju({ y, m, d, hour = null }) {
  // 년주: 입춘 전이면 전년도
  const beforeIpchun = m < 2 || (m === 2 && d < 4);
  const yy = beforeIpchun ? y - 1 : y;
  const yearP = pillar(mod(yy - 4, 10), mod(yy - 4, 12));

  // 월주: 절기 기준 지지, 년간으로 월간 결정 (갑기년 → 병인월 시작)
  let mb = 1; // 기본: 축월(1/6 이전이면 자월)
  let found = false;
  for (let i = TERMS.length - 1; i >= 0; i--) {
    const [tm, td, br] = TERMS[i];
    if (m > tm || (m === tm && d >= td)) { mb = br; found = true; break; }
  }
  if (!found) mb = 0; // 1월 6일 이전 → 자월(전년 12월 절기)
  const inStart = mod((yearP.s % 5) * 2 + 2, 10); // 인월의 천간
  const monthP = pillar(mod(inStart + mod(mb - 2, 12), 10), mb);

  // 일주
  const di = dayIndex(y, m, d);
  const dayP = pillar(di % 10, di % 12);

  // 시주 (자시 23~01)
  let hourP = null;
  if (hour !== null && hour !== undefined && !Number.isNaN(hour)) {
    const hb = mod(Math.floor((hour + 1) / 2), 12);
    const hs = mod((dayP.s % 5) * 2 + hb, 10);
    hourP = pillar(hs, hb);
  }

  const pillars = [yearP, monthP, dayP, hourP].filter(Boolean);
  const count = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  pillars.forEach((p) => { count[STEM_EL[p.s]]++; count[BRANCH_EL[p.b]]++; });
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0];
  const lacking = Object.entries(count).filter(([, n]) => n === 0).map(([k]) => k);
  const me = STEM_EL[dayP.s];

  return {
    pillars: { year: yearP, month: monthP, day: dayP, hour: hourP },
    animal: ANIMALS[yearP.b],
    dayMaster: { stem: STEMS[dayP.s], h: STEMS_H[dayP.s], element: me, desc: DAY_MASTER[dayP.s] },
    count, dominant, lacking, weak: lacking[0] || sorted[sorted.length - 1][0],
  };
}

/** 오늘의 일진과 나(일간)와의 관계 */
export function todayFortune(saju, date = new Date()) {
  const di = dayIndex(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const today = pillar(di % 10, di % 12);
  const tEl = STEM_EL[today.s];
  const me = saju.dayMaster.element;
  let rel, tone;
  if (tEl === me) { rel = '비견'; tone = '나와 같은 기운이 들어오는 날. 고집이 세지기 쉬우니 한 템포 쉬어가면 좋아요.'; }
  else if (GEN[tEl] === me) { rel = '인성'; tone = '나를 도와주는 기운이 들어오는 날. 배우고 쉬기에 좋아요.'; }
  else if (GEN[me] === tEl) { rel = '식상'; tone = '내 기운이 밖으로 흘러가는 날. 말하고 표현하면 풀려요.'; }
  else if (CTRL[me] === tEl) { rel = '재성'; tone = '내가 다루는 기운이 오는 날. 정리하고 실행하기 좋아요.'; }
  else { rel = '관성'; tone = '나를 다그치는 기운이 오는 날. 책임감이 커지니 너무 몰아붙이지 마세요.'; }
  return { today, todayEl: tEl, rel, tone };
}

/** 부족한 기운을 채워주는 안주 */
export function snackFor(el) {
  return {
    wood: { name: '부추전', why: '초록 기운(木)을 채워줘요' },
    fire: { name: '떡볶이', why: '매콤한 불 기운(火)을 채워줘요' },
    earth: { name: '계란말이', why: '노란 흙 기운(土)으로 마음을 다져줘요' },
    metal: { name: '두부김치', why: '하얀 쇠 기운(金)으로 정리를 도와줘요' },
    water: { name: '어묵탕', why: '따뜻한 국물(水)이 흐름을 풀어줘요' },
  }[el];
}

export const relation = (a, b) => (GEN[a] === b || GEN[b] === a ? '상생' : CTRL[a] === b || CTRL[b] === a ? '상극' : '비화');

export function sajuSummary(s) {
  const p = s.pillars;
  const el = (k) => `${ELEMENTS[k].ko}(${ELEMENTS[k].h}) ${s.count[k]}`;
  return {
    pillars: [p.year, p.month, p.day, p.hour].map((x) => (x ? x.ko : '모름')).join(' / '),
    dayMaster: `${s.dayMaster.stem}(${s.dayMaster.h}) ${ELEMENTS[s.dayMaster.element].name}`,
    elements: Object.keys(s.count).map(el).join(', '),
    dominant: ELEMENTS[s.dominant].ko, lacking: s.lacking.map((k) => ELEMENTS[k].ko).join(',') || '없음', animal: s.animal,
  };
}
