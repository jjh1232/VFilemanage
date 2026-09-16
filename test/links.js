'use strict';
/*
 * 링크·hreflang·사이트맵·언어 목록 전수 검사.
 *
 * 왜 필요한가 — 페이지가 세 장이고 자산 링크가 전부 상대 경로다. 깨져도 화면에는
 * 아무 표시가 없고, 더 나쁜 것은 「살아 있지만 다른 언어를 가리키는」 링크다.
 * 영어 페이지 푸터가 한국어 약관으로 가도 브라우저는 멀쩡히 연다.
 *
 * 언어 목록은 세 군데에 흩어져 있다 — 폴더, worker 의 LANGS, 각 페이지의 hreflang.
 * 하나만 늘리면 조용히 어긋난다. worker 의 LANGS 에만 언어를 적으면 그 언어의
 * 브라우저 방문자 전원이 없는 주소로 302 를 맞는데, 한국어로 보는 사람에게는
 * 아무 일도 안 일어나서 눈으로는 못 잡는다.
 *
 * 이 도구에만 있는 검사가 하나 더 있다 — 다운로드 링크다. 파일은 GitHub Releases 에
 * 있고 파일명에 버전이 박혀 있어서, 버전을 올릴 때 세 언어판을 같이 고쳐야 한다.
 * 한 장만 옛 버전을 가리켜도 그 언어 방문자는 404 를 받는다.
 *
 * 쓰기:  npm run check:links     (배포 전에 반드시)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'site');
const ORIGIN = 'https://prelaps.com/vfile';
const LANGS = ['ko', 'en', 'ja'];
const XDEFAULT = 'en';

/** 배포된 릴리스와 맞아야 하는 자산. 버전을 올리면 여기와 세 페이지를 같이 고친다. */
const VERSION = '1.0.0';
const ASSETS = [
  `VFilemanage-${VERSION}-setup.exe`,
  `VFilemanage-${VERSION}-win.zip`,
];
const RELEASE_BASE = `https://github.com/jjh1232/VFilemanage/releases/download/v${VERSION}/`;

let fails = 0;
const bad = (file, msg) => { fails++; console.log('  ✗ ' + file + ' — ' + msg); };

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// ── 언어 목록이 세 군데에서 같은지 ────────────────────────────
// 이 검사가 제일 중요하다. 나머지는 눈으로도 언젠가 걸리지만
// 이건 다른 언어 사용자에게만 터져서 영영 모른다.
{
  const rel = '(언어 목록)';

  for (const l of LANGS) {
    if (!exists(`${l}/index.html`)) bad(rel, `site/${l}/index.html 이 없다`);
  }

  const worker = fs.readFileSync(path.join(__dirname, '..', 'worker', 'index.js'), 'utf8');
  const wLangs = (worker.match(/const LANGS = \[([^\]]*)\]/) || [])[1];
  const wList = (wLangs || '').split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean);
  if (wList.join() !== LANGS.join()) {
    bad('worker/index.js', `LANGS 가 [${wList}] 다 — [${LANGS}] 여야 한다`);
  }

  const fallback = (worker.match(/const FALLBACK = '([^']+)'/) || [])[1];
  if (fallback !== XDEFAULT) {
    bad('worker/index.js', `FALLBACK 이 '${fallback}' 다 — x-default 와 같은 '${XDEFAULT}' 여야 한다`);
  }
}

