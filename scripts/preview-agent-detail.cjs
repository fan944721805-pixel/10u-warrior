// Isolated UI fixture using the actual render functions; no backend or order writes.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../public');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const paper = fs.readFileSync(path.join(root, 'paper.js'), 'utf8');
const liveDetail = app.slice(app.indexOf('function liveDetail('), app.indexOf('function detail('));
const returns = paper.slice(paper.indexOf('  function returnPanel('), paper.indexOf('  const numberedBattles'));
const handler = paper.slice(paper.indexOf('          window.openModelDetail(agent.id);'), paper.indexOf('\n        };', paper.indexOf('          window.openModelDetail(agent.id);')));
const fixture = { id:'fixture-a', policy:{name:'狐火术师',provider:'claude',coin:'BTC',strategy:'aggressive',decisionVariance:82,maxStakePct:100,allowAllIn:true},
  orders:[{id:'fixture-order',start:1789234200000,end:1789234500000,status:'OPEN',direction:'DOWN',amount:19.04,quote:{odds:1.87,shares:35.69}}],
  lastDecision:{roundId:'1789234200000',action:'BET',direction:'DOWN',stake:19.04,confidence:88,riskMode:'NORMAL',reason:'信号一致且模拟期望为正',indicators:{rsi_14:23.1,volume_ratio:1.02,market_odds:{up:1.75,down:1.96}},engine:{mode:'mock'}} };
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){
    let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
    const script=`const $=s=>document.querySelector(s);const agent=${JSON.stringify(fixture)};const current={agents:[agent]};
      document.body.dataset.ruleAi='true';window.Warrior.state.simulation=current;
      const offline=false,number=v=>Number(v??0).toFixed(2),signed=v=>(v>0?'+':v<0?'−':'')+number(Math.abs(v));
      const node=(tag,text,cls='',literal=false)=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;if(literal)e.dataset.noTranslate='';return e;};
      const winningReturn=window.Warrior.marketValues.winningReturn;
      function openDialog(selector){$(selector).showModal();}
      ${liveDetail}\n${returns}
      window.openModelDetail=key=>liveDetail(key,agent.policy);
      function preview(){${handler}}
      $('#detail-dialog .close-dialog').onclick=()=>$('#detail-dialog').close();
      preview();`;
    html=html.replace('</body>',`<script src="strategy-catalog.js"></script><script src="app-core.js"></script><script src="skin-registry.js"></script><script src="market-values.js"></script><script>${script}</script><script src="i18n.js"></script></body>`);
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  const type={'.css':'text/css','.png':'image/png','.js':'text/javascript'}[path.extname(file)];
  if(!file.startsWith(root+path.sep)||!type||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':type});fs.createReadStream(file).pipe(res);
}).listen(0,'127.0.0.1',function(){console.log(`Detail fixture: http://127.0.0.1:${this.address().port}/`);});
