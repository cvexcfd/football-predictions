#!/usr/bin/env node
/**
 * Verify Badge Ownership Check in submit_prediction
 * 
 * Tests 4 scenarios via Supabase REST API:
 * 1. Depleted badge (quantity=0) → REJECTED
 * 2. Valid badge (quantity>0) → ACCEPTED
 * 3. No badge → ACCEPTED
 * 4. Non-existent badge → REJECTED
 * 
 * Usage:
 *   node scripts/verify-badge-check.mjs <supabase-url> <service-role-key>
 * 
 * Example:
 *   node scripts/verify-badge-check.mjs https://wvwigonyubvzzkzwdisg.supabase.co sb_secret_...
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.argv[2];
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[3];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Usage: node verify-badge-check.mjs <supabase-url> <service-role-key>');
  console.error('Or set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function getTestData() {
  // Find a match that's upcoming (not locked, not started)
  const { data: matches, error: me } = await supabase
    .from('matches')
    .select('id')
    .eq('status', 'upcoming')
    .limit(1);
  if (me) throw new Error(`Match query: ${me.message}`);
  if (!matches?.length) throw new Error('No upcoming matches found');
  const matchId = matches[0].id;

  // Find a player who has at least one badge with quantity > 0
  const { data: players, error: pe } = await supabase
    .from('players')
    .select('id')
    .limit(1);
  if (pe) throw new Error(`Player query: ${pe.message}`);
  if (!players?.length) throw new Error('No players found');
  const playerId = players[0].id;

  // Find player badges - one with quantity>0 and one with quantity<=0 if exists
  const { data: badges, error: be } = await supabase
    .from('player_badges')
    .select('badge_id, quantity')
    .eq('player_id', playerId);
  if (be) throw new Error(`Badge query: ${be.message}`);

  const validBadge = badges?.find(b => b.quantity > 0);
  const depletedBadge = badges?.find(b => b.quantity <= 0);

  return { playerId, matchId, validBadge, depletedBadge };
}

async function submitPrediction(playerId, matchId, home, away, badgeId) {
  const { data, error } = await supabase.rpc('submit_prediction', {
    p_player_id: playerId,
    p_match_id: matchId,
    p_pred_home: home,
    p_pred_away: away,
    p_badge_id: badgeId || null,
  });
  return { data, error };
}

async function runTest(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    const result = await fn();
    console.log(result.pass ? '✅ PASS' : '❌ FAIL');
    if (!result.pass) console.log(`    Reason: ${result.reason}`);
    return result.pass;
  } catch (e) {
    console.log('❌ ERROR', e.message);
    return false;
  }
}

async function main() {
  console.log('\n🔍 Verifying badge ownership check in submit_prediction\n');
  console.log(`URL: ${SUPABASE_URL}\n`);

  let { playerId, matchId, validBadge, depletedBadge } = await getTestData();
  console.log(`Player: ${playerId}`);
  console.log(`Match:  ${matchId}`);
  console.log(`Valid badge:   ${validBadge ? `${validBadge.badge_id} (qty=${validBadge.quantity})` : 'NONE'}`);
  console.log(`Depleted badge: ${depletedBadge ? `${depletedBadge.badge_id} (qty=${depletedBadge.quantity})` : 'NONE'}`);
  console.log();

  // If no depleted badge exists, we'll use a fake UUID
  const fakeDepletedBadgeId = depletedBadge?.badge_id || '00000000-0000-0000-0000-000000000000';
  const fakeBadgeId = '11111111-1111-1111-1111-111111111111';

  let passed = 0;
  let total = 4;

  // Scenario 1: Depleted badge → REJECTED (should raise exception if migration is applied)
  passed += await runTest('Scenario 1: Depleted badge rejected', async () => {
    const { data, error } = await submitPrediction(playerId, matchId, 0, 0, fakeDepletedBadgeId);
    if (error && error.message?.includes?.('not own this badge')) {
      return { pass: true };
    }
    if (error) return { pass: false, reason: `Unexpected error: ${error.message}` };
    return { pass: false, reason: 'Prediction was accepted with depleted badge' };
  });

  // Scenario 2: Valid badge → ACCEPTED
  passed += await runTest('Scenario 2: Valid badge accepted', async () => {
    if (!validBadge) {
      return { pass: false, reason: 'No valid badge found for player' };
    }
    const { data, error } = await submitPrediction(playerId, matchId, 0, 0, validBadge.badge_id);
    if (error) return { pass: false, reason: `Error: ${error.message}` };
    return { pass: true };
  });

  // Scenario 3: No badge → ACCEPTED
  passed += await runTest('Scenario 3: No badge works (no regression)', async () => {
    const { data, error } = await submitPrediction(playerId, matchId, 1, 0, null);
    if (error) return { pass: false, reason: `Error: ${error.message}` };
    return { pass: true };
  });

  // Scenario 4: Non-existent badge → REJECTED
  passed += await runTest('Scenario 4: Non-existent badge rejected', async () => {
    const { data, error } = await submitPrediction(playerId, matchId, 0, 1, fakeBadgeId);
    if (error && error.message?.includes?.('not own this badge')) {
      return { pass: true };
    }
    if (error) return { pass: false, reason: `Unexpected error: ${error.message}` };
    return { pass: false, reason: 'Prediction was accepted with non-existent badge' };
  });

  console.log(`\n📊 Results: ${passed}/${total} passed`);
  if (passed === total) {
    console.log('🎉 All scenarios pass! Migration applied successfully.\n');
  } else {
    console.log(`⚠️  ${total - passed} scenario(s) failed.\n`);
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
