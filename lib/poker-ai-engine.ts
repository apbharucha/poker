import { Card, BettingRound, ActionType, AIRecommendation } from '@/types/poker';
import { getBestHand, HandRank } from '@/lib/hand-evaluator';
import { calculatePotOdds, RANKS } from '@/lib/poker-utils';

interface GameContext {
  holeCards: Card[];
  communityCards: Card[];
  currentRound: BettingRound;
  pot: number;
  currentBet: number; // amount to call for the hero
  playerStack: number;
  bigBlind: number;
  smallBlind: number;
  activePlayers: number;
  playerActions: Array<{ action: ActionType; amount?: number }>;
  bluffIntent?: boolean;
  forceBluff?: boolean; // when true, never output 'fold'; pick best bluffing line instead
}

export function generateAIRecommendation(context: GameContext): AIRecommendation {
  const handStrength = calculateHandStrength(context.holeCards, context.communityCards);
  const winProbability = estimateWinProbability(context.holeCards, context.communityCards, context.activePlayers, context.currentRound);
  const potOdds = context.currentBet > 0 ? calculatePotOdds(context.currentBet, context.pot) : 0;
  const expectedValue = calculateExpectedValue(winProbability, context.pot, context.currentBet);
  
  const position = analyzePosition(context);
  const aggression = analyzeAggression(context.playerActions);
  
  const action = determineOptimalAction(
    handStrength,
    winProbability,
    potOdds,
    context,
    position,
    aggression
  );
  
  const reasoning = generateReasoning(
    action,
    handStrength,
    winProbability,
    potOdds,
    context,
    position,
    aggression
  );

  // Build a secondary recommendation (alternative line)
  const secondary = buildSecondary(action, context);

  // Board threat and bluff success estimation
  const boardThreat = evaluateBoardThreat(context.communityCards);
  const bluffSuccessOdds = estimateBluffSuccess({
    round: context.currentRound,
    activePlayers: context.activePlayers,
    aggression: analyzeAggression(context.playerActions),
    boardThreat,
    sizingAggression: action.type === 'all-in' ? 1.0 : action.type === 'raise' ? 0.7 : 0.2,
  });

  // Heuristic to flag when hand is likely strong enough to pivot from bluffing to value
  // Be conservative to avoid false positives during bluffs
  const strongByStrength = handStrength >= 0.75; // strong made hand threshold
  const strongByWinProb = winProbability >= 60;  // confidence threshold
  const notWeakBluff = !(context.bluffIntent && handStrength < 0.5 && winProbability < 55);
  const goodForValue = !context.forceBluff && (strongByStrength || strongByWinProb) && context.currentRound !== 'preflop' && notWeakBluff;

  // Allocate mixed strategy frequencies between primary and secondary
  const { primaryFreq, secondaryFreq } = allocateFrequencies({
    primary: action.type,
    secondary: secondary?.action,
    winProbability,
    potOdds,
    bluffIntent: !!context.bluffIntent,
  });

  // Detect strong bluff opportunity (especially on river with missed draws)
  const smart = detectStrongBluffOpportunity({
    context,
    handStrength,
    winProbability,
    boardThreat,
    aggression: analyzeAggression(context.playerActions),
    bluffSuccessOdds,
  });

  return {
    action: action.type,
    betSize: action.amount,
    winProbability,
    reasoning,
    potOdds: potOdds > 0 ? potOdds : undefined,
    expectedValue,
    secondary: secondary ? { ...secondary, frequency: secondaryFreq } : undefined,
    bluffAware: !!context.bluffIntent,
    primaryFrequency: primaryFreq,
    bluffSuccessOdds,
    goodForValue,
    smartBluff: smart?.flag || false,
    smartBluffReason: smart?.reason,
    smartBluffAction: smart?.suggestedAction,
    smartBluffSuccessOdds: smart?.successOdds,
  };
}

