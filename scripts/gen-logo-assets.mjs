// flori 로고 자산 일괄 생성 (일회성). 실행: node scripts/gen-logo-assets.mjs
// 마크: F2 투톤 제스처 꽃. sharp 로 SVG→PNG 래스터.
import sharp from 'sharp';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROSE = '#A85475', PINK = '#E0739A', DEEP = '#8E3F5F';
const PETAL = 'M50 50 C 42 44 39 27 49 15 C 53 11 60 14 60 22 C 60 35 55 44 50 50 Z';

// 꽃 마크 inner markup (0..100 좌표, bbox 중심이 (50,50)이 되도록 translate(0 3.5))
function flower({mode}) {
  const fills = mode === 'white' ? [null, null, null, null, null] : [ROSE, PINK, ROSE, PINK, DEEP];
  let petals = '';
  for (let i = 0; i < 5; i++) {
    const f = mode === 'white' ? '#ffffff' : fills[i];
    petals += `<path d="${PETAL}" transform="rotate(${i * 72} 50 50)" fill="${f}"/>`;
  }
  const center =
    mode === 'white'
      ? `<circle cx="50" cy="50" r="6.5" fill="${PINK}"/>`
      : `<circle cx="50" cy="50" r="6" fill="#ffffff"/><circle cx="50" cy="50" r="3.2" fill="${ROSE}"/>`;
  return `<g transform="translate(0 3.5)">${petals}${center}</g>`;
}

// size px, bg(null=투명), mode('duo'|'white'), fill비율(꽃이 캔버스에서 차지하는 폭)
function iconSvg({size, bg, mode, frac}) {
  const flowerUnits = 70; // 꽃 bbox ≈ 70 단위
  const s = (size * frac) / flowerUnits;
  const c = size / 2;
  const rect = bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rect}<g transform="translate(${c} ${c}) scale(${s}) translate(-50 -50)">${flower({mode})}</g></svg>`;
}

async function png(opts, outPath) {
  const svg = iconSvg(opts);
  await sharp(Buffer.from(svg)).png().toFile(join(ROOT, outPath));
  console.log('✓', outPath);
}

mkdirSync(join(ROOT, 'public/icons'), {recursive: true});

// 1) 인라인 로고 (투명 · 투톤) — auth/policy 의 /flori-logo.png
await png({size: 512, bg: null, mode: 'duo', frac: 0.9}, 'public/flori-logo.png');

// 2) Next 파비콘/애플
await png({size: 512, bg: '#ffffff', mode: 'duo', frac: 0.66}, 'src/app/icon.png');
await png({size: 180, bg: '#ffffff', mode: 'duo', frac: 0.66}, 'src/app/apple-icon.png');

// 3) PWA "any" (흰 배경 · 투톤)
await png({size: 192, bg: '#ffffff', mode: 'duo', frac: 0.66}, 'public/icons/icon-192x192.png');
await png({size: 512, bg: '#ffffff', mode: 'duo', frac: 0.66}, 'public/icons/icon-512x512.png');

// 4) PWA maskable (로즈 배경 · 흰 꽃 · 안전영역 고려 작게)
await png({size: 192, bg: ROSE, mode: 'white', frac: 0.52}, 'public/icons/icon-maskable-192x192.png');
await png({size: 512, bg: ROSE, mode: 'white', frac: 0.52}, 'public/icons/icon-maskable-512x512.png');

// 5) 캐노니컬 벡터 마크 (투명 · 투톤)
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">${flower({mode: 'duo'})}</svg>\n`;
writeFileSync(join(ROOT, 'public/flori-mark.svg'), markSvg);
console.log('✓ public/flori-mark.svg');

console.log('\n완료.');
