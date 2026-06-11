const JSZip = require('../backend/node_modules/jszip');
const fs = require('fs');

async function diag(){
  const b=fs.readFileSync('../docs/smart-ag-report_backup.pptx');
  const z=await JSZip.loadAsync(b);
  for(const n of [10,12,14,18,25]){
    const xml=await z.file('ppt/slides/slide'+n+'.xml').async('string');
    const matches = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)];
    console.log('Slide '+n+': '+matches.length+' <a:t> elements');
    for(let i=0; i<matches.length; i++){
      const content = matches[i][1];
      if(content.trim()) console.log('  ['+i+'] '+content.substring(0,80));
      else console.log('  ['+i+'] (empty/ws)');
    }
    console.log('');
  }
}
diag().catch(e=>console.error(e));