function calculateHandStrength(holeCards: Card[], communityCards: Card[]): number {
  if (holeCards.length < 2) return 0;
  
  if (communityCards.length === 0) {
    return evaluatePreflopStrength(holeCards);
  }
  
  const bestHand = getBestHand(holeCards, communityCards);
  
  if (bestHand.rank >= HandRank.STRAIGHT_FLUSH) return 0.95;
  if (bestHand.rank >= HandRank.FOUR_OF_KIND) return 0.90;
  if (bestHand.rank >= HandRank.FULL_HOUSE) return 0.85;
  if (bestHand.rank >= HandRank.FLUSH) return 0.75;
  if (bestHand.rank >= HandRank.STRAIGHT) return 0.65;
  if (bestHand.rank >= HandRank.THREE_OF_KIND) return 0.55;
  if (bestHand.rank >= HandRank.TWO_PAIR) return 0.45;
  if (bestHand.rank >= HandRank.PAIR) return 0.35;
  
  return 0.20;
}

function evaluatePreflopStrength(holeCards: Card[]): number {
  if (holeCards.length !== 2) return 0;
  
  const [card1, card2] = holeCards;
  const rank1 = RANKS.indexOf(card1.rank);
  const rank2 = RANKS.indexOf(card2.rank);
  const isPair = card1.rank === card2.rank;
  const isSuited = card1.suit === card2.suit;
  
  if (isPair) {
    if (rank1 >= 12) return 0.85;
    if (rank1 >= 10) return 0.75;
    if (rank1 >= 7) return 0.65;
    return 0.55;
  }
  
  const highCard = Math.max(rank1, rank2);
  const gap = Math.abs(rank1 - rank2);
  
  let strength = 0.30;
  
  if (highCard >= 12) strength += 0.15;
  else if (highCard >= 10) strength += 0.10;
  else if (highCard >= 8) strength += 0.05;
  
  if (isSuited) strength += 0.08;
  
  if (gap <= 1) strength += 0.05;
  else if (gap <= 3) strength += 0.02;
  
  return Math.min(strength, 0.90);
}

function estimateWinProbability(
  holeCards: Card[],
  communityCards: Card[],
  activePlayers: number,
  round: BettingRound
): number {
  const baseStrength = calculateHandStrength(holeCards, communityCards);
  
  const opponentAdjustment = 1 - ((activePlayers - 1) * 0.08);
  
  let roundMultiplier = 1.0;
  if (round === 'preflop') roundMultiplier = 0.85;
  else if (round === 'flop') roundMultiplier = 0.90;
  else if (round === 'turn') roundMultiplier = 0.95;
  else if (round === 'river') roundMultiplier = 1.0;
  
  const winProb = baseStrength * opponentAdjustment * roundMultiplier * 100;
  
  return Math.max(5, Math.min(95, winProb));
}

function calculateExpectedValue(winProbability: number, pot: number, callAmount: number): number {
  const winAmount = pot + callAmount;
  const ev = (winProbability / 100) * winAmount - callAmount;
  return Math.round(ev * 100) / 100;
}

function analyzePosition(context: GameContext): 'early' | 'middle' | 'late' {
  if (context.currentRound === 'preflop') {
    return 'middle';
  }
  return 'middle';
}

function analyzeAggression(actions: Array<{ action: ActionType; amount?: number }>): number {
  if (actions.length === 0) return 0.5;
  
  const aggressiveActions = actions.filter(a => a.action === 'raise' || a.action === 'all-in').length;
  return aggressiveActions / actions.length;
}

