import { AIRecommendation, GameState, Player, ActionType, PlayerAnalytics } from '@/types/poker';

export interface StoredHand {
  id: string;
  handNumber: number;
  gameState: GameState;
  communityCards: any[];
  userHoleCards: any[];
  potSize: number;
  bettingRound: string;
  outcome: string;
  timestamp: number;
  players: Player[];
}

export interface StoredAIRecommendation {
  id: string;
  handId: string;
  recommendation: AIRecommendation;
  actualOutcome?: string;
  wasFollowed?: boolean;
  timestamp: number;
}

export interface StoredPlayerAction {
  id: string;
  handId: string;
  playerId: number;
  playerName: string;
  action: ActionType;
  amount: number;
  bettingRound: string;
  position: string;
  stackBefore: number;
  stackAfter: number;
  timestamp: number;
}

export type PlayerTag = 'bluff_success' | 'bluff_fail' | 'agg_weak' | 'value_bet_good' | 'called_bluff';

export class PokerDataStorage {
  private readonly HANDS_KEY = 'poker_hands';
  private readonly AI_RECOMMENDATIONS_KEY = 'poker_ai_recommendations';
  private readonly PLAYER_ACTIONS_KEY = 'poker_player_actions';
  private readonly TRAINING_DATA_KEY = 'poker_training_data';
  private readonly PLAYER_REVEALS_KEY = 'poker_player_reveals';
  private readonly PLAYER_NOTES_KEY = 'poker_player_notes';
  private readonly BLUFF_STATS_KEY = 'poker_bluff_stats';
  private readonly PLAYER_ANALYTICS_KEY = 'poker_player_analytics';
  private readonly PLAYER_CUSTOM_NAMES_KEY = 'poker_player_custom_names';

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Store a complete hand for analysis
  public storeHand(gameState: GameState, outcome: string): string {
    const hands = this.getHands();
    const handId = this.generateId();
    
    const storedHand: StoredHand = {
      id: handId,
      handNumber: gameState.currentHandNumber,
      gameState: JSON.parse(JSON.stringify(gameState)), // Deep clone
      communityCards: gameState.communityCards,
      userHoleCards: gameState.userHoleCards,
      potSize: gameState.pot,
      bettingRound: gameState.currentRound,
      outcome: outcome,
      timestamp: Date.now(),
      players: gameState.players
    };

    hands.push(storedHand);
    localStorage.setItem(this.HANDS_KEY, JSON.stringify(hands));

    // Fire-and-forget backend tracking
    this.postEvent({ type: 'hand_stored', payload: storedHand });

    return handId;
  }

  // Store AI recommendation with context
  public storeAIRecommendation(
    handId: string,
    recommendation: AIRecommendation,
    actualOutcome?: string,
    wasFollowed?: boolean
  ): void {
    const recommendations = this.getAIRecommendations();
    
    const storedRecommendation: StoredAIRecommendation = {
      id: this.generateId(),
      handId: handId,
      recommendation: { ...recommendation },
      actualOutcome: actualOutcome,
      wasFollowed: wasFollowed,
      timestamp: Date.now()
    };

    recommendations.push(storedRecommendation);
    localStorage.setItem(this.AI_RECOMMENDATIONS_KEY, JSON.stringify(recommendations));

    // Fire-and-forget backend tracking
    this.postEvent({ type: 'ai_recommendation', payload: storedRecommendation });
  }

  // Store player action
  public storePlayerAction(
    handId: string,
    playerId: number,
    playerName: string,
    action: ActionType,
    amount: number,
    bettingRound: string,
    position: string,
    stackBefore: number,
    stackAfter: number
  ): void {
    const actions = this.getPlayerActions();
    
    const storedAction: StoredPlayerAction = {
      id: this.generateId(),
      handId: handId,
      playerId: playerId,
      playerName: playerName,
      action: action,
      amount: amount,
      bettingRound: bettingRound,
      position: position,
      stackBefore: stackBefore,
      stackAfter: stackAfter,
      timestamp: Date.now()
    };

    actions.push(storedAction);
    localStorage.setItem(this.PLAYER_ACTIONS_KEY, JSON.stringify(actions));

    // Fire-and-forget backend tracking
    this.postEvent({ type: 'player_action', payload: storedAction });
  }

