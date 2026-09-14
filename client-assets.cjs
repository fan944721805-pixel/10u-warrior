// A shared allowlist keeps retired UI scripts out of Web responses and APK assets.
const files=new Set(['index.html','card-lab.html','card-entry.js','card-lab.css','card-lab-brand.css','card-lab.js','card-lab-data.js','card-lab-draws.js','card-runtime.js','card-collection.js','card-battles.js','card-results.js','card-wallet.js','card-device.js','strategy-catalog.js','strategy-widget.js','i18n.js','market-values.js','price-stream.js','native-service-client.js','simulation-api.js']);
const nativeFiles=new Set(['runtime-host.html','runtime-host.js','runtime-scheduler.js','mobile-runtime.js']);
function allowed(file,{native=false}={}){return files.has(file)||(native&&nativeFiles.has(file))||/^(?:strategy-icons\/[a-zA-Z0-9_-]+|delivery-rider(?:-[a-zA-Z0-9_-]+)?)\.(?:png|svg|webp)$/.test(file);}
module.exports={allowed,files,nativeFiles};
