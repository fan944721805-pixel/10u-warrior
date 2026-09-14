const test = require('node:test');
const assert = require('node:assert/strict');
const cards = require('../public/card-lab-data');
const { normalizePolicy } = require('../ai-decision');

test('battle policy preserves validated card attributes and an independent snapshot', () => {
  const card = cards.rerollCard(cards.makeCard('czBrother', 'trend', 123, 'owned-cz'), 456);
  const policy = normalizePolicy({ cardSnapshot: card, actionUrge: 100 }, 'agent-1');
  assert.equal(policy.strategy, 'czBrother');
  assert.deepEqual([policy.actionUrge, policy.emotionSensitivity, policy.decisionVariance], card.stats);
  assert.equal(policy.cardPolicyHash.length, 64);
  assert.deepEqual(normalizePolicy(JSON.parse(JSON.stringify(policy)), 'agent-1'), policy);
  card.stats[0] = 999;
  assert.notEqual(policy.cardSnapshot.stats[0], 999);
});

test('invalid or mismatched cards cannot silently become a default strategy', () => {
  const card = cards.makeCard('czBrother', 'trend', 123, 'owned-cz');
  assert.throws(() => normalizePolicy({ cardSnapshot: { ...card, stats: [100, 100, 100] } }, 'x'), { code: 'INVALID_STRATEGY_CARD' });
  assert.throws(() => normalizePolicy({ cardSnapshot: card, strategy: 'smart' }, 'x'), { code: 'CARD_PERSONA_MISMATCH' });
  assert.throws(() => normalizePolicy({ cardSnapshot: card, cardPolicyHash: 'tampered' }, 'x'), { code: 'CARD_POLICY_HASH_MISMATCH' });
  assert.throws(() => normalizePolicy({ cardSnapshot: { ...card, version: 'future' } }, 'x'), { code: 'INVALID_STRATEGY_CARD' });
});

test('display metadata does not change executable policy identity', () => {
  const card = cards.makeCard('czBrother', 'trend', 123, 'owned-cz');
  const a = normalizePolicy({ cardSnapshot: card }, 'x');
  const b = normalizePolicy({ cardSnapshot: { ...card, customName: 'nickname', image: 'untrusted.svg' } }, 'x');
  assert.equal(a.cardPolicyHash, b.cardPolicyHash);
  assert.equal(b.cardSnapshot.image, undefined);
  assert.equal(normalizePolicy({ strategy: 'smart' }, 'x').cardSnapshot, undefined);
});
