const JSZip = require('../backend/node_modules/jszip');
const fs = require('fs');

async function analyze() {
  const buf = fs.readFileSync('../docs/smart-ag-report_backup.pptx');
  const zip = await JSZip.loadAsync(buf);

  for (const n of [10, 12, 14, 18, 25]) {
    const xml = await zip.file('ppt/slides/slide'+n+'.xml').async('string');
    const shapes = [...xml.matchAll(/<p:sp>(.*?)<\/p:sp>/gs)];
    console.log('=== Slide ' + n + ' ===');
    for (const shape of shapes) {
      const s = shape[1];
      const ext = s.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
      const texts = [...s.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(m=>m[1]);
      const allText = texts.join('\\n');
      if (allText.trim()) {
        const cy = ext ? Math.round(parseInt(ext[1])/12700) : 0;
        const cx = ext ? Math.round(parseInt(ext[2])/12700) : 0;
        const lines = allText.split('\\n');
        console.log('  Box ' + cx + 'x' + cy + 'pt (' + lines.length + ' lines, ' + allText.length + ' chars):');
        for (const l of lines.slice(0, 15)) console.log('    |' + l.substring(0,100));
        if (lines.length > 15) console.log('    ... +' + (lines.length-15) + ' more lines');
      }
    }
    console.log('');
  }
}
analyze().catch(e=>console.error(e));