  // Get stored hands
  public getHands(): StoredHand[] {
    const stored = localStorage.getItem(this.HANDS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Get AI recommendations
  public getAIRecommendations(): StoredAIRecommendation[] {
    const stored = localStorage.getItem(this.AI_RECOMMENDATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Get player actions
  public getPlayerActions(): StoredPlayerAction[] {
    const stored = localStorage.getItem(this.PLAYER_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Get AI training data for learning
  public getTrainingData(limit: number = 1000): any[] {
    const hands = this.getHands();
    const recommendations = this.getAIRecommendations();
    
    const trainingData = hands.slice(-limit).map(hand => {
      const aiRecs = recommendations.filter(rec => rec.handId === hand.id);
      return {
        gameState: hand.gameState,
        communityCards: hand.communityCards,
        userHoleCards: hand.userHoleCards,
        outcome: hand.outcome,
        recommendations: aiRecs.map(rec => ({
          recommendation: rec.recommendation,
          actualOutcome: rec.actualOutcome,
          wasFollowed: rec.wasFollowed
        }))
      };
    });

    return trainingData;
  }

  // Bluff stats
  public getBluffStats(): { attempts: number; successes: number; failures: number } {
    const stored = localStorage.getItem(this.BLUFF_STATS_KEY);
    return stored ? JSON.parse(stored) : { attempts: 0, successes: 0, failures: 0 };
  }

  public recordBluffAttempt(): void {
    const stats = this.getBluffStats();
    stats.attempts += 1;
    localStorage.setItem(this.BLUFF_STATS_KEY, JSON.stringify(stats));
    this.postEvent({ type: 'bluff_attempt' });
  }

  public recordBluffResult(success: boolean): void {
    const stats = this.getBluffStats();
    if (success) stats.successes += 1; else stats.failures += 1;
    localStorage.setItem(this.BLUFF_STATS_KEY, JSON.stringify(stats));
    this.postEvent({ type: 'bluff_result', payload: { success } });
  }

  // Player notes / reads
  public getPlayerNotes(): Record<string, Record<PlayerTag, number>> {
    const raw = localStorage.getItem(this.PLAYER_NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  public addPlayerTag(playerId: number, tag: PlayerTag) {
    const notes = this.getPlayerNotes();
    const key = String(playerId);
    if (!notes[key]) notes[key] = { bluff_success: 0, bluff_fail: 0, agg_weak: 0, value_bet_good: 0, called_bluff: 0 };
    notes[key][tag] = (notes[key][tag] || 0) + 1;
    localStorage.setItem(this.PLAYER_NOTES_KEY, JSON.stringify(notes));
    this.postEvent({ type: 'player_tag', payload: { playerId, tag } });
  }

  // Get statistics for AI improvement
  public getAIAccuracyStats(): any {
    const recommendations = this.getAIRecommendations();
    const validRecs = recommendations.filter(rec => rec.actualOutcome !== undefined);
    
    if (validRecs.length === 0) {
      return {
        totalRecommendations: 0,
        followRate: 0,
        avgConfidence: 0
      };
    }

    const followRate = validRecs.filter(rec => rec.wasFollowed === true).length / validRecs.length;
    const avgConfidence = validRecs.reduce((sum, rec) => sum + rec.recommendation.winProbability, 0) / validRecs.length;

    return {
      totalRecommendations: validRecs.length,
      followRate: followRate,
      avgConfidence: avgConfidence
    };
  }

  // Clear all stored data (for testing)
  public clearAllData(): void {
    localStorage.removeItem(this.HANDS_KEY);
    localStorage.removeItem(this.AI_RECOMMENDATIONS_KEY);
    localStorage.removeItem(this.PLAYER_ACTIONS_KEY);
    localStorage.removeItem(this.TRAINING_DATA_KEY);
    this.postEvent({ type: 'clear_data' });
  }

  // Generic event logger (for backend tracking)
  public logEvent(type: string, payload?: any): void {
    this.postEvent({ type, payload });
  }

  // Revealed hands tracking
  public getPlayerReveals(): Record<string, any[]> {
    const raw = localStorage.getItem(this.PLAYER_REVEALS_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  public recordRevealedHand(playerId: number, holeCards: { suit: string; rank: string }[], context?: any) {
    const reveals = this.getPlayerReveals();
    const key = String(playerId);
    if (!reveals[key]) reveals[key] = [];
    const entry = {
      holeCards,
      context: context || {},
      timestamp: Date.now()
    };
    reveals[key].push(entry);
    localStorage.setItem(this.PLAYER_REVEALS_KEY, JSON.stringify(reveals));
    this.postEvent({ type: 'revealed_hand', payload: { playerId, holeCards, context } });
  }

  public recordDidNotShow(playerId: number) {
    this.postEvent({ type: 'revealed_hand', payload: { playerId, didShow: false } });
  }

  // Player Analytics
  public getPlayerAnalytics(): Record<number, PlayerAnalytics> {
    const raw = localStorage.getItem(this.PLAYER_ANALYTICS_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  public getPlayerAnalyticsById(playerId: number): PlayerAnalytics | null {
    const analytics = this.getPlayerAnalytics();
    return analytics[playerId] || null;
  }

  public updatePlayerAnalytics(playerId: number, analytics: Partial<PlayerAnalytics>): void {
    const allAnalytics = this.getPlayerAnalytics();
    const existing = allAnalytics[playerId] || this.createDefaultAnalytics(playerId);
    
    allAnalytics[playerId] = {
      ...existing,
      ...analytics,
      lastUpdated: Date.now()
    };
    
    localStorage.setItem(this.PLAYER_ANALYTICS_KEY, JSON.stringify(allAnalytics));
    this.postEvent({ type: 'player_analytics_updated', payload: { playerId, analytics } });
  }

  public createDefaultAnalytics(playerId: number, playerName: string = `Player ${playerId}`): PlayerAnalytics {
    return {
      playerId,
      playerName,
      vpip: 0,
      pfr: 0,
      aggressionFactor: 0,
      threeBetPercent: 0,
      foldToCBetPercent: 0,
      cBetPercent: 0,
      vpipByPosition: { EP: 0, MP: 0, LP: 0, BB: 0, SB: 0 },
      pfrByPosition: { EP: 0, MP: 0, LP: 0, BB: 0, SB: 0 },
      wtsd: 0,
      wsd: 0,
      bluffFrequency: 30,
      calldownFrequency: 0,
      foldToAggression: 0,
      handsTracked: 0,
      lastUpdated: Date.now(),
      notes: '',
      tags: []
    };
  }

  // Custom player names
  public getPlayerCustomNames(): Record<number, string> {
    const raw = localStorage.getItem(this.PLAYER_CUSTOM_NAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  public setPlayerCustomName(playerId: number, customName: string): void {
    const names = this.getPlayerCustomNames();
    names[playerId] = customName;
    localStorage.setItem(this.PLAYER_CUSTOM_NAMES_KEY, JSON.stringify(names));
    
    // Also update in analytics
    const analytics = this.getPlayerAnalytics();
    if (analytics[playerId]) {
      analytics[playerId].customName = customName;
      localStorage.setItem(this.PLAYER_ANALYTICS_KEY, JSON.stringify(analytics));
    }
    
    this.postEvent({ type: 'player_name_customized', payload: { playerId, customName } });
  }

  public getPlayerDisplayName(playerId: number, defaultName: string): string {
    const customNames = this.getPlayerCustomNames();
    return customNames[playerId] || defaultName;
  }

  // Export data for backup
  public exportData(): string {
    return JSON.stringify({
      hands: this.getHands(),
      aiRecommendations: this.getAIRecommendations(),
      playerActions: this.getPlayerActions(),
      playerAnalytics: this.getPlayerAnalytics(),
      playerCustomNames: this.getPlayerCustomNames(),
      exportTimestamp: Date.now()
    });
  }

  // Import data from backup
  public importData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      if (data.hands) localStorage.setItem(this.HANDS_KEY, JSON.stringify(data.hands));
      if (data.aiRecommendations) localStorage.setItem(this.AI_RECOMMENDATIONS_KEY, JSON.stringify(data.aiRecommendations));
      if (data.playerActions) localStorage.setItem(this.PLAYER_ACTIONS_KEY, JSON.stringify(data.playerActions));
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid backup data format');
    }
  }
  // Backend event helper
  private postEvent(event: { type: string; payload?: any }) {
    try {
      // Only run in browser
      if (typeof window === 'undefined') return;

      const body = JSON.stringify(event);

      // Try local backend first during dev (CORS enabled on server)
      fetch('http://localhost:4000/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {});

      // Also try Vercel serverless (no-op locally but useful in prod)
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {});

      // sendBeacon fallback for page unload/background
      try {
        if (navigator && 'sendBeacon' in navigator) {
          const blob = new Blob([body], { type: 'application/json' });
          (navigator as any).sendBeacon('http://localhost:4000/events', blob);
        }
      } catch {}
    } catch {}
  }
}

// Singleton instance
let storageInstance: PokerDataStorage | null = null;

export function getDataStorage(): PokerDataStorage {
  if (!storageInstance) {
    storageInstance = new PokerDataStorage();
  }
  return storageInstance;
}
