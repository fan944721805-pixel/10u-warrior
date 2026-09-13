// Isolated roster-layout fixture: no saved battles, market ticks or wallet access.
const {createWarriorServer}=require('../server');
const {createSimulationBattles}=require('../simulation-battles');
const simulation=createSimulationBattles({source:{},leaseEnabled:true});
const strategies=['aggressive','smart','conservative','trendFollowing','meanReversion','breakout','orderFlow','volatilityGuard'];
for(const count of [7,8])simulation.create(`Grid ${count}`,{agents:Array.from({length:count},(_,index)=>({id:`grid-${index}`,strategy:strategies[index],coin:'BTC'}))});
const server=createWarriorServer({paperFile:null,walletCli:async()=>{throw Error('Fixture wallet disabled');},simulation:{...simulation,tick:async()=>{}}});
server.listen(0,'127.0.0.1',()=>console.log(`AGENT_GRID_FIXTURE http://127.0.0.1:${server.address().port}`));
