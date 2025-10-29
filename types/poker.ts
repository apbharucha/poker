export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface PlayerAction {
  playerId: number;
  action: ActionType;
  amount?: number;
  timestamp: number;
}

export interface Player {
  id: number;
  name: string;
  customName?: string; // User-defined name for this player
  stack: number;
  position: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isActive: boolean;
  isAway?: boolean; // Player is in away mode (idle)
  currentBet: number;
  handsPlayed: number;
  handsWon: number;
  actions: PlayerAction[];
}

export interface PlayerAnalytics {
  playerId: number;
  playerName: string;
  customName?: string;
  
  // Core stats
  vpip: number; // Voluntarily Put $ In Pot %
  pfr: number; // Pre-Flop Raise %
  aggressionFactor: number; // (Bet + Raise) / Call ratio
  threeBetPercent: number; // 3-bet %
  foldToCBetPercent: number; // Fold to continuation bet %
  cBetPercent: number; // Continuation bet %
  
  // Positional stats
  vpipByPosition: Record<string, number>; // VPIP by position (EP, MP, LP, BB, SB)
  pfrByPosition: Record<string, number>;
  
  // Showdown stats
  wtsd: number; // Went to Showdown %
  wsd: number; // Won at Showdown %
  
  // Tendency indicators
  bluffFrequency: number; // Estimated bluff frequency (0-100)
  calldownFrequency: number; // How often they call to showdown
  foldToAggression: number; // How often they fold when facing aggression
  
  // Hand count for stat reliability
  handsTracked: number;
  lastUpdated: number;
  
  // Notes
  notes?: string;
  tags?: string[]; // e.g., ['tight', 'aggressive', 'bluffs_river']
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
