// Package the shared original chart in the existing static preview entrypoint.
// The preview stays within its current static-file allowlist; no extra route is needed.
const fs=require('node:fs'),path=require('node:path');
const entry=path.resolve(__dirname,'../public/card-lab.js');
const shared=path.resolve(__dirname,'../public/agent-equity.js');
const marker='\n/* Generated shared chart: public/agent-equity.js. Run scripts/sync-card-chart.cjs after editing the source. */\n';
const current=fs.readFileSync(entry,'utf8');
const next=current.split(marker.trim())[0].trimEnd()+marker+fs.readFileSync(shared,'utf8');
if(process.argv.includes('--check')){
  if(current!==next)throw new Error('Shared chart bundle is stale. Run scripts/sync-card-chart.cjs.');
}else fs.writeFileSync(entry,next);