function determineOptimalAction(
  handStrength: number,
  winProbability: number,
  potOdds: number,
  context: GameContext,
  _position: string,
  _aggression: number
): { type: ActionType; amount?: number } {
  // Note: context.currentBet should represent the amount to call for the hero
  const callAmount = context.currentBet;
  const minRaise = Math.max(context.bigBlind * 2, callAmount * 2);
  const potRaise = Math.floor(context.pot * 0.75);
  const noBetToCall = callAmount === 0;

  // Preflop-specific strategy adjustments to avoid overly tight folds
  if (context.currentRound === 'preflop') {
    // Premium hands: open/3-bet aggressively
    if (handStrength >= 0.75) {
      const raiseAmount = Math.min(context.playerStack, Math.max(3 * context.bigBlind, potRaise));
      if (raiseAmount >= context.playerStack) return { type: 'all-in' };
      return { type: 'raise', amount: Math.max(3 * context.bigBlind, raiseAmount) };
    }

    // Strong hands: raise, especially if no raise to you
    if (handStrength >= 0.60) {
      const raiseBase = noBetToCall ? 3 * context.bigBlind : Math.max(minRaise, 2.5 * context.bigBlind);
      const raiseAmount = Math.min(context.playerStack, Math.floor(raiseBase));
      if (raiseAmount >= context.playerStack) return { type: 'all-in' };
      return { type: 'raise', amount: Math.max(context.bigBlind, raiseAmount) };
    }

    // Medium-strength hands: open raise when unopened pot; otherwise call small amounts
    if (handStrength >= 0.45) {
      if (noBetToCall) {
        const raiseAmount = Math.floor(2.5 * context.bigBlind);
        return { type: 'raise', amount: Math.max(context.bigBlind, Math.min(raiseAmount, context.playerStack)) };
      }
      if (callAmount <= context.bigBlind) {
        return { type: 'call', amount: callAmount };
      }
    }

    // Weak hands: never fold for free; fold only facing a bet
    if (noBetToCall) {
      return { type: 'check' };
    }
    if (handStrength < 0.30) {
      return { type: 'fold' };
    }
    // Otherwise fall through to general postflop-style logic below
  }
  
  // Strict rule: if bluffing preflop, never recommend fold; choose an opening or 3-bet sizing
  if (context.bluffIntent && context.currentRound === 'preflop') {
    if (noBetToCall) {
      // Unopened pot: open to ~3-4x
      const open = Math.floor(3 * context.bigBlind + (context.activePlayers > 3 ? context.bigBlind : 0));
      return { type: 'raise', amount: Math.min(Math.max(open, minRaise), context.playerStack) };
    } else {
      // Facing a bet: 3-bet to ~3x raise size, capped by stack
      const threeBet = Math.max(minRaise, Math.floor(callAmount * 3));
      if (threeBet >= context.playerStack) return { type: 'all-in' };
      return { type: 'raise', amount: Math.min(threeBet, context.playerStack) };
    }
  }

  // Bluff intent: bias towards aggression; if forceBluff, never fold at any street
  if (context.bluffIntent) {
    if (context.forceBluff) {
      if (noBetToCall) {
        const raiseAmount = Math.max(minRaise, Math.floor(context.pot * 0.5));
        return { type: 'raise', amount: Math.min(raiseAmount, context.playerStack) };
      }
      // Facing a bet: choose raise or shove based on stack/pot
      const raiseAmount = Math.max(minRaise, Math.floor(Math.max(context.pot * 0.7, callAmount * 2.5)));
      if (raiseAmount >= context.playerStack || context.playerStack <= context.pot) {
        return { type: 'all-in' };
      }
      return { type: 'raise', amount: Math.min(raiseAmount, context.playerStack) };
    }

    // Non-forced bluff bias (allowed to fold later if terrible)
    if (noBetToCall) {
      const raiseAmount = Math.max(minRaise, Math.floor(context.pot * 0.6));
      return { type: 'raise', amount: Math.min(raiseAmount, context.playerStack) };
    }
    if (callAmount <= context.bigBlind * 4) {
      const raiseAmount = Math.max(minRaise, Math.floor(context.pot * 0.7));
      if (raiseAmount >= context.playerStack) return { type: 'all-in' };
      return { type: 'raise', amount: Math.min(raiseAmount, context.playerStack) };
    }
    if (context.playerStack <= context.pot) {
      return { type: 'all-in' };
    }
  }

  // Never recommend folding when checking is free (no bet to call)
  if ((winProbability < 15 || handStrength < 0.25)) {
    return noBetToCall ? { type: 'check' } : { type: 'fold' };
  }
  
  if (winProbability >= 80 || handStrength >= 0.80) {
    const raiseAmount = Math.max(minRaise, potRaise);
    if (raiseAmount >= context.playerStack) {
      return { type: 'all-in' };
    }
    return { type: 'raise', amount: Math.min(raiseAmount, context.playerStack) };
  }
  
  if (winProbability >= 60 || handStrength >= 0.65) {
    if (noBetToCall) {
      const raiseAmount = Math.floor(context.pot * 0.5);
      return { type: 'raise', amount: Math.max(context.bigBlind, Math.min(raiseAmount, context.playerStack)) };
    }
    
    if (potOdds > 0 && winProbability > potOdds) {
      return { type: 'call', amount: callAmount };
    }
    
    if (callAmount <= context.bigBlind * 3) {
      return { type: 'call', amount: callAmount };
    }
    
    return { type: 'fold' };
  }
  
  if (winProbability >= 40 || handStrength >= 0.45) {
    if (noBetToCall) {
      return { type: 'check' };
    }
    
    if (potOdds > 0 && winProbability > potOdds && callAmount <= context.bigBlind * 2) {
      return { type: 'call', amount: callAmount };
    }
    
    return { type: 'fold' };
  }
  
  if (noBetToCall) {
    return { type: 'check' };
  }
  
  if (callAmount <= context.bigBlind && winProbability >= 25) {
    return { type: 'call', amount: callAmount };
  }
  
  return { type: 'fold' };
}

