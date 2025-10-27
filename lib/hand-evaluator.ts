import { Card, Rank } from '@/types/poker';

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export enum HandRank {
  HIGH_CARD = 1,
  PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10,
}

export interface HandEvaluation {
  rank: HandRank;
  value: number;
  description: string;
}

export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    return { rank: HandRank.HIGH_CARD, value: 0, description: 'Incomplete hand' };
  }

  const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(ranks);
  const rankCounts = countRanks(ranks);
  
  if (isStraight && isFlush && ranks[0] === 14) {
    return { rank: HandRank.ROYAL_FLUSH, value: 10000, description: 'Royal Flush' };
  }
  
  if (isStraight && isFlush) {
    return { rank: HandRank.STRAIGHT_FLUSH, value: 9000 + ranks[0], description: 'Straight Flush' };
  }
  
  if (rankCounts.fourOfKind) {
    return { rank: HandRank.FOUR_OF_KIND, value: 8000 + rankCounts.fourOfKind, description: 'Four of a Kind' };
  }
  
  if (rankCounts.threeOfKind && rankCounts.pair) {
    return { rank: HandRank.FULL_HOUSE, value: 7000 + rankCounts.threeOfKind, description: 'Full House' };
  }
  
  if (isFlush) {
    return { rank: HandRank.FLUSH, value: 6000 + ranks[0], description: 'Flush' };
  }
  
  if (isStraight) {
    return { rank: HandRank.STRAIGHT, value: 5000 + ranks[0], description: 'Straight' };
  }
  
  if (rankCounts.threeOfKind) {
    return { rank: HandRank.THREE_OF_KIND, value: 4000 + rankCounts.threeOfKind, description: 'Three of a Kind' };
  }
  
  if (rankCounts.pairs >= 2) {
    return { rank: HandRank.TWO_PAIR, value: 3000 + Math.max(...rankCounts.pairValues), description: 'Two Pair' };
  }
  
  if (rankCounts.pair) {
    return { rank: HandRank.PAIR, value: 2000 + rankCounts.pair, description: 'Pair' };
  }
  
  return { rank: HandRank.HIGH_CARD, value: 1000 + ranks[0], description: `High Card: ${ranks[0]}` };
}

function checkStraight(ranks: number[]): boolean {
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  if (uniqueRanks.length < 5) return false;
  
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) return true;
  }
  
  if (uniqueRanks.includes(14) && uniqueRanks.includes(5) && uniqueRanks.includes(4) && 
      uniqueRanks.includes(3) && uniqueRanks.includes(2)) {
    return true;
  }
  
  return false;
}

function countRanks(ranks: number[]): {
  pair: number;
  pairs: number;
  pairValues: number[];
  threeOfKind: number;
  fourOfKind: number;
} {
  const counts = new Map<number, number>();
  ranks.forEach(r => counts.set(r, (counts.get(r) || 0) + 1));
  
  let pair = 0;
  let pairs = 0;
  const pairValues: number[] = [];
  let threeOfKind = 0;
  let fourOfKind = 0;
  
  counts.forEach((count, rank) => {
    if (count === 2) {
      if (!pair) pair = rank;
      pairs++;
      pairValues.push(rank);
    }
    if (count === 3) threeOfKind = rank;
    if (count === 4) fourOfKind = rank;
  });
  
  return { pair, pairs, pairValues, threeOfKind, fourOfKind };
}

export function getBestHand(holeCards: Card[], communityCards: Card[]): HandEvaluation {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    return evaluateHand(allCards);
  }
  
  let bestHand: HandEvaluation = { rank: HandRank.HIGH_CARD, value: 0, description: '' };
  
  const combinations = getCombinations(allCards, 5);
  for (const combo of combinations) {
    const evaluation = evaluateHand(combo);
    if (evaluation.value > bestHand.value) {
      bestHand = evaluation;
    }
  }
  
  return bestHand;
}

function getCombinations<T>(arr: T[], size: number): T[][] {
  if (size > arr.length || size <= 0) return [];
  if (size === arr.length) return [arr];
  
  const results: T[][] = [];
  
  function combine(start: number, combo: T[]) {
    if (combo.length === size) {
      results.push([...combo]);
      return;
    }
    
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  
  combine(0, []);
  return results;
}
