// Explicit collection fixtures for unrelated UI checks; never shipped as initial user cards.
const cards=require('./cards.cjs');
const key='warrior-single-card-concept-v2',source={cards,featured:cards[0],roster:cards.slice(0,4).map(c=>c.id),locale:'zh'};
async function install(page){await page.addInitScript(({key,source})=>{if(localStorage.getItem(key)===null){localStorage.setItem(key,JSON.stringify(source));localStorage.setItem(key+'-draws',JSON.stringify({remaining:5,nextAt:null}));}},{key,source});}
async function installReadOnly(page){
 await page.addInitScript(({key,source})=>{if(!localStorage.getItem(key+'-preferences-v1'))localStorage.setItem(key+'-preferences-v1',JSON.stringify({roster:source.roster,locale:'zh'}));localStorage.setItem('warrior-card-collection-migrated','COL-1');},{key,source});
 await page.route('**/api/cards/collection',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:'COL-1',revision:1,serverTime:Date.now(),cards:source.cards,pending:null,featuredId:source.featured.id,budget:{remaining:5,nextAt:null}})}));
}
const ready=page=>page.waitForFunction(()=>window.CardLab?.getSnapshot().collection.status==='ready'&&!CardLab.getSnapshot().collection.busy);
module.exports={install,installReadOnly,ready};
