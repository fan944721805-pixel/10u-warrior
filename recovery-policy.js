// One initial failure, then five retries. Persist the attempt count with the battle.
const RETRY_DELAYS = [5000, 15000, 30000, 60000, 60000];
function recoveryKind(code = '') {
  if (/AUTH|LOGIN|SESSION|WALLET_NOT_CONNECTED|UNAUTHORIZED|FORBIDDEN/.test(code)) return 'auth';
  if (/NETWORK|TIMEOUT|ECONN|ENOTFOUND|EAI_AGAIN|FETCH|ABORT/i.test(code)) return 'network';
  if (['AWAITING_SETTLEMENT', 'SETTLEMENT_PENDING', 'MARKET_RESULT_PENDING'].includes(code)) return 'settlement';
  return 'market';
}
module.exports = { RETRY_DELAYS, recoveryKind };