// ── 페이지별 검사 ────────────────────────────────────────────
for (const lang of LANGS) {
  const rel = `${lang}/index.html`;
  if (!exists(rel)) continue;
  const html = read(rel);

  if (!new RegExp(`<html lang="${lang}"`).test(html)) {
    bad(rel, `<html lang="${lang}"> 가 아니다`);
  }

  // canonical 은 반드시 자기 자신. 다른 언어를 가리키면 그 언어가 색인에서 사라진다.
  const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (canon !== `${ORIGIN}/${lang}/`) {
    bad(rel, `canonical 이 ${canon} 다 — ${ORIGIN}/${lang}/ 여야 한다`);
  }

  // hreflang 은 세 페이지가 전체 목록을 동일하게 갖는다. 하나라도 빠지면 구글이 무시한다.
  for (const l of LANGS) {
    const want = `<link rel="alternate" hreflang="${l}" href="${ORIGIN}/${l}/">`;
    if (!html.includes(want)) bad(rel, `hreflang="${l}" 줄이 없거나 주소가 다르다`);
  }
  const wantX = `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/${XDEFAULT}/">`;
  if (!html.includes(wantX)) bad(rel, `hreflang="x-default" 가 없거나 ${XDEFAULT} 를 안 가리킨다`);

  // og:url 도 자기 자신이어야 공유했을 때 맞는 언어가 열린다.
  const og = (html.match(/<meta property="og:url" content="([^"]+)"/) || [])[1];
  if (og !== `${ORIGIN}/${lang}/`) bad(rel, `og:url 이 ${og} 다`);

  // 제목·설명이 언어마다 달라야 한다. 같으면 중복 페이지로 판정된다.
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (!title.trim()) bad(rel, '<title> 이 비어 있다');

  // 자산은 전부 상대 경로. 절대 경로는 도메인 루트로 풀려 깨진다 — 도구는 루트에 없다.
  //
  // 예외는 **허브 페이지**다. 허브는 도메인 루트에 있으므로 그쪽으로 가는 링크는
  // 절대 경로인 것이 맞다 (헌법 §8 — 정책 문서는 허브에 하나씩). 상대 경로로 적으면
  // /vfile/ 기준으로 풀려 오히려 깨진다.
  //
  // 이 예외가 privacy 앵커 하나뿐이라 푸터에 홈·약관·문의를 넣을 수가 없었다.
  // imagesquish·race 는 넷을 다 갖고 있는데 vfile 만 방침 하나였던 원인이다.
  // 애드센스는 도메인 단위 심사라 한 도구의 누락이 전체에 걸린다.
  const HUB_PAGES = ['about', 'privacy', 'terms', 'contact'];
  const hubLink = new RegExp(`^/(${LANGS.join('|')})(/(${HUB_PAGES.join('|')}))?(#[a-zA-Z0-9_-]+)?$`);
  for (const m of html.matchAll(/(?:src|href)="(\/[^/][^"]*)"/g)) {
    const href = m[1];
    if (hubLink.test(href)) continue;
    bad(rel, `절대 경로 ${href} — 상대 경로여야 한다`);
  }

  // 허브로 돌아가는 링크가 있어야 한다. 없으면 크롤러에게 막다른 길이고,
  // 방문자도 이 도구에서 사이트의 나머지로 갈 방법이 없다.
  if (!html.includes(`href="/${lang}"`)) {
    bad(rel, `푸터에 허브 홈(/${lang}) 링크가 없다`);
  }

  // 약관·문의도 모든 페이지에서 닿아야 한다 (헌법 §9).
  for (const page of ['terms', 'contact']) {
    if (!html.includes(`/${lang}/${page}`)) {
      bad(rel, `푸터에 /${lang}/${page} 링크가 없다`);
    }
  }

  // 상대 경로로 부른 자산이 실제로 있는지.
  for (const m of html.matchAll(/(?:src|href)="\.\.\/([^"#?]+)"/g)) {
    const target = m[1];
    if (LANGS.some((l) => target === `${l}/`)) continue;   // 언어 전환 링크
    if (!exists(target)) bad(rel, `../${target} 가 site/ 에 없다`);
  }

  // 푸터의 정책 링크는 자기 언어를 가리켜야 한다. 영어 페이지가 한국어 약관으로 가면
  // 브라우저는 멀쩡히 열어주고 아무도 모른다.
  if (!html.includes(`/${lang}/privacy#vfile`)) {
    bad(rel, `푸터 정책 링크가 /${lang}/privacy#vfile 가 아니다`);
  }

  // 다운로드 링크 — 두 자산이 정확한 버전을 가리키는지.
  for (const asset of ASSETS) {
    if (!html.includes(RELEASE_BASE + asset)) {
      bad(rel, `다운로드 링크에 ${asset} 가 없다 (버전 v${VERSION})`);
    }
  }
  // 옛 버전이 섞여 있으면 그 언어만 404 가 된다.
  for (const m of html.matchAll(/releases\/download\/v([\d.]+)\//g)) {
    if (m[1] !== VERSION) bad(rel, `다운로드 링크에 옛 버전 v${m[1]} 가 남아 있다`);
  }
}

// ── 사이트맵 ─────────────────────────────────────────────────
{
  const rel = 'sitemap.xml';
  if (!exists(rel)) {
    bad(rel, '없다');
  } else {
    const xml = read(rel);
    for (const l of LANGS) {
      if (!xml.includes(`<loc>${ORIGIN}/${l}/</loc>`)) bad(rel, `${l} 언어판이 빠졌다`);
    }
    // 루트는 302 통로라 색인 대상이 아니다 (헌법 §5).
    if (xml.includes(`<loc>${ORIGIN}/</loc>`)) {
      bad(rel, '도구 루트가 들어 있다 — 302 통로라 색인 대상이 아니다');
    }

    // 사이트맵에 적혔는데 파일이 없으면 구글이 404 를 받는다. 언어판 세 줄만 보면
    // 글이 늘었을 때 이걸 못 잡는다 — 실제로 imagesquish 에서 배포가 여기서 멈췄다.
    //
    // 확장자 없는 주소는 자산 층이 .html 로 낸다 (html_handling: auto-trailing-slash).
    // canonical·사이트맵이 그 형태라 .html 을 붙여서도 찾아봐야 한다.
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const p = m[1].replace(ORIGIN + '/', '');
      const file = p === '' || p.endsWith('/') ? p + 'index.html' : p;
      if (!exists(file) && !exists(file + '.html')) {
        bad(rel, `없는 페이지를 가리킨다 ${m[1]}`);
      }
    }
  }
}

// ── 404 ──────────────────────────────────────────────────────
{
  const rel = '404.html';
  if (!exists(rel)) {
    bad(rel, '없다 — 없으면 없는 주소가 정상 페이지로 색인된다');
  } else {
    const html = read(rel);
    if (!/<meta name="robots" content="noindex">/.test(html)) bad(rel, 'noindex 가 없다');
    if (/<link rel="canonical"/.test(html)) bad(rel, 'canonical 이 있다 — 404 에는 달지 않는다');
  }
}

if (fails) {
  console.log(`\n실패 ${fails}건`);
  process.exit(1);
}
console.log('링크·hreflang·사이트맵 검사 통과');