function generateReasoning(
  action: { type: ActionType; amount?: number },
  handStrength: number,
  winProbability: number,
  potOdds: number,
  context: GameContext,
  _position: string,
  _aggression: number
): string {
  const handQuality = handStrength >= 0.75 ? 'strong' : handStrength >= 0.50 ? 'moderate' : handStrength >= 0.30 ? 'weak' : 'very weak';
  
  let reasoning = `Your hand is ${handQuality} with a ${winProbability.toFixed(1)}% win probability. `;
  
  if (action.type === 'fold') {
    reasoning += `Folding is recommended as your hand strength is insufficient to justify calling or raising. `;
    if (potOdds > 0 && winProbability < potOdds) {
      reasoning += `The pot odds (${potOdds.toFixed(1)}%) are not favorable compared to your win probability.`;
    }
  } else if (action.type === 'check') {
    reasoning += `Checking is optimal here to see the next card for free while minimizing risk.`;
  } else if (action.type === 'call') {
    reasoning += `Calling is justified based on pot odds and your hand's potential. `;
    if (potOdds > 0) {
      reasoning += `Your win probability (${winProbability.toFixed(1)}%) exceeds the pot odds (${potOdds.toFixed(1)}%).`;
    }
  } else if (action.type === 'raise') {
    reasoning += `Raising puts pressure on opponents and builds the pot with your strong hand. `;
    if (action.amount) {
      reasoning += `A raise to $${action.amount} represents good value based on pot size.`;
    }
  } else if (action.type === 'all-in') {
    reasoning += `Going all-in maximizes value with your premium hand and commitment to the pot.`;
  }
  
  if (context.currentRound === 'preflop') {
    reasoning += ` Position and preflop strength are key factors in this decision.`;
  } else {
    const bestHand = getBestHand(context.holeCards, context.communityCards);
    reasoning += ` Current hand: ${bestHand.description}.`;
  }
  
  // Opponent action-based reasoning when recommending fold during bluff mode
  if (context.bluffIntent && action.type === 'fold' && !context.forceBluff) {
    const agg = summarizeActions(context.playerActions);
    const multiway = context.activePlayers > 2;
    reasoning += ` Opponents show ${agg.raises + agg.allIns} raises/shoves and ${agg.calls} calls${multiway ? ' in a multiway pot' : ''}, indicating strong ranges. ` +
      `Continuing the bluff risks unfavorable pot odds and low fold equity.`;
  }
  if (context.bluffIntent) {
    reasoning += context.forceBluff
      ? ' You chose to continue the bluff; the suggestion maximizes fold equity with aggressive sizing.'
      : ' You indicated a bluff intent; the line is biased toward aggression to maximize fold equity.';
  }
  return reasoning;
}

