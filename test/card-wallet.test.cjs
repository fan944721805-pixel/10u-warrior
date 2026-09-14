const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create,trustedUrl}=require('../public/card-wallet.js');
const idle=()=>({wallet:{status:'unconnected'},auth:{status:'idle'}});
const pending=()=>({auth:{status:'awaiting_scan',urlForWeb:'https://app.binance.com/'}});
test('wallet reads on open, signs in only explicitly, stops page polling when closed',async()=>{
 const calls=[],timers=new Map();let n=0,confirmed=false;
 const c=create({setTimer:fn=>{timers.set(++n,fn);return n;},clearTimer:id=>timers.delete(id),request:async(path,body)=>{calls.push([path,body]);return path.endsWith('/signin')?pending():path.endsWith('/auth')?{auth:{status:confirmed?'connected':'awaiting_scan'}}:confirmed?{wallet:{status:'connected'},auth:{status:'connected'},accountValue:12}:idle();}});
 await c.open();assert.equal(c.snapshot().status,'unconnected');assert.equal(calls.length,1);
 await c.signin();assert.equal(c.snapshot().status,'awaiting_scan');assert.equal(timers.size,1);
 c.close();assert.equal(timers.size,0);await c.resume();assert.equal(calls.length,2);
 confirmed=true;await c.open();assert.equal(c.snapshot().status,'connected');assert.equal(c.snapshot().data.accountValue,12);assert.equal(timers.size,0);
});
test('mutation uncertainty blocks duplicate signin until a service read resolves it',async()=>{
 let writes=0,state=idle();const c=create({request:async(p,b)=>{if(b){writes++;state={wallet:{status:'unconnected'},...pending()};throw Error('response lost');}return state;}});
 await c.open();await c.signin();assert.equal(c.snapshot().uncertain,true);assert.equal(c.snapshot().status,'unavailable');assert.equal(c.snapshot().data,null);
 await c.signin();assert.equal(writes,1);assert.equal(c.snapshot().status,'awaiting_scan');assert.equal(c.snapshot().uncertain,false);c.close();
});
test('in-flight operations are serialized and close prevents a late response restarting polling',async()=>{
 let resolve,calls=0;const timers=new Map();const c=create({setTimer:fn=>{timers.set(1,fn);return 1;},clearTimer:id=>timers.delete(id),request:()=>{calls++;return new Promise(r=>resolve=r);}});
 const work=c.open();void c.refresh();c.close();resolve({wallet:{status:'unconnected'},...pending()});await work;assert.equal(calls,1);assert.equal(timers.size,0);assert.equal(c.snapshot().busy,false);
});
test('disconnection is confirmed by fresh service state and read failures clear stale assets',async()=>{
 let fail=false,connected=true;const c=create({request:async(p,b)=>{if(fail)throw Error('offline');if(b)connected=false;return connected?{wallet:{status:'connected'},accountValue:100}:idle();}});
 await c.open();assert.equal(c.snapshot().status,'connected');await c.signout();assert.equal(c.snapshot().status,'unconnected');fail=true;await c.refresh();assert.equal(c.snapshot().status,'unavailable');assert.equal(c.snapshot().data,null);c.close();
});
test('only official HTTPS authorization links can open',()=>{
 for(const url of ['javascript:alert(1)','http://binance.com','https://binance.com.evil.test','https://binance.com@evil.test','https://user@binance.com','https://evilbinance.com'])assert.equal(trustedUrl(url),null);
 assert.equal(trustedUrl('https://app.binance.com/path?q=1'),'https://app.binance.com/path?q=1');
});
