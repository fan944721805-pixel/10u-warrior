const depth = {bids:[['300','4'],['299','3']],asks:[['300.01','1'],['301','1']]};
function rows(now, count=200) {
  return Array.from({length:count},(_,index)=>{
    const time=Math.floor(now/60000)*60000-(count-index-1)*60000,open=100+index,close=open+1,volume=100;
    return [time,String(open),String(close+1),String(open-1),String(close),String(volume),time+59999,String(close*volume),100,'60',String(close*60),'0'];
  });
}
module.exports={rows,depth};
