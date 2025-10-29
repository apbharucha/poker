export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface PlayerAction {
  playerId: number;
  action: ActionType;
  amount?: number;
  timestamp: number;
}

export interface Player {
  id: number;
  name: string;
  stack: number;
  position: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isActive: boolean;
  currentBet: number;
  handsPlayed: number;
  handsWon: number;
  actions: PlayerAction[];
}

export interface GameSetup {
  numberOfPlayers: number;
  startingBalance: number;
  smallBlind: number;
  bigBlind: number;
  gameVariant: 'no-limit-holdem' | 'pot-limit-omaha';
}

export interface GameState {
  setup: GameSetup;
  players: Player[];
  currentRound: BettingRound | 'showdown';
  pot: number;
  communityCards: Card[];
  userHoleCards: Card[];
  currentHandNumber: number;
  dealerPosition: number;
  smallBlindPosition: number;
  bigBlindPosition: number;
  currentPlayerTurn: number;
  handHistory: HandHistory[];
  bettingComplete: boolean;
  handOutcome?: string;
}

export interface HandHistory {
  handNumber: number;
  winner: number;
  potSize: number;
  actions: PlayerAction[];
}

export interface SecondaryRecommendation {
  action: ActionType;
  betSize?: number;
  reasoning: string;
  frequency?: number; // 0..100
}

export interface AIRecommendation {
  action: ActionType;
  betSize?: number;
  winProbability: number;
  reasoning: string;
  potOdds?: number;
  expectedValue?: number;
  secondary?: SecondaryRecommendation;
  bluffAware?: boolean;
  primaryFrequency?: number; // 0..100
  bluffSuccessOdds?: number; // 0..100 estimated fold equity
  goodForValue?: boolean; // suggests turning off bluff mode
  smartBluff?: boolean; // AI-detected strong bluff opportunity
  smartBluffReason?: string;
  smartBluffAction?: ActionType;
  smartBluffSuccessOdds?: number;
}
