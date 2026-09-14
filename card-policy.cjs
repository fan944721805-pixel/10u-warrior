const capital=require('./card-capital.cjs');
const crypto = require('node:crypto');
const cards = require('./public/card-lab-data');
const { profiles } = require('./public/strategy-catalog');

function invalid(code) {
  return Object.assign(new Error(code), { code, statusCode: 422 });
}

// Copy only structured, validated fields. Collection edits never mutate a battle snapshot.
function freezeCard(value,{capitalVersion='SC-2',capitalLimits,traitsVersion=capitalVersion==='SC-2'?'CT-1':'CT-0'}={}) {
  if (!cards.validCard(value)) throw invalid('INVALID_STRATEGY_CARD');
  if (!Object.hasOwn(profiles, value.personaId)) throw invalid('CARD_STRATEGY_UNSUPPORTED');
  const snapshot = {
    id: value.id, personaId: value.personaId, styleId: value.styleId,
    seed: value.seed, stats: [...value.stats], version: value.version,
    ...(value.attributeSeed !== undefined ? { attributeSeed: value.attributeSeed } : {}),
  };
  const definition = cards.personas[snapshot.personaId];
  if(!['CT-0','CT-1'].includes(traitsVersion)||traitsVersion==='CT-1'&&capitalVersion!=='SC-2')throw invalid('CARD_TRAITS_VERSION_INVALID');
  const traits = cards.traitsFor(snapshot,traitsVersion);
  if(!['SC-1','SC-2'].includes(capitalVersion))throw invalid('CARD_CAPITAL_VERSION_INVALID');
  const limits=capitalVersion==='SC-2'?capital.normalizeLimits(capitalLimits):null;
  const policyHash = crypto.createHash('sha256').update(JSON.stringify({
    schema: traitsVersion==='CT-1'?3:capitalVersion==='SC-2'?2:1, ...(traitsVersion==='CT-1'?{traitsVersion}:{}), ...(limits?{capitalVersion,capitalLimits:limits}:{}), persona: snapshot.personaId, style: snapshot.styleId,
    stats: snapshot.stats, traits, required: definition.required,
  })).digest('hex');
  return { snapshot, traits, policyHash, definition,capitalVersion,traitsVersion,capitalLimits:limits };
}

function cardPolicy(value) {
  const { snapshot, traits, policyHash, definition,capitalVersion,traitsVersion,capitalLimits } = freezeCard(value.cardSnapshot,{capitalVersion:value.capitalVersion??(value.cardPolicyHash?'SC-1':'SC-2'),capitalLimits:value.capitalLimits,traitsVersion:value.traitsVersion??(value.cardPolicyHash?'CT-0':'CT-1')});
  if (value.strategy !== undefined && value.strategy !== snapshot.personaId) throw invalid('CARD_PERSONA_MISMATCH');
  if (value.cardPolicyHash !== undefined && value.cardPolicyHash !== policyHash) throw invalid('CARD_POLICY_HASH_MISMATCH');
  return {
    ...value,capitalVersion,traitsVersion,...(capitalLimits?{capitalLimits}:{}), strategy: snapshot.personaId,
    actionUrge: snapshot.stats[0], emotionSensitivity: snapshot.stats[1], decisionVariance: snapshot.stats[2],
    indicators: [...definition.required], cardSnapshot: snapshot, cardPolicyHash: policyHash, cardTraits: traits,
  };
}

module.exports = { freezeCard, cardPolicy };
