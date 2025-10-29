# Player Analytics System

## Overview
The poker AI now includes a comprehensive player analytics system that tracks opponent tendencies and uses them to make personalized, opponent-aware recommendations.

## Features

### 1. **Player Statistics Tracking**
Track key poker metrics for each opponent:
- **VPIP** (Voluntarily Put $ In Pot): How often they play hands preflop
- **PFR** (Pre-Flop Raise): How often they raise preflop
- **Aggression Factor**: (Bets + Raises) / Calls ratio
- **3-Bet %**: Frequency of re-raising preflop
- **C-Bet %**: Continuation bet frequency
- **Fold to C-Bet %**: How often they fold to continuation bets
- **WTSD** (Went to Showdown): How often they reach showdown
- **W$SD** (Won at Showdown): Win rate at showdown
- **Bluff Frequency**: Estimated bluffing tendency
- **Calldown Frequency**: How often they call to showdown
- **Fold to Aggression**: How often they fold when facing aggression

### 2. **Custom Player Names**
- Rename any player at the table with custom names
- Names persist across sessions
- Easier to track specific opponents

### 3. **In-Game Data Table**
Access the **Players** tab to view and edit analytics:
- Quick overview of all players with style labels:
  - 🔴 **LAG** (Loose-Aggressive)
  - 🟡 **LP** (Loose-Passive)
  - 🟢 **TAG** (Tight-Aggressive)
  - 🔵 **TP** (Tight-Passive)
  - ⚪ **Balanced**
- Edit any stat with a single click
- Add notes and tags for each player

### 4. **Stack Psychology Analysis**

The AI analyzes stack sizes relative to blinds to understand psychological factors:

**Stack Status Classification:**
- **Short Stack** (< 20 BB): Desperate, more likely to gamble
- **Medium Stack** (20-50 BB): Standard play
- **Deep Stack** (> 50 BB): Comfortable, can apply pressure

**Psychological Metrics:**
- **Desperation Factor**: How desperate a player is based on their stack (0-1 scale)
- **Intimidation Factor**: How intimidating deep stacks are to short stacks (0-1 scale)

**AI Adjustments:**
- Increases win probability estimates against desperate short stacks with decent hands
- Reduces confidence against deep stacks with marginal hands
- Applies conservative reasoning when hero is short-stacked
- Factors stack dynamics into bluff opportunities

### 5. **AI Integration**

#### Opponent-Aware Recommendations
The AI now factors in opponent tendencies when making decisions:

**Against Tight Players (VPIP < 20%)**:
- Increases bluff frequency (they fold more)
- Boosts win probability estimates for marginal hands
- Recommends larger bluff sizing

**Against Loose Players (VPIP > 30%)**:
- Reduces bluff frequency (they call more)
- Decreases confidence in marginal holdings
- Recommends smaller bluff sizing

**Against Aggressive Players (Agg Factor > 2)**:
- Reduces confidence in medium-strength hands
- Adjusts calling ranges tighter
- More cautious with marginal holdings

**Against Passive Players (Agg Factor < 1)**:
- Wider calling ranges with marginal hands
- More value betting opportunities
- Less concern about aggression

#### Enhanced Player Insights
Player insight AI analysis now uses tracked stats:
- **Bluff likelihood** based on historical bluff frequency
- **Range predictions** adjusted for player style (tight/loose)
- **Confidence levels** influenced by opponent consistency
- **Suspicious action detection** using aggression patterns
- **Stack psychology** factored into range and pressure analysis

### 6. **Data Persistence**
- All analytics stored in localStorage
- Persists across browser sessions
- Export/import functionality for backup
- Automatic stat updates when editing

## How to Use

### Setting Up Player Analytics

1. **Start a Game**: Begin a poker session as normal
2. **Navigate to Players Tab**: Click the "Players" tab in the game interface
3. **Edit Player Stats**: 
   - Click the pencil icon next to any player
   - Enter known stats (VPIP, PFR, etc.)
   - Add custom name for easy identification
   - Save changes

