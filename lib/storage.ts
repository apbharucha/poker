import { AIRecommendation, GameState, Player, ActionType } from '@/types/poker';

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

export class PokerDataStorage {
  private readonly HANDS_KEY = 'poker_hands';
  private readonly AI_RECOMMENDATIONS_KEY = 'poker_ai_recommendations';
  private readonly PLAYER_ACTIONS_KEY = 'poker_player_actions';
  private readonly TRAINING_DATA_KEY = 'poker_training_data';
  private readonly BLUFF_STATS_KEY = 'poker_bluff_stats';

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

  // Export data for backup
  public exportData(): string {
    return JSON.stringify({
      hands: this.getHands(),
      aiRecommendations: this.getAIRecommendations(),
      playerActions: this.getPlayerActions(),
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