function buildSecondary(
  primary: { type: ActionType; amount?: number },
  context: GameContext
): { action: ActionType; betSize?: number; reasoning: string } | null {
  const noBetToCall = context.currentBet === 0;

  const alt = (type: ActionType, amount?: number, why?: string) => ({
    action: type,
    betSize: amount,
    reasoning: why || 'Alternative viable line based on context.',
  });

  if (context.bluffIntent) {
    if (primary.type === 'raise') {
      // Alternative: shove or a different raise sizing
      if (primary.amount && primary.amount < context.playerStack) {
        return alt('all-in', undefined, 'Bluff line alternative: maximize fold equity with a shove.');
      }
      const r = Math.max(context.bigBlind * 3, Math.floor(context.pot * 0.5));
      return alt('raise', Math.min(context.playerStack, r), 'Bluff line alternative: vary sizing to maintain pressure.');
    }
    if (primary.type === 'check' || primary.type === 'call') {
      const r = Math.max(context.bigBlind * 3, Math.floor(context.pot * 0.6));
      return alt('raise', Math.min(context.playerStack, r), 'Bluff line alternative: convert to a bluff raise.');
    }
    if (primary.type === 'fold') {
      const r = Math.max(context.bigBlind * 3, Math.floor(context.pot * 0.6));
      return alt(noBetToCall ? 'raise' : 'all-in', noBetToCall ? Math.min(context.playerStack, r) : undefined, 'Bluff line alternative: apply maximum pressure.');
    }
  }

  // Non-bluff secondary: provide a more conservative/aggressive counterpart
  if (primary.type === 'raise') {
    return alt('call', undefined, 'Alternative: take a lower-variance line by calling.');
  }
  if (primary.type === 'call') {
    const r = Math.max(context.bigBlind * 2, Math.floor(context.pot * 0.4));
    return alt('raise', Math.min(context.playerStack, r), 'Alternative: seize initiative with a value/protection raise.');
  }
  if (primary.type === 'check') {
    const r = Math.max(context.bigBlind * 2, Math.floor(context.pot * 0.33));
    return alt('raise', Math.min(context.playerStack, r), 'Alternative: apply pressure with a small probe bet.');
  }
  if (primary.type === 'fold') {
    return noBetToCall ? alt('check', undefined, 'Alternative: check back for free equity realization.') : alt('call', undefined, 'Alternative: call if pot odds are close.');
  }

  return null;
}

function isAggressive(action: ActionType): boolean {
  return action === 'raise' || action === 'all-in';
}

function evaluateBoardThreat(community: Card[]): number {
  // Simple threat metric: high cards, suitedness, connectivity
  if (community.length === 0) return 0.3;
  let highCards = 0;
  const suitCounts: Record<string, number> = {} as any;
  const ranksIdx: number[] = [];
  for (const c of community) {
    if (['A','K','Q','J','10'].includes(c.rank)) highCards++;
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
    ranksIdx.push(RANKS.indexOf(c.rank));
  }
  const flushThreat = Math.max(...Object.values(suitCounts)) >= 3 ? 0.15 : 0;
  ranksIdx.sort((a,b)=>a-b);
  let straightThreat = 0;
  for (let i=0;i<ranksIdx.length-1;i++) {
    if (ranksIdx[i+1]-ranksIdx[i] === 1) straightThreat += 0.05;
  }
  const highCardThreat = Math.min(0.2, highCards * 0.05);
  return Math.max(0.1, Math.min(0.8, 0.2 + flushThreat + straightThreat + highCardThreat));
}