### During Gameplay

The AI automatically:
- Loads opponent analytics when you request recommendations
- Adjusts strategy based on opponent profiles
- Analyzes stack sizes and stack psychology
- Provides more accurate player insights
- Factors tendencies into win probability calculations
- Considers stack dynamics in bluff recommendations

### Example Workflow

1. Play a few hands and observe opponent behavior
2. Open the **Players** tab
3. Edit a player's stats (e.g., "Player 2" seems tight):
   - Set VPIP: 18%
   - Set PFR: 12%
   - Set Aggression Factor: 2.5
   - Add custom name: "Tight Tony"
   - Add tag: "tight", "aggressive"
4. Request AI recommendation
5. AI now knows:
   - Bluff more against "Tight Tony" (he folds often)
   - Size bets larger when value betting (he pays off)
   - Be cautious when he shows aggression (rare for tight players)

## Stats Guide

### Core Stats Interpretation

**VPIP (Voluntarily Put $ In Pot)**
- < 15%: Very tight (rocks)
- 15-25%: Tight
- 25-35%: Balanced
- 35-45%: Loose
- > 45%: Very loose (fish)

**PFR (Pre-Flop Raise)**
- < 8%: Very passive
- 8-15%: Tight-aggressive
- 15-25%: Aggressive
- > 25%: Very aggressive/maniac

**Aggression Factor**
- < 1.0: Passive (calling station)
- 1.0-2.0: Balanced
- 2.0-3.0: Aggressive
- > 3.0: Very aggressive/maniac

**WTSD (Went to Showdown)**
- < 20%: Gives up easily
- 20-30%: Normal
- > 30%: Calls down light

## Technical Implementation

### Type Definitions
```typescript
interface PlayerAnalytics {
  playerId: number;
  playerName: string;
  customName?: string;
  vpip: number;
  pfr: number;
  aggressionFactor: number;
  threeBetPercent: number;
  foldToCBetPercent: number;
  cBetPercent: number;
  vpipByPosition: Record<string, number>;
  pfrByPosition: Record<string, number>;
  wtsd: number;
  wsd: number;
  bluffFrequency: number;
  calldownFrequency: number;
  foldToAggression: number;
  handsTracked: number;
  lastUpdated: number;
  notes?: string;
  tags?: string[];
}
```

### AI Integration
```typescript
// AI automatically loads and uses analytics
const opponentAnalytics = storage.getPlayerAnalytics();
const recommendation = generateAIRecommendation({
  // ... other params
  opponentAnalytics, // Passed to AI engine
});
```

### Storage
All analytics stored in localStorage with keys:
- `poker_player_analytics`: Main analytics data
- `poker_player_custom_names`: Custom player names

## Best Practices

1. **Start with rough estimates**: Even approximate stats help
2. **Update as you learn**: Refine stats based on observations
3. **Use tags liberally**: Tag players like "bluffs_river", "tight_aggressive"
4. **Add notes**: Write down specific observations
5. **Track hand count**: More hands = more reliable stats
6. **Focus on key stats**: VPIP, PFR, and Aggression Factor are most important

## Recent Updates

### Stack Psychology (v1.8)
- AI now analyzes opponent stack sizes relative to big blind
- Classifies stacks as short (< 20 BB), medium (20-50 BB), or deep (> 50 BB)
- Calculates desperation and intimidation factors
- Adjusts win probability estimates based on stack psychology
- Integrates stack dynamics into strategic recommendations

### Away Mode Support (v1.8)
- Players can be marked as away/idle
- Away players automatically skipped during betting
- Visual indicators and status badges

## Future Enhancements

Potential additions:
- Automatic stat calculation from hand history
- Import HUD data from poker trackers
- Positional heat maps
- Range charts based on stats
- Session-based stat tracking
- Multi-session trend analysis
- ICM calculations for tournament play
- Automatic stack-to-pot ratio (SPR) analysis
