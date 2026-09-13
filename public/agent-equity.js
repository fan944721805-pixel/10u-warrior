/* Book equity from the existing paper ledger. No price sampling or extra requests. */
((root) => {
  const finite=value=>typeof value==='number'&&Number.isFinite(value);
  const money=value=>Math.round(value*1e8)/1e8;
  function buildSeries(simulation,agent) {
    const initial=simulation?.config?.initialBalance;
    if(!finite(initial)||!agent||!Array.isArray(agent.orders))return null;
    const events=[];
    for(const order of agent.orders) {
      if(order.status==='OPEN')continue;
      const payout=finite(order.payout)?order.payout:order.quote?.source==='offline-simulated'?(order.status==='LOST'?0:order.status==='WON'&&finite(order.quote.odds)?money(order.amount*order.quote.odds):null):null;
      if(!['WON','LOST','SPLIT'].includes(order.status)||!finite(order.amount)||!finite(payout))return null;
      const at=order.settledAt??order.end;
      if(!finite(at))return null;
      events.push({at,delta:payout-order.amount,kind:'settlement'});
    }
    for(const topUp of agent.topUps||[]) {
      if(!finite(topUp.at)||!finite(topUp.amount))return null;
      events.push({at:topUp.at,delta:topUp.amount,kind:'capital'});
    }
    events.sort((a,b)=>a.at-b.at);
    const deposits=events.filter(e=>e.kind==='capital').reduce((sum,e)=>sum+e.delta,0);
    if(Math.abs(deposits-(agent.addedCapital||0))>1e-6)return null;
    const current=finite(agent.equity)?agent.equity:finite(agent.cash)&&finite(agent.reserved)?agent.cash+agent.reserved:null;
    const final=money(initial+events.reduce((sum,e)=>sum+e.delta,0));
    if(!finite(current)||Math.abs(final-current)>1e-6)return null;
    const firstOrder=agent.orders.reduce((first,o)=>finite(o.placedAt??o.start)?Math.min(first,o.placedAt??o.start):first,Infinity);
    const start=Math.min(...[simulation.createdAt,firstOrder,events[0]?.at,simulation.serverTime].filter(finite));
    if(!finite(start))return null;
    const points=[{at:start,value:initial,kind:'initial',delta:0}];
    for(const event of events)points.push({...event,value:money(points.at(-1).value+event.delta)});
    const end=Math.max(points.at(-1).at,simulation.endedAt??simulation.serverTime??points.at(-1).at);
    points.push({at:end,value:final,kind:'current',delta:0});
    return {points,current:final,profit:money(final-initial-deposits),deposits,hasChanges:events.length>0};
  }
  if(typeof module==='object'&&module.exports){module.exports={buildSeries};return;}
  const doc=root.document,NS='http://www.w3.org/2000/svg';
  const node=(tag,text,cls)=>{const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
  const svgNode=(tag,attrs)=>{const el=doc.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
  const numeric=(tag,text,cls)=>{const el=node(tag,text,cls);el.dataset.noTranslate='';return el;};
  const number=value=>value.toLocaleString(doc.documentElement.lang,{minimumFractionDigits:2,maximumFractionDigits:2});
  let active=null;
  function render(section,simulation,agent,selected=null) {
    const series=buildSeries(simulation,agent);
    section.replaceChildren();
    const heading=node('div',undefined,'equity-chart-heading');heading.append(node('strong','资金变化'),node('span','模拟资金'));
    section.append(heading);
    if(!series){section.append(node('p','历史记录不完整，暂不绘制曲线。','equity-chart-note'));return;}
    const stats=node('div',undefined,'equity-chart-stats');
    for(const [label,value]of [['账面净值',series.current],['已结算盈亏',series.profit]]){
      const stat=node('div');stat.append(node('small',label),numeric('strong',`${value>0&&label==='已结算盈亏'?'+':''}${number(value)} USDT`));stats.append(stat);
    }
    section.append(stats);
    const {points}=series,W=440,H=180,left=50,right=16,top=15,bottom=24;
    let min=points.reduce((v,p)=>Math.min(v,p.value),Infinity),max=points.reduce((v,p)=>Math.max(v,p.value),-Infinity);
    const pad=Math.max((max-min)*.15,Math.abs(max)*.02,.01);min-=pad;max+=pad;
    const duration=points.at(-1).at-points[0].at;
    const x=(p,i)=>left+(W-left-right)*(duration?(p.at-points[0].at)/duration:i/(points.length-1));
    const y=p=>top+(max-p.value)/(max-min)*(H-top-bottom);
    const svg=svgNode('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':'资金变化',preserveAspectRatio:'xMidYMid meet'});
    for(const f of [0,.5,1]){
      const py=top+f*(H-top-bottom);
      svg.append(svgNode('line',{x1:left,x2:W-right,y1:py,y2:py,class:'equity-grid'}));
      const text=svgNode('text',{x:left-7,y:py+4,'text-anchor':'end',class:'equity-axis','data-no-translate':''});text.textContent=number(max-f*(max-min));svg.append(text);
    }
    // Steps preserve the actual settlement/deposit jumps instead of inventing intermediate values.
    let path=`M ${x(points[0],0)} ${y(points[0])}`;
    points.slice(1).forEach((p,i)=>{path+=` H ${x(p,i+1)} V ${y(p)}`;});
    svg.append(svgNode('path',{d:`${path} L ${x(points.at(-1),points.length-1)} ${H-bottom} H ${left} Z`,class:'equity-area'}));
    svg.append(svgNode('path',{d:path,class:'equity-line'}));
    points.forEach((p,i)=>{if(p.kind==='capital')svg.append(svgNode('circle',{cx:x(p,i),cy:y(p),r:5,class:'equity-deposit'}));});
    const guide=svgNode('line',{y1:top,y2:H-bottom,class:'equity-guide'}),dot=svgNode('circle',{r:5,class:'equity-point'});svg.append(guide,dot);
    section.append(svg);
    const readout=node('div',undefined,'equity-chart-readout');readout.setAttribute('aria-live','polite');
    const kind=node('span'),date=numeric('time',''),value=numeric('strong','');readout.append(kind,date,value);section.append(readout);
    const slider=node('input');slider.type='range';slider.min='0';slider.max=String(points.length-1);slider.step='1';slider.setAttribute('aria-label','查看资金记录');slider.className='equity-chart-slider';section.append(slider);
    function select(index){
      index=Math.max(0,Math.min(points.length-1,index));const p=points[index];slider.value=String(index);
      section.dataset.selectedIndex=String(index);
      guide.setAttribute('x1',x(p,index));guide.setAttribute('x2',x(p,index));dot.setAttribute('cx',x(p,index));dot.setAttribute('cy',y(p));
      kind.textContent=({initial:'初始资金',settlement:'订单结算',capital:'补资',current:'当前'})[p.kind];
      date.textContent=new Intl.DateTimeFormat(doc.documentElement.lang,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(p.at);
      date.dateTime=new Date(p.at).toISOString();value.textContent=`${number(p.value)} USDT${p.kind==='capital'?` (+${number(p.delta)})`:''}`;
      slider.setAttribute('aria-valuetext',`${date.textContent}, ${value.textContent}`);
    }
    slider.oninput=()=>select(Number(slider.value));
    const pick=event=>{const box=svg.getBoundingClientRect(),target=(event.clientX-box.left)/box.width*W;let closest=0;points.forEach((p,i)=>{if(Math.abs(x(p,i)-target)<Math.abs(x(points[closest],closest)-target))closest=i;});select(closest);};
    svg.onpointerdown=event=>{svg.setPointerCapture(event.pointerId);pick(event);};svg.onpointermove=event=>{if(event.buttons)pick(event);};
    select(selected===null?points.length-1:selected);
    if(!series.hasChanges)section.append(node('p','尚无结算记录，资金保持初始值。','equity-chart-note'));
    section.append(node('p','按结算与补资记录绘制；未结算本金计入资金，补资不计入盈亏。','equity-chart-note'));
    if(series.deposits){const legend=node('p',undefined,'equity-chart-note equity-chart-legend');legend.append(node('i'),node('span','补资'),numeric('span',`+${number(series.deposits)} USDT`));section.append(legend);}
  }
  const signature=(simulation,agent)=>JSON.stringify([simulation.endedAt,simulation.config.initialBalance,agent.equity,agent.cash,agent.reserved,agent.addedCapital,agent.topUps,agent.orders.map(o=>[o.id,o.status,o.amount,o.payout,o.settledAt,o.end,o.quote?.odds])]);
  root.WarriorEquity={buildSeries,mount(simulation,agent){
    const section=node('section',undefined,'agent-equity-chart');section.dataset.agentId=agent.id;
    active={section,battleId:simulation.id,agentId:agent.id,signature:signature(simulation,agent)};render(section,simulation,agent);return section;
  }};
  function refresh(preserve=false){
    if(!active?.section.isConnected||!doc.querySelector('#detail-dialog')?.open)return;
    const simulation=root.Warrior.state.simulation,agent=simulation?.agents?.find(a=>a.id===active.agentId);
    if(!agent||simulation.id!==active.battleId){active.section.remove();active=null;return;}
    const next=signature(simulation,agent);
    if(!preserve&&next===active.signature)return;
    active.signature=next;
    render(active.section,simulation,agent,preserve?Number(active.section.dataset.selectedIndex):null);
  }
  root.Warrior.on('simulation:update',()=>refresh());
  root.addEventListener('warrior-language-change',()=>refresh(true));
})(typeof window==='object'?window:globalThis);
