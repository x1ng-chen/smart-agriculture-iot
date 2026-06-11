const JSZip = require('../backend/node_modules/jszip');
const fs = require('fs');

async function study() {
  const buf = fs.readFileSync('../docs/smart-ag-report_backup.pptx');
  const zip = await JSZip.loadAsync(buf);

  for (const n of [14, 18, 25, 12, 10]) {
    const xml = await zip.file('ppt/slides/slide'+n+'.xml').async('string');
    const shapes = [...xml.matchAll(/<p:sp>(.*?)<\/p:sp>/gs)];
    console.log('=== Slide ' + n + ' (' + shapes.length + ' shapes) ===');

    for (const shape of shapes) {
      const s = shape[1];
      const off = s.match(/<a:off x="(\d+)" y="(\d+)"/);
      const ext = s.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
      const fill = s.match(/<a:solidFill><a:srgbClr val="([A-Fa-f0-9]+)"/);
      const lnMatch = s.match(/<a:ln w="(\d+)"/);
      const texts = [...s.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(m=>m[1]).filter(t=>t.trim());
      const fontSz = s.match(/sz="(\d+)"/);
      const bold = s.match(/b="1"/);
      const fontFace = s.match(/typeface="([^"]+)"/);

      if (texts.length > 0) {
        const x = off ? Math.round(parseInt(off[1])/12700) : 0;
        const y = off ? Math.round(parseInt(off[2])/12700) : 0;
        const w = ext ? Math.round(parseInt(ext[1])/12700) : 0;
        const h = ext ? Math.round(parseInt(ext[2])/12700) : 0;
        const fc = fill ? fill[1] : '-';
        const fsz = fontSz ? Math.round(parseInt(fontSz[1])/100)+'pt' : '-';
        const fn = fontFace ? fontFace[1] : '-';
        const b = bold ? 'B' : '';
        console.log('  TEXT['+x+','+y+' '+w+'x'+h+'] '+fsz+' '+b+' #'+fc+' '+fn);
        for (const t of texts) console.log('    "' + t.substring(0,120) + '"');
      } else {
        const x = off ? Math.round(parseInt(off[1])/12700) : 0;
        const y = off ? Math.round(parseInt(off[2])/12700) : 0;
        const w = ext ? Math.round(parseInt(ext[1])/12700) : 0;
        const h = ext ? Math.round(parseInt(ext[2])/12700) : 0;
        const fc = fill ? fill[1] : '-';
        const lw = lnMatch ? Math.round(parseInt(lnMatch[1])/12700)+'pt' : '';
        if (fc !== '0B1120' && fc !== '-') {
          console.log('  RECT['+x+','+y+' '+w+'x'+h+'] #'+fc + (lw?' border:'+lw:''));
        }
      }
    }
    console.log('');
  }
}
study().catch(e=>console.error(e));
