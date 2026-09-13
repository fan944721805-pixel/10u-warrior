// Disposable in-memory battles only. No persistent ledger or wallet operations.
const { createWarriorServer } = require('../server');
const { createSimulationBattles } = require('../simulation-battles');
const simulation = createSimulationBattles({ source: {}, leaseEnabled: true });
simulation.create('fixture one'); simulation.create('fixture two');
const server = createWarriorServer({ paperFile:null,
  walletCli:async()=>{throw Error('Fixture wallet disabled');},
  simulation:{...simulation,tick:async()=>{}},
});
server.listen(0,'127.0.0.1',()=>console.log(`DELETE_BATTLE_FIXTURE http://127.0.0.1:${server.address().port}`));
