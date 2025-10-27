import sqlite3 from 'sqlite3';
import { AIRecommendation, HandHistory, GameState } from '@/types/poker';

export class PokerDatabase {
  private db: sqlite3.Database;

  constructor(dbPath: string = './poker_data.db') {
    this.db = new sqlite3.Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    // Table for storing hand data
    this.db.run(`
      CREATE TABLE IF NOT EXISTS hands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hand_number INTEGER,
        game_state TEXT,
        community_cards TEXT,
        user_hole_cards TEXT,
        pot_size INTEGER,
        betting_round TEXT,
        outcome TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table for AI recommendations
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ai_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hand_id INTEGER,
        recommendation TEXT,
        win_probability REAL,
        reasoning TEXT,
        pot_odds REAL,
        expected_value REAL,
        actual_outcome TEXT,
        was_followed BOOLEAN,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hand_id) REFERENCES hands (id)
      )
    `);

    // Table for player actions
    this.db.run(`
      CREATE TABLE IF NOT EXISTS player_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hand_id INTEGER,
        player_id INTEGER,
        player_name TEXT,
        action TEXT,
        amount INTEGER,
        betting_round TEXT,
        position TEXT,
        stack_before INTEGER,
        stack_after INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hand_id) REFERENCES hands (id)
      )
    `);

    // Table for training data
    this.db.run(`
      CREATE TABLE IF NOT EXISTS training_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hand_context TEXT,
        ai_prediction TEXT,
        actual_result TEXT,
        accuracy_score REAL,
        learning_weight REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Store a complete hand for analysis
  public storeHand(gameState: GameState, outcome: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO hands (
          hand_number, game_state, community_cards, user_hole_cards, 
          pot_size, betting_round, outcome
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        gameState.currentHandNumber,
        JSON.stringify(gameState),
        JSON.stringify(gameState.communityCards),
        JSON.stringify(gameState.userHoleCards),
        gameState.pot,
        gameState.currentRound,
        outcome
      ], function(this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID!);
        }
      });

      stmt.finalize();
    });
  }

  // Store AI recommendation with context
  public storeAIRecommendation(
    handId: number,
    recommendation: AIRecommendation,
    actualOutcome?: string,
    wasFollowed?: boolean
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO ai_recommendations (
          hand_id, recommendation, win_probability, reasoning, 
          pot_odds, expected_value, actual_outcome, was_followed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        handId,
        recommendation.action,
        recommendation.winProbability,
        recommendation.reasoning,
        recommendation.potOdds || null,
        recommendation.expectedValue || null,
        actualOutcome || null,
        wasFollowed || null
      ], (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });

      stmt.finalize();
    });
  }

  // Store player action
  public storePlayerAction(
    handId: number,
    playerId: number,
    playerName: string,
    action: string,
    amount: number,
    bettingRound: string,
    position: string,
    stackBefore: number,
    stackAfter: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO player_actions (
          hand_id, player_id, player_name, action, amount, 
          betting_round, position, stack_before, stack_after
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        handId, playerId, playerName, action, amount,
        bettingRound, position, stackBefore, stackAfter
      ], (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });

      stmt.finalize();
    });
  }

  // Get AI training data for learning
  public getTrainingData(limit: number = 1000): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          h.game_state,
          h.community_cards,
          h.user_hole_cards,
          h.outcome,
          ai.recommendation,
          ai.win_probability,
          ai.actual_outcome,
          ai.was_followed
        FROM hands h
        LEFT JOIN ai_recommendations ai ON h.id = ai.hand_id
        ORDER BY h.timestamp DESC
        LIMIT ?
      `, [limit], (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get statistics for AI improvement
  public getAIAccuracyStats(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(*) as total_recommendations,
          AVG(CASE WHEN was_followed = 1 THEN 1 ELSE 0 END) as follow_rate,
          AVG(win_probability) as avg_confidence
        FROM ai_recommendations
        WHERE actual_outcome IS NOT NULL
      `, (err: Error | null, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Close database connection
  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

// Singleton instance
let dbInstance: PokerDatabase | null = null;

export function getDatabase(): PokerDatabase {
  if (!dbInstance) {
    dbInstance = new PokerDatabase();
  }
  return dbInstance;
}
