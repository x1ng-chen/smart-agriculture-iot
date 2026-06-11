const JSZip = require('../backend/node_modules/jszip');
const fs = require('fs');

async function verify() {
  const buf = fs.readFileSync('../docs/smart-ag-report.pptx');
  const zip = await JSZip.loadAsync(buf);
  const pres = await zip.file('ppt/presentation.xml').async('string');
  const rels = await zip.file('ppt/_rels/presentation.xml.rels').async('string');

  const sldIds = [...pres.matchAll(/<p:sldId id="(\d+)" r:id="(rId\d+)"/g)];
  console.log('Total slides (sldIdLst):', sldIds.length);

  // Build rId -> Target mapping
  const relMap = {};
  for (const m of rels.matchAll(/<Relationship Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
    relMap[m[1]] = m[2];
  }

  console.log('');
  for (let i = 0; i < sldIds.length; i++) {
    const rId = sldIds[i][2];
    const target = relMap[rId] || 'unknown';
    const fileNum = target.match(/slide(\d+)/)?.[1] || '?';
    const slideXml = await zip.file('ppt/slides/slide' + fileNum + '.xml').async('string');
    const texts = [...slideXml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(m => m[1]).filter(t => t.trim());
    const preview = texts.join(' | ').substring(0, 180);
    const marker = parseInt(fileNum) > 100 ? ' [NEW]' : '';
    console.log('Slide ' + (i+1) + ' (file:' + fileNum + ')' + marker + ': ' + preview);
  }
}
verify().catch(e => console.error(e));
