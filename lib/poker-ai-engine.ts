import { Card, BettingRound, ActionType, AIRecommendation, PlayerAnalytics } from '@/types/poker';
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
  opponentAnalytics?: Record<number, PlayerAnalytics>; // Player analytics for opponent modeling
  opponentStacks?: number[]; // Stack sizes of active opponents for stack psychology
  startingStack?: number; // Starting stack size for context
}

export function generateAIRecommendation(context: GameContext): AIRecommendation {
  const handStrength = calculateHandStrength(context.holeCards, context.communityCards);
  
  // Analyze stack sizes for psychological factors
  const stackPsych = analyzeStackPsychology(
    context.playerStack,
    context.opponentStacks || [],
    context.bigBlind,
    context.startingStack
  );
  
  // Factor in opponent analytics for more accurate win probability
  const opponentProfile = analyzeOpponentTendencies(context.opponentAnalytics);
  const winProbability = estimateWinProbability(
    context.holeCards, 
    context.communityCards, 
    context.activePlayers, 
    context.currentRound,
    opponentProfile,
    stackPsych
  );
  
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
    aggression,
    opponentProfile,
    stackPsych
  );
  
  const reasoning = generateReasoning(
    action,
    handStrength,
    winProbability,
    potOdds,
    context,
    position,
    aggression,
    stackPsych
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

interface OpponentProfile {
  avgVPIP: number;
  avgPFR: number;
  avgAggressionFactor: number;
  avgBluffFrequency: number;
  avgFoldToAggression: number;
  tightness: 'tight' | 'loose' | 'balanced';
  style: 'passive' | 'aggressive' | 'balanced';
}

interface StackPsychology {
  heroStackStatus: 'short' | 'medium' | 'deep';
  opponentStackStatus: 'short' | 'medium' | 'deep' | 'mixed';
  heroBBs: number; // Hero stack in big blinds
  avgOpponentBBs: number; // Average opponent stack in BBs
  desperation: number; // 0-100, how desperate short stacks are
  intimidation: number; // 0-100, how intimidating deep stacks are
  shortStackPresent: boolean;
  deepStackPresent: boolean;
  stackPressure: 'facing-deep' | 'facing-short' | 'balanced';
}

function analyzeOpponentTendencies(
  analytics: Record<number, PlayerAnalytics> | undefined
): OpponentProfile {
  if (!analytics || Object.keys(analytics).length === 0) {
    // Default balanced profile
    return {
      avgVPIP: 25,
      avgPFR: 15,
      avgAggressionFactor: 1.5,
      avgBluffFrequency: 30,
      avgFoldToAggression: 50,
      tightness: 'balanced',
      style: 'balanced'
    };
  }
  
  const players = Object.values(analytics);
  const avgVPIP = players.reduce((sum, p) => sum + p.vpip, 0) / players.length;
  const avgPFR = players.reduce((sum, p) => sum + p.pfr, 0) / players.length;
  const avgAggressionFactor = players.reduce((sum, p) => sum + p.aggressionFactor, 0) / players.length;
  const avgBluffFrequency = players.reduce((sum, p) => sum + p.bluffFrequency, 0) / players.length;
  const avgFoldToAggression = players.reduce((sum, p) => sum + p.foldToAggression, 0) / players.length;
  
  const tightness = avgVPIP < 20 ? 'tight' : avgVPIP > 30 ? 'loose' : 'balanced';
  const style = avgAggressionFactor > 2 || avgPFR > 18 ? 'aggressive' : avgAggressionFactor < 1 ? 'passive' : 'balanced';
  
  return {
    avgVPIP,
    avgPFR,
    avgAggressionFactor,
    avgBluffFrequency,
    avgFoldToAggression,
    tightness,
    style
  };
}

function analyzeStackPsychology(
  heroStack: number,
  opponentStacks: number[],
  bigBlind: number,
  startingStack?: number
): StackPsychology {
  const heroBBs = heroStack / bigBlind;
  const opponentBBs = opponentStacks.map(s => s / bigBlind);
  const avgOpponentBBs = opponentBBs.length > 0 ? opponentBBs.reduce((a, b) => a + b, 0) / opponentBBs.length : 0;
  
  // Classify hero stack
  const heroStackStatus: 'short' | 'medium' | 'deep' = 
    heroBBs < 20 ? 'short' : heroBBs < 50 ? 'medium' : 'deep';
  
  // Classify opponent stacks
  const shortStackPresent = opponentBBs.some(bb => bb < 20);
  const deepStackPresent = opponentBBs.some(bb => bb > 50);
  
  let opponentStackStatus: 'short' | 'medium' | 'deep' | 'mixed';
  if (opponentBBs.length === 0) {
    opponentStackStatus = 'medium';
  } else if (shortStackPresent && deepStackPresent) {
    opponentStackStatus = 'mixed';
  } else if (avgOpponentBBs < 20) {
    opponentStackStatus = 'short';
  } else if (avgOpponentBBs > 50) {
    opponentStackStatus = 'deep';
  } else {
    opponentStackStatus = 'medium';
  }
  
  // Calculate desperation (higher when short-stacked, especially with losses)
  let desperation = 0;
  if (heroBBs < 20) {
    desperation = 50 + (20 - heroBBs) * 2.5; // 50-100 range for short stacks
    // Increase desperation if lost significant chips from starting stack
    if (startingStack && heroStack < startingStack * 0.5) {
      desperation = Math.min(100, desperation + 20);
    }
  } else if (heroBBs < 30) {
    desperation = 20 + (30 - heroBBs) * 2; // 20-40 range for medium-short
  }
  
  // Calculate intimidation (how threatening deep stacks are)
  let intimidation = 0;
  if (deepStackPresent) {
    const maxOpponentBBs = Math.max(...opponentBBs);
    if (maxOpponentBBs > heroBBs * 2) {
      intimidation = 40 + Math.min(40, (maxOpponentBBs / heroBBs - 2) * 10);
    } else if (maxOpponentBBs > heroBBs) {
      intimidation = 20 + (maxOpponentBBs / heroBBs - 1) * 20;
    }
  }
  
  // Determine stack pressure situation
  let stackPressure: 'facing-deep' | 'facing-short' | 'balanced';
  if (avgOpponentBBs > heroBBs * 1.5) {
    stackPressure = 'facing-deep';
  } else if (avgOpponentBBs < heroBBs * 0.67) {
    stackPressure = 'facing-short';
  } else {
    stackPressure = 'balanced';
  }
  
  return {
    heroStackStatus,
    opponentStackStatus,
    heroBBs,
    avgOpponentBBs,
    desperation,
    intimidation,
    shortStackPresent,
    deepStackPresent,
    stackPressure
  };
}

function estimateWinProbability(
  holeCards: Card[],
  communityCards: Card[],
  activePlayers: number,
  round: BettingRound,
  opponentProfile?: OpponentProfile,
  stackPsych?: StackPsychology
): number {
  const baseStrength = calculateHandStrength(holeCards, communityCards);
  
  let opponentAdjustment = 1 - ((activePlayers - 1) * 0.08);
  
  // Adjust based on opponent tendencies
  if (opponentProfile) {
    // Against tight players, your marginal hands have more value (they fold more)
    if (opponentProfile.tightness === 'tight') {
      opponentAdjustment *= 1.05; // Boost win probability slightly
    }
    // Against loose players, your marginal hands have less value
    else if (opponentProfile.tightness === 'loose') {
      opponentAdjustment *= 0.95;
    }
    
    // Against aggressive players, reduce confidence in marginal holdings
    if (opponentProfile.style === 'aggressive' && baseStrength < 0.6) {
      opponentAdjustment *= 0.93;
    }
    // Against passive players, marginal hands are safer
    else if (opponentProfile.style === 'passive') {
      opponentAdjustment *= 1.03;
    }
  }
  
  let roundMultiplier = 1.0;
  if (round === 'preflop') roundMultiplier = 0.85;
  else if (round === 'flop') roundMultiplier = 0.90;
  else if (round === 'turn') roundMultiplier = 0.95;
  else if (round === 'river') roundMultiplier = 1.0;
  
  // Adjust for stack psychology
  let stackAdjustment = 1.0;
  if (stackPsych) {
    // Short stacks are more likely to make desperate moves and bluff
    // Against short stacks with decent hands, your win rate increases slightly
    if (stackPsych.shortStackPresent && baseStrength >= 0.50) {
      stackAdjustment *= 1.03; // +3% against short stacks with decent holdings
    }
    
    // Deep stacks can apply more pressure and see more streets
    // Reduce confidence slightly against deep stacks with marginal hands
    if (stackPsych.deepStackPresent && baseStrength < 0.60) {
      stackAdjustment *= 0.97; // -3% against deep stacks with marginal holdings
    }
    
    // When you're short-stacked, desperation affects perception
    // But actually marginal hands decrease in value (you need to pick better spots)
    if (stackPsych.heroStackStatus === 'short' && baseStrength < 0.55) {
      stackAdjustment *= 0.95; // Be more conservative when short
    }
  }
  
  const winProb = baseStrength * opponentAdjustment * stackAdjustment * roundMultiplier * 100;
  
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
  _aggression: number,
  opponentProfile?: OpponentProfile,
  stackPsych?: StackPsychology
): { type: ActionType; amount?: number } {
  // Note: context.currentBet should represent the amount to call for the hero
  const callAmount = context.currentBet;
  const minRaise = Math.max(context.bigBlind * 2, callAmount * 2);
  const potRaise = Math.floor(context.pot * 0.75);
  const noBetToCall = callAmount === 0;

  // ========== STACK PSYCHOLOGY ADJUSTMENTS ==========
  // Comprehensive stack-based strategic adjustments
  let stackSizingMultiplier = 1.0;
  let stackBasedBluffIncentive = 0; // -100 to +100
  let stackBasedCallThreshold = context.bigBlind * 2; // Base calling threshold
  
  if (stackPsych) {
    // === HERO IS SHORT-STACKED (< 20 BBs) ===
    if (stackPsych.heroStackStatus === 'short') {
      // Short stacks need to pick spots carefully and commit when they do
      // Increase bet sizes when betting (all-or-nothing mentality)
      stackSizingMultiplier = 1.3;
      
      // Push/fold strategy: More willing to go all-in with decent hands
      if (handStrength >= 0.50 && context.playerStack < context.bigBlind * 15) {
        // Very short: shove-or-fold mode with any decent hand
        if (!noBetToCall && callAmount >= context.playerStack * 0.5) {
          // Already committed, might as well shove
          return { type: 'all-in' };
        }
      }
      
      // Tighter calling ranges when short (need better spots)
      stackBasedCallThreshold *= 0.75;
      
      // Less bluffing when short (can't afford to waste chips)
      stackBasedBluffIncentive -= 30;
    }
    
    // === HERO IS DEEP-STACKED (> 50 BBs) ===
    else if (stackPsych.heroStackStatus === 'deep') {
      // Deep stacks can apply more pressure and play more streets
      // Use stack leverage to apply pressure
      stackSizingMultiplier = 0.9; // Slightly smaller bets to get calls
      
      // More willing to call with drawing hands (implied odds)
      stackBasedCallThreshold *= 1.2;
      
      // Can afford to bluff more
      stackBasedBluffIncentive += 20;
    }
    
    // === FACING SHORT-STACKED OPPONENTS ===
    if (stackPsych.shortStackPresent) {
      // Short stacks are more likely to:
      // 1. Shove with marginal hands (desperation)
      // 2. Call with weaker hands (pot committed)
      // 3. Bluff more frequently (trying to rebuild)
      
      // With strong hands, bet bigger against short stacks
      // They're more likely to call out of desperation
      if (handStrength >= 0.65 && winProbability >= 65) {
        stackSizingMultiplier *= 1.25; // +25% sizing for value
      }
      
      // Be more cautious calling short stack shoves without premium
      // They're often desperate and gambling
      if (!noBetToCall && callAmount >= context.pot * 0.8) {
        // Facing a big bet from short stack - they're likely committed or bluffing
        if (handStrength < 0.60) {
          // Tighter calls against short stack aggression
          stackBasedCallThreshold *= 0.80;
        }
      }
      
      // Bluff less against short stacks (they call lighter out of desperation)
      stackBasedBluffIncentive -= 15;
    }
    
    // === FACING DEEP-STACKED OPPONENTS ===
    if (stackPsych.deepStackPresent || stackPsych.stackPressure === 'facing-deep') {
      // Deep stacks can:
      // 1. Apply maximum pressure on multiple streets
      // 2. Make bigger bets to push you off marginal hands
      // 3. Have better implied odds
      
      // With strong hands, extract value over multiple streets
      // Smaller bets to keep them in
      if (handStrength >= 0.70 && context.currentRound !== 'river') {
        stackSizingMultiplier *= 0.85; // -15% to string them along
      }
      
      // Be more careful with marginal hands against deep stacks
      // They can punish you on later streets
      if (handStrength < 0.55 && winProbability < 60) {
        stackBasedCallThreshold *= 0.85; // Tighter calls
      }
      
      // Deep stacks are intimidating - bluff slightly less
      // They can afford to call you down
      stackBasedBluffIncentive -= 10;
    }
    
    // === STACK RATIO EXPLOITATION ===
    // When you have a stack advantage, use it
    if (stackPsych.stackPressure === 'facing-short') {
      // You're the big stack - you can bully
      stackBasedBluffIncentive += 25;
      
      // Apply pressure with medium-strength hands
      if (handStrength >= 0.45 && handStrength < 0.65) {
        stackSizingMultiplier *= 1.15; // Bigger bets to pressure short stacks
      }
    }
    
    // === DESPERATION FACTOR ===
    // When hero is desperate (short and losing), adjust strategy
    if (stackPsych.desperation > 50) {
      // High desperation: need to make something happen
      // BUT be smart about it - don't spew
      
      // More willing to gamble with decent holdings
      if (handStrength >= 0.40 && !noBetToCall && callAmount <= context.playerStack) {
        // Call wider when desperate (need to double up)
        stackBasedCallThreshold *= 1.3;
      }
      
      // More aggressive with any playable hand
      if (handStrength >= 0.35 && noBetToCall) {
        stackBasedBluffIncentive += 20;
      }
    }
    
    // === INTIMIDATION FACTOR ===
    // When facing much bigger stacks, play tighter
    if (stackPsych.intimidation > 40) {
      // Being intimidated - tighten up
      stackBasedCallThreshold *= 0.90;
      stackBasedBluffIncentive -= 15;
    }
  }
  
  // Apply stack-based bluff adjustments to context bluffing logic
  // const enhancedBluffIntent = context.bluffIntent && stackBasedBluffIncentive > -50;
  // const shouldReduceBluffSize = stackBasedBluffIncentive < -20;

  // Preflop-specific strategy adjustments to avoid overly tight folds
  if (context.currentRound === 'preflop') {
    // Premium hands: open/3-bet aggressively
    if (handStrength >= 0.75) {
      const betAmount = Math.min(context.playerStack, Math.max(3 * context.bigBlind, potRaise));
      if (betAmount >= context.playerStack) return { type: 'all-in' };
      // Use 'raise' preflop even when opening (since blinds are posted)
      return { type: 'raise', amount: Math.max(3 * context.bigBlind, betAmount) };
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
    // Against tight opponents, bluff more aggressively (they fold more)
    const bluffMultiplier = opponentProfile?.tightness === 'tight' ? 1.2 : 
                           opponentProfile?.tightness === 'loose' ? 0.85 : 1.0;
    
    // Against high fold-to-aggression opponents, smaller bluffs work
    const sizingFactor = opponentProfile && opponentProfile.avgFoldToAggression > 60 ? 0.5 : 0.7;
    
    if (context.forceBluff) {
      if (noBetToCall) {
        const betAmount = Math.max(minRaise, Math.floor(context.pot * (0.5 * bluffMultiplier)));
        // Postflop with no bet: use 'bet', not 'raise'
        const actionType = context.currentRound === 'preflop' ? 'raise' : 'bet';
        return { type: actionType, amount: Math.min(betAmount, context.playerStack) };
      }
      // Facing a bet: choose raise or shove based on stack/pot
      const raiseAmount = Math.max(minRaise, Math.floor(Math.max(context.pot * sizingFactor, callAmount * 2.5)));
      if (raiseAmount >= context.playerStack || context.playerStack <= context.pot) {
        return { type: 'all-in' };
      }
      return { type: 'raise', amount: Math.min(raiseAmount, context.playerStack) };
    }

    // Non-forced bluff bias (allowed to fold later if terrible)
    if (noBetToCall) {
      const betAmount = Math.max(minRaise, Math.floor(context.pot * 0.6));
      const actionType = context.currentRound === 'preflop' ? 'raise' : 'bet';
      return { type: actionType, amount: Math.min(betAmount, context.playerStack) };
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
    if (noBetToCall) {
      // No bet yet: use 'bet' postflop, 'raise' preflop (blinds count as bets)
      let betAmount = Math.max(minRaise, potRaise);
      // Apply stack psychology sizing
      betAmount = Math.floor(betAmount * stackSizingMultiplier);
      if (betAmount >= context.playerStack) {
        return { type: 'all-in' };
      }
      const actionType = context.currentRound === 'preflop' ? 'raise' : 'bet';
      return { type: actionType, amount: Math.min(betAmount, context.playerStack) };
    }
    // Facing a bet: raise
    let raiseAmount = Math.max(minRaise, potRaise);
    raiseAmount = Math.floor(raiseAmount * stackSizingMultiplier);
    if (raiseAmount >= context.playerStack) {
      return { type: 'all-in' };
    }
    return { type: 'raise', amount: Math.min(raiseAmount, context.playerStack) };
  }
  
  if (winProbability >= 60 || handStrength >= 0.65) {
    if (noBetToCall) {
      let betAmount = Math.floor(context.pot * 0.5);
      betAmount = Math.floor(betAmount * stackSizingMultiplier);
      const actionType = context.currentRound === 'preflop' ? 'raise' : 'bet';
      return { type: actionType, amount: Math.max(context.bigBlind, Math.min(betAmount, context.playerStack)) };
    }
    
    if (potOdds > 0 && winProbability > potOdds) {
      return { type: 'call', amount: callAmount };
    }
    
    // Use stack-based call threshold instead of fixed amount
    if (callAmount <= Math.max(context.bigBlind * 3, stackBasedCallThreshold)) {
      return { type: 'call', amount: callAmount };
    }
    
    return { type: 'fold' };
  }
  
  if (winProbability >= 40 || handStrength >= 0.45) {
    if (noBetToCall) {
      return { type: 'check' };
    }
    
    // Against passive players, call wider with marginal hands
    let callThreshold = opponentProfile?.style === 'passive' ? context.bigBlind * 2.5 : context.bigBlind * 2;
    // Factor in stack-based calling adjustments
    callThreshold = Math.max(callThreshold, stackBasedCallThreshold);
    
    if (potOdds > 0 && winProbability > potOdds && callAmount <= callThreshold) {
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
  _aggression: number,
  stackPsych?: StackPsychology
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
  } else if (action.type === 'bet') {
    reasoning += `Betting is recommended to build the pot and put pressure on opponents. `;
    if (action.amount) {
      reasoning += `A bet of $${action.amount} represents good value based on pot size.`;
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
  
  // Add stack psychology insights
  if (stackPsych) {
    const heroBBs = stackPsych.heroBBs.toFixed(1);
    const avgOppBBs = stackPsych.avgOpponentBBs.toFixed(1);
    
    // Hero stack status insights
    if (stackPsych.heroStackStatus === 'short') {
      reasoning += ` You're short-stacked (${heroBBs} BBs) - pick your spots carefully.`;
      if (stackPsych.desperation > 60) {
        reasoning += ` High desperation: need to double up, but avoid spewing chips.`;
      }
    } else if (stackPsych.heroStackStatus === 'deep') {
      reasoning += ` You have a deep stack (${heroBBs} BBs) - use it to apply pressure.`;
    }
    
    // Opponent stack insights
    if (stackPsych.shortStackPresent) {
      reasoning += ` Short-stacked opponents present - they're more likely to call/shove out of desperation.`;
      if (action.type === 'bet' || action.type === 'raise') {
        reasoning += ` Sized larger for value against short stacks who may feel pot-committed.`;
      }
    }
    
    if (stackPsych.stackPressure === 'facing-deep') {
      reasoning += ` Facing deep-stacked opponents (avg ${avgOppBBs} BBs) - they can apply pressure on multiple streets.`;
    } else if (stackPsych.stackPressure === 'facing-short') {
      reasoning += ` You have the stack advantage - bully short stacks with aggression.`;
    }
    
    // Intimidation warnings
    if (stackPsych.intimidation > 50) {
      reasoning += ` Facing much bigger stacks - play tighter and avoid marginal spots.`;
    }
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
    if (primary.type === 'bet' || primary.type === 'raise') {
      // Alternative: shove or a different sizing
      if (primary.amount && primary.amount < context.playerStack) {
        return alt('all-in', undefined, 'Bluff line alternative: maximize fold equity with a shove.');
      }
      const r = Math.max(context.bigBlind * 3, Math.floor(context.pot * 0.5));
      const actionType = noBetToCall && context.currentRound !== 'preflop' ? 'bet' : 'raise';
      return alt(actionType, Math.min(context.playerStack, r), 'Bluff line alternative: vary sizing to maintain pressure.');
    }
    if (primary.type === 'check' || primary.type === 'call') {
      const r = Math.max(context.bigBlind * 3, Math.floor(context.pot * 0.6));
      const actionType = noBetToCall && context.currentRound !== 'preflop' ? 'bet' : 'raise';
      return alt(actionType, Math.min(context.playerStack, r), `Bluff line alternative: convert to a bluff ${actionType}.`);
    }
    if (primary.type === 'fold') {
      const r = Math.max(context.bigBlind * 3, Math.floor(context.pot * 0.6));
      const actionType = noBetToCall && context.currentRound !== 'preflop' ? 'bet' : 'all-in';
      return alt(actionType, noBetToCall ? Math.min(context.playerStack, r) : undefined, 'Bluff line alternative: apply maximum pressure.');
    }
  }

  // Non-bluff secondary: provide a more conservative/aggressive counterpart
  if (primary.type === 'bet' || primary.type === 'raise') {
    return alt('call', undefined, 'Alternative: take a lower-variance line by calling.');
  }
  if (primary.type === 'call') {
    const r = Math.max(context.bigBlind * 2, Math.floor(context.pot * 0.4));
    const actionType = noBetToCall && context.currentRound !== 'preflop' ? 'bet' : 'raise';
    return alt(actionType, Math.min(context.playerStack, r), `Alternative: seize initiative with a value/protection ${actionType}.`);
  }
  if (primary.type === 'check') {
    const r = Math.max(context.bigBlind * 2, Math.floor(context.pot * 0.33));
    const actionType = context.currentRound === 'preflop' ? 'raise' : 'bet';
    return alt(actionType, Math.min(context.playerStack, r), 'Alternative: apply pressure with a small probe bet.');
  }
  if (primary.type === 'fold') {
    return noBetToCall ? alt('check', undefined, 'Alternative: check back for free equity realization.') : alt('call', undefined, 'Alternative: call if pot odds are close.');
  }

  return null;
}

function isAggressive(action: ActionType): boolean {
  return action === 'bet' || action === 'raise' || action === 'all-in';
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

export function generatePlayerInsight(
  playerActions: Array<{ action: ActionType; amount?: number }>, 
  context: any,
  playerAnalytics?: PlayerAnalytics
): {
  summary: string; 
  likelyRange: string; 
  confidence: number;
  possibleHands: string[];
  bluffLikelihood: number;
  bluffReasoning: string;
  detailedAnalysis: string;
} {
  const raises = playerActions.filter(a => a.action === 'raise' || a.action === 'bet' || a.action === 'all-in').length;
  const calls = playerActions.filter(a => a.action === 'call').length;
  const checks = playerActions.filter(a => a.action === 'check').length;
  // const folds = playerActions.filter(a => a.action === 'fold').length;
  const allIns = playerActions.filter(a => a.action === 'all-in').length;

  let likelyRange = 'Wide, mixed strength';
  let confidence = 40;
  let possibleHands: string[] = [];
  let bluffLikelihood = playerAnalytics?.bluffFrequency || 30; // Use tracked bluff frequency or baseline
  let suspiciousActions: string[] = [];
  
  // Adjust initial assessments based on player analytics
  if (playerAnalytics && playerAnalytics.handsTracked > 10) {
    // Player has enough tracked hands for reliable stats
    if (playerAnalytics.vpip < 20 && playerAnalytics.pfr < 15) {
      // Tight player - when they act, it's more meaningful
      confidence += 10;
      suspiciousActions.push(`tight player (VPIP ${playerAnalytics.vpip}%)`);
    } else if (playerAnalytics.vpip > 35) {
      // Loose player - actions less reliable
      confidence -= 5;
      suspiciousActions.push(`loose player (VPIP ${playerAnalytics.vpip}%)`);
    }
    
    // Aggression factor influences bluff likelihood
    if (playerAnalytics.aggressionFactor > 2.5) {
      bluffLikelihood += 10;
      suspiciousActions.push(`high aggression factor (${playerAnalytics.aggressionFactor.toFixed(1)})`);
    } else if (playerAnalytics.aggressionFactor < 1) {
      bluffLikelihood -= 10;
    }
  }
  
  const street = context?.currentRound || 'unknown';
  // const communityCards = context?.communityCards || [];
  // const hasFlushDraw = communityCards.length >= 3;
  // const hasStraightPossible = communityCards.length >= 3;
  
  // Analyze betting patterns
  if (raises >= 3) {
    likelyRange = 'Premium hands (AA, KK, QQ) or very strong made hands';
    possibleHands = ['Pocket Aces', 'Pocket Kings', 'Pocket Queens', 'Top Set', 'Straight', 'Flush'];
    confidence = 75;
    bluffLikelihood = 15;
  } else if (raises === 2) {
    likelyRange = 'Strong hands (TT+, AK, AQ) or strong draws';
    possibleHands = ['Overpair', 'Top Pair Top Kicker', 'Two Pair', 'Flush Draw', 'Straight Draw'];
    confidence = 65;
    bluffLikelihood = 25;
  } else if (raises === 1 && calls >= 2) {
    likelyRange = 'Top pairs, draws, or mid pairs';
    possibleHands = ['Top Pair', 'Pocket Pair', 'Flush Draw', 'Straight Draw', 'Middle Pair'];
    confidence = 55;
    bluffLikelihood = 35;
    if (calls > raises) suspiciousActions.push('passive play after initial aggression');
  } else if (raises === 1 && calls === 0) {
    likelyRange = 'Polarized: very strong OR bluffing';
    possibleHands = ['Strong Made Hand', 'Overpair', 'Set', 'Air/Bluff', 'Weak Draw'];
    confidence = 50;
    bluffLikelihood = 45;
    suspiciousActions.push('single aggressive action with no follow-up');
  } else if (calls >= 3) {
    likelyRange = 'Drawing hands or weak made hands';
    possibleHands = ['Flush Draw', 'Straight Draw', 'Weak Pair', 'Ace High', 'Gutshot'];
    confidence = 55;
    bluffLikelihood = 40;
    suspiciousActions.push('consistent calling suggests drawing or pot control');
  } else if (checks >= 2 && raises === 0) {
    likelyRange = 'Weak showdown value or marginal hands';
    possibleHands = ['Weak Pair', 'Ace High', 'King High', 'Backdoor Draw', 'Nothing'];
    confidence = 50;
    bluffLikelihood = 50;
    suspiciousActions.push('excessive checking indicates weakness or trap');
  } else if (allIns > 0) {
    likelyRange = 'Polarized: nuts or complete bluff';
    possibleHands = ['Top Set', 'Straight', 'Flush', 'Overpair', 'Total Bluff'];
    confidence = 45;
    bluffLikelihood = street === 'river' ? 55 : 35;
    suspiciousActions.push('all-in move is highly polarizing');
  }
  
  // Adjust bluff likelihood based on street
  if (street === 'preflop') {
    bluffLikelihood = Math.max(20, bluffLikelihood - 15);
  } else if (street === 'river') {
    bluffLikelihood = Math.min(70, bluffLikelihood + 15);
    if (raises > 0 && calls === 0) {
      suspiciousActions.push('river aggression without prior commitment');
      bluffLikelihood = Math.min(75, bluffLikelihood + 10);
    }
  }
  
  // Check-raise detection
  const hasCheckRaise = playerActions.findIndex(a => a.action === 'check') < playerActions.findIndex(a => a.action === 'raise' || a.action === 'bet');
  if (hasCheckRaise && playerActions.length >= 2) {
    suspiciousActions.push('check-raise detected - could be trap or bluff');
    bluffLikelihood = 40; // balanced
  }
  
  // Sizing tells
  const largeBets = playerActions.filter(a => (a.action === 'raise' || a.action === 'bet') && a.amount && a.amount > 50).length;
  if (largeBets >= 2) {
    suspiciousActions.push('oversized bets may indicate polarization');
    bluffLikelihood = Math.min(65, bluffLikelihood + 10);
  }
  
  // Generate bluff reasoning
  let bluffReasoning = '';
  if (bluffLikelihood >= 60) {
    bluffReasoning = `High bluff likelihood (${bluffLikelihood}%). `;
    if (suspiciousActions.length > 0) {
      bluffReasoning += `Suspicious actions: ${suspiciousActions.join('; ')}. `;
    }
    bluffReasoning += `Betting pattern suggests polarized range with significant bluff component.`;
  } else if (bluffLikelihood >= 40) {
    bluffReasoning = `Moderate bluff likelihood (${bluffLikelihood}%). `;
    if (suspiciousActions.length > 0) {
      bluffReasoning += `Notable actions: ${suspiciousActions.join('; ')}. `;
    }
    bluffReasoning += `Actions indicate mixed range of value and bluffs.`;
  } else {
    bluffReasoning = `Low bluff likelihood (${bluffLikelihood}%). `;
    bluffReasoning += `Betting pattern suggests genuine strength. `;
    if (suspiciousActions.length > 0) {
      bluffReasoning += `However: ${suspiciousActions.join('; ')}.`;
    }
  }
  
  // Generate detailed analysis
  let detailedAnalysis = `On ${street.toUpperCase()}: ${raises} raises/bets, ${calls} calls, ${checks} checks. `;
  detailedAnalysis += `Player shows ${raises + allIns >= 2 ? 'strong aggression' : raises + allIns === 1 ? 'selective aggression' : 'passive play'}. `;
  
  if (hasFlushDraw && communityCards.length >= 3) {
    const suits = communityCards.map((c: any) => c.suit);
    const suitCounts = new Map<string, number>();
    suits.forEach((s: string) => suitCounts.set(s, (suitCounts.get(s) || 0) + 1));
    const maxSuit = Math.max(...Array.from(suitCounts.values()));
    if (maxSuit >= 3) {
      detailedAnalysis += `Board shows flush draw potential (${maxSuit} suited cards). `;
      if (raises > 0) {
        possibleHands.push('Flush Draw');
      }
    }
  }
  
  detailedAnalysis += `Range confidence: ${confidence}%. Most likely holdings: ${possibleHands.slice(0, 3).join(', ')}.`;
  
  const summary = `${likelyRange}. Actions suggest ${bluffLikelihood >= 50 ? 'possible bluff' : 'likely value'}.`;
  
  return { 
    summary, 
    likelyRange, 
    confidence,
    possibleHands,
    bluffLikelihood,
    bluffReasoning,
    detailedAnalysis
  };
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
