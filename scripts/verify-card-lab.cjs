// Current card UI suite. Retires the old preview-only save, model and pending-controls assertions.
const {spawnSync}=require('node:child_process'),path=require('node:path');
for(const script of ['verify-card-collection-service.cjs','verify-card-collection.cjs','verify-card-api.cjs','verify-card-wallet.cjs','verify-card-wallet-native.cjs','verify-card-device.cjs','verify-card-setup.cjs','verify-card-capital.cjs','verify-card-battle-runtime.cjs','verify-card-controls.cjs','verify-card-ranking.cjs','verify-card-price.cjs','verify-card-locales.cjs']){
 const result=spawnSync(process.execPath,[path.join(__dirname,script)],{stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status||1);
}
console.log('PASS: current card UI service and localization suite');