// Lazy-loaded model params (optional)
let __modelParams: any | null = null;
let __modelParamsLoaded = false;
function loadModelParamsOnce() {
  if (typeof window === 'undefined' || __modelParamsLoaded) return;
  __modelParamsLoaded = true;
  fetch('/api/model-params')
    .then(r => r.ok ? r.json() : null)
    .then(j => { __modelParams = j?.params || null; })
    .catch(() => {});
}

function estimateBluffSuccess({
  round,
  activePlayers,
  aggression,
  boardThreat,
  sizingAggression,
}: {
  round: BettingRound;
  activePlayers: number;
  aggression: number;
  boardThreat: number; // 0..1
  sizingAggression: number; // 0..1
}): number {
  loadModelParamsOnce();

  let base = 0.35; // preflop baseline
  if (round === 'flop') base = 0.45;
  else if (round === 'turn') base = 0.5;
  else if (round === 'river') base = 0.55;

  // Adjust base by learned rates if available
  try {
    const rates = __modelParams?.bluff_success_rates;
    if (rates && typeof rates === 'object') {
      const key = round as any;
      const r = rates[key];
      if (r && r.total > 20) {
        const rate = r.succ / r.total; // 0..1
        base = Math.max(0.2, Math.min(0.8, rate));
      }
    }
  } catch {}

  // Multiway penalty
  const opp = Math.max(1, activePlayers - 1);
  let fe = base - (opp - 1) * 0.08;
  // Aggressive sizing and scary board help
  fe += Math.min(0.25, (boardThreat * 0.3) + (sizingAggression * 0.25));
  // Opponent aggression reduces FE
  fe -= Math.min(0.2, aggression * 0.2);
  return Math.round(Math.max(0.05, Math.min(0.9, fe)) * 100);
}

function detectStrongBluffOpportunity({
  context,
  handStrength,
  winProbability,
  boardThreat,
  aggression,
  bluffSuccessOdds,
}: {
  context: any;
  handStrength: number;
  winProbability: number;
  boardThreat: number;
  aggression: number;
  bluffSuccessOdds: number;
}): { flag: boolean; reason: string; suggestedAction: ActionType; successOdds: number } | null {
  // Only consider when not already forcing bluff
  if (context.forceBluff) return null;

  const isRiver = context.currentRound === 'river';
  const isFlopOrTurn = context.currentRound === 'flop' || context.currentRound === 'turn';
  const isPreflop = context.currentRound === 'preflop';
  const noShowdownValue = handStrength < 0.30 && winProbability < 45;
  const scaryBoard = boardThreat >= 0.5;
  const lowAggression = aggression <= 0.35; // opponents not very aggressive overall
  const noBetToCall = context.currentBet === 0;

  // River: busted draws / weak showdown value on scary boards
  if (isRiver && noShowdownValue && scaryBoard && lowAggression) {
    const reason = 'Busted draw/weak showdown value on a threatening board; opponents have shown limited aggression. A well-sized bluff can maximize fold equity.';
    const suggestedAction: ActionType = 'raise';
    const successOdds = bluffSuccessOdds;
    return { flag: true, reason, suggestedAction, successOdds };
  }

  // Flop/Turn: semi-bluff when you have equity and board pressure
  if (isFlopOrTurn && handStrength >= 0.30 && handStrength <= 0.55 && scaryBoard) {
    const reason = 'Semi-bluff: you have equity with potential to improve and the board applies pressure; an aggressive line can win now or later.';
    const suggestedAction: ActionType = 'raise';
    const successOdds = Math.max(bluffSuccessOdds, 40);
    return { flag: true, reason, suggestedAction, successOdds };
  }

  // Preflop: opportunistic open/3-bet bluff in low aggression environments
  if (isPreflop && handStrength < 0.25 && lowAggression && context.activePlayers <= 3) {
    if (noBetToCall) {
      const reason = 'Preflop steal: unopened pot, low table aggression, and many folds expected. Opening raise pressures blinds.';
      const suggestedAction: ActionType = 'raise';
      const successOdds = Math.max(35, Math.min(65, Math.round((1 - (context.activePlayers - 1) * 0.15) * 100)));
      return { flag: true, reason, suggestedAction, successOdds };
    } else if (context.activePlayers <= 2 && context.currentBet <= context.bigBlind * 3) {
      const reason = 'Light 3-bet spot: heads-up and low aggression indicate a profitable bluff 3-bet frequency.';
      const suggestedAction: ActionType = 'raise';
      const successOdds = Math.max(30, Math.min(55, Math.round(bluffSuccessOdds * 0.8)));
      return { flag: true, reason, suggestedAction, successOdds };
    }
  }

  return null;
}

export function generatePlayerInsight(playerActions: Array<{ action: ActionType; amount?: number }>, context: any): { summary: string; likelyRange: string; confidence: number } {
  // Very coarse heuristic
  const raises = playerActions.filter(a => a.action === 'raise' || a.action === 'all-in').length;
  const calls = playerActions.filter(a => a.action === 'call').length;
  const checks = playerActions.filter(a => a.action === 'check').length;
  const folds = playerActions.filter(a => a.action === 'fold').length;

  let likelyRange = 'Wide, mixed strength';
  let confidence = 40;
  if (raises >= 2) { likelyRange = 'Strong made hands (TT+, AQ+) or strong draws'; confidence = 65; }
  else if (raises === 1 && calls >= 1) { likelyRange = 'Top pairs, draws, mid pairs'; confidence = 55; }
  else if (calls >= 2) { likelyRange = 'Draws, mid/low pairs, suited connectors'; confidence = 50; }
  else if (checks > 1) { likelyRange = 'Marginal/weak showdown hands, backdoor draws'; confidence = 45; }
  if (folds > 0) confidence = Math.max(30, confidence - 10);

  const street = context?.currentRound || 'unknown';
  const summary = `Based on ${street} actions: raises=${raises}, calls=${calls}. Likely range: ${likelyRange}.`;
  return { summary, likelyRange, confidence };
}

function summarizeActions(actions: Array<{ action: ActionType; amount?: number }>) {
  const stats = { raises: 0, allIns: 0, calls: 0, checks: 0, folds: 0 } as Record<string, number>;
  for (const a of actions) {
    if (a.action === 'raise') stats.raises++;
    else if (a.action === 'all-in') stats.allIns++;
    else if (a.action === 'call') stats.calls++;
    else if (a.action === 'check') stats.checks++;
    else if (a.action === 'fold') stats.folds++;
  }
  return stats as { raises: number; allIns: number; calls: number; checks: number; folds: number };
}

function allocateFrequencies({
  primary,
  secondary,
  winProbability,
  potOdds,
  bluffIntent,
}: {
  primary: ActionType;
  secondary?: ActionType;
  winProbability: number;
  potOdds: number;
  bluffIntent: boolean;
}): { primaryFreq: number; secondaryFreq: number } {
  if (!secondary) return { primaryFreq: 100, secondaryFreq: 0 };

  // Base frequency from confidence margin (how far winProb exceeds pot odds)
  const margin = Math.max(0, winProbability - (isFinite(potOdds) ? potOdds : 0));
  let primaryFreq = 60 + Math.min(30, Math.floor(margin / 5)); // 60-90%

  // Bluff intent shifts weight toward aggressive option
  if (bluffIntent) {
    if (isAggressive(primary)) primaryFreq = Math.min(95, primaryFreq + 10);
    else if (isAggressive(secondary)) primaryFreq = Math.max(55, primaryFreq - 15);
  }

  // Clamp and compute secondary
  primaryFreq = Math.max(50, Math.min(95, primaryFreq));
  const secondaryFreq = 100 - primaryFreq;
  return { primaryFreq, secondaryFreq };
}
