# Poker AI Assistant - User Functions & Features

## Overview
This document lists all user-facing functions and features in the Poker AI Assistant application. It is continuously updated as new features are added.

---

## Main Components

### 1. Game Setup
**Location:** Initial screen when app loads

#### Functions:
- **Number of Players** - Select 2-10 players for the game
- **Starting Balance** - Set initial chip stack for all players (default: $1000)
- **Small Blind** - Configure small blind amount (default: $5)
- **Big Blind** - Configure big blind amount (default: $10)
- **Game Variant** - Choose between No Limit Hold'em or Pot Limit Omaha
- **Start Game** - Initialize the game with configured settings

---

### 2. Main Menu Button
**Location:** Top header (right side)

#### Function:
- **Main Menu** - Returns user to game setup screen, ending current game session

---

### 3. Game Settings Dialog
**Location:** Accessible via Settings button in top header

#### Functions:
- **Add Player** - Add new players mid-game with custom name and stack
- **Remove Player** - Remove players from the game (sets stack to $0)
- **Set Player Stack** - Manually adjust any player's chip stack
- **Update Blinds** - Change small blind and big blind amounts (takes effect next hand)

---

### 4. Poker Table Display

#### Functions:
- **View Player Information** - See each player's name, stack, position (BTN/SB/BB), and current bet
- **Set Dealer Button** - Click BTN badge to assign dealer position
- **Set Small Blind** - Click SB badge to assign small blind position
- **Set Big Blind** - Click BB badge to assign big blind position
- **Player Settings** - Click settings icon on any player to open their settings dialog
  - Change player name
  - Adjust stack size
  - Toggle position badges (BTN/SB/BB)
  - **Toggle Away Mode** - Mark player as away/idle
  - Remove player from game
- **Away Mode Indicator** - Players marked as away display a 🌙 moon badge
  - Away players are automatically skipped during their turns
  - Action panel shows "away" notice when it would be their turn
  - Persists across rounds until toggled off
- **Player Insights** - Click "Insight" on opponent players (after they've acted) to see AI analysis of their playing style (during hand - no card recording)
- **Record Revealed Hands** - After river betting completes, animated button appears to record opponents' hole cards that were shown at showdown
- **Redo Action** - Undo a player's last action if a mistake was made (appears after player has acted)
  - Refunds chips to player's stack
  - Restores fold status if player folded
  - Adjusts pot accordingly
  - Sets current turn back to that player
  - Returns to betting phase automatically
  - **Cascading Effect**: All players who acted after this player must also redo their actions
  - Alert notification shows which players are affected
  - Animates with pulse effect during preflop only (3 pulses, then stops)

---

### 5. Card Selection

#### Your Cards Tab:
- **Select Hole Cards** - Choose your 2 hole cards from deck (only in preflop)
- **Card Picker** - Visual card selector with all 52 cards organized by suit

#### Community Cards Tab:
- **Select Flop** - Add exactly 3 community cards (maximum enforced)
- **Select Turn** - Add 4th community card (maximum 4 cards total enforced)
- **Select River** - Add 5th community card (maximum 5 cards total enforced)
- **Edit Community Cards** - Modify community cards at any time within round limits
- **Card Limit Validation** - Title shows current limit (e.g., "Max 3" for flop)

---

### 6. Hand Strength Display

#### Functions:
- **Current Hand Strength** - Shows your best poker hand in real-time
  - Updates as community cards are revealed
  - Examples: "Ace High", "Pair of Kings", "Three Tens", "Flush"
- **Draw Detection** - Automatically detects possible draws:
  - Flush Draw (4 cards of same suit)
  - Open-Ended Straight Draw (4 consecutive cards)
  - Gutshot Straight Draw (inside straight draw)
- **Visual Indicator** - Purple/blue gradient card that updates each round
- **Preflop Status** - Shows "waiting for community cards" message preflop

---

### 7. AI Recommendation System

#### Functions:
- **Get AI Recommendation** - Request AI analysis and suggested action based on current game state
- **Bluff Mode Toggle** - Enable/disable bluff mode to get aggressive bluff suggestions
- **Continue Bluff** - Force AI to suggest bluff line even when it recommends folding
- **Take Bluff Line** - Accept AI's smart bluff opportunity suggestion
- **View Win Probability** - See calculated win percentage for current hand
- **View Reasoning** - Read detailed explanation of AI's recommendation
- **View Pot Odds** - See calculated pot odds
- **View Expected Value** - See EV calculation for suggested action

---

### 8. Player Actions

#### Functions:
- **Fold** - Surrender hand and lose any chips already committed (only available when there's a bet to call)
- **Check** - Pass action without betting (only available when no bet to call)
- **Call** - Match current bet amount
- **Bet** - Make the first bet in a round (minimum: 1 big blind)
- **Raise** - Increase an existing bet (minimum: double the current bet)
- **All-In** - Bet all remaining chips
- **Next Player** - Advance to next active player's turn
- **Confirm Round** - End betting round when all players have acted and bets are matched
- **Auto-Advance Round** - Automatically completes round when all bets are matched
  - Triggers after last player acts if no further action needed
  - Overridden if Redo Action is used
- **All-In Handling** - When all active players are all-in:
  - Player Action Panel is hidden
  - Green notification shows "All players are all-in"
  - User can only advance to next phase to reveal cards
  - No more betting actions available until showdown

#### Action Restrictions:
- Cannot fold when there's no bet to call (must check instead)
- Cannot fold if you've already matched the current bet (e.g., big blind with no raises)
- **Bet vs Raise**:
  - "Bet" available only when no one has bet yet in the round
  - "Raise" available only when there's already a bet to raise
  - Minimum bet: 1 big blind
  - Minimum raise: 2x the current bet (e.g., $10 bet → minimum raise to $20)
- **Community Card Requirement** - Must update community cards before inputting actions (except preflop)
  - Flop: Must have 3 cards
  - Turn: Must have 4 cards
  - River: Must have 5 cards
  - Warning message shown if cards not yet selected

---

### 9. Game Phase Management

#### Functions:
- **Next Round** - Advance from preflop → flop → turn → river
- **Next Hand** - Start a new hand (advances dealer button, collects blinds)
- **Finish Hand** - Manually end current hand with custom outcome
- **Award Pot** - Distribute pot to winning player(s)
- **Back to Actions** - Return to betting phase from showdown

---

### 10. Analytics Tab

#### Data Analytics Component:
- **View Hands Played** - See total completed hands in current session
- **View Player Actions** - See total actions taken in current session
- **View AI Performance** - See AI recommendation statistics:
  - Total recommendations given
  - Recommendation follow rate
  - Average AI confidence
- **Refresh Stats** - Reload analytics data
- **Export Data** - Download all game data as JSON backup file
- **Import Data** - Load previously exported JSON backup
- **Clear All Data** - Delete all stored game data from browser

#### Hand History Logs Component:
- **View Hand Logs** - See detailed chronological log of any completed hand
- **Navigate Hands** - Use dropdown or prev/next buttons to browse through hands
- **View Starting Stacks** - See each player's chips at hand start
- **View Your Cards** - See your hole cards for that hand
- **View Hand Events** - See all actions in order:
  - Player actions (fold, call, raise, etc.) with amounts
  - Community cards revealed (flop, turn, river)
  - Hand outcome and pot size
- **View AI Recommendations** - See what AI suggested during that hand
- **Download All Logs** - Export all hand histories as formatted text file (.txt)

---

### 11. Players Tab

#### Functions:
- **View Player Stats** - See statistics for all players in current game:
  - Name and current stack
  - Hands played
  - Hands won
  - Win rate percentage
  - Total action count

---

### 12. Bluff Tracking

#### Functions:
- **View Bluff Stats** - See bluff attempt statistics displayed on main screen:
  - Total bluff attempts
  - Successful bluffs
  - Failed bluffs
- **Automatic Tracking** - System automatically tracks when you attempt bluffs and their outcomes

---

## Minor Features

### Position Indicators
- **BTN Badge** - Shows dealer button position
- **SB Badge** - Shows small blind position
- **BB Badge** - Shows big blind position

### Visual Feedback
- **Pot Display** - Always-visible current pot size (updates immediately in real-time as players bet)
  - Header badge shows pot in dollars and big blinds
  - Main table display shows centered pot indicator
  - Both displays update instantly after every action (call, bet, raise, all-in)
  - Enhanced with React key props to force re-render on pot changes
- **Hand Number** - Current hand counter
- **Round Display** - Shows current betting round (PREFLOP/FLOP/TURN/RIVER/SHOWDOWN)
- **Card Formatting** - Cards display with suit symbols and colors (red for hearts/diamonds, black for spades/clubs)
- **Action Indicators** - Each player shows their last action in top-right corner:
  - CHECK - Gray
  - CALL $X - Blue  
  - BET $X - Green
  - RAISE $X - Orange
  - FOLD - Red
  - ALL-IN - Purple
  - Clears when next hand starts
- **Status Badges** - Visual indicators for player states:
  - 🌙 **Away** - Dark slate badge for idle players
  - **BTN/SB/BB** - Position badges
  - **You** - Blue badge for user player
- **Button Animations** - Timed animations to draw attention:
  - AI Insight: Pulses 3 times (6 seconds total)
  - Record Revealed Hands: Bounces 5 times (5 seconds total)
  - Redo Action: Pulses 3 times in preflop only (6 seconds total)

### Data Persistence
- **Local Storage** - All game data saved in browser automatically
- **Session Tracking** - Analytics filtered to current game session
- **Historical Data** - Previous hands accessible even after starting new games
- **Model Training** - Training data automatically submitted to backend after 3+ hands completed
  - First 3 hands stored locally only
  - Hand 3 onwards: data submitted for AI model improvement
  - Fire-and-forget uploads (won't block gameplay)

---

## Keyboard & Input

### Text Inputs:
- **Player Names** - Custom text entry for player names
- **Chip Amounts** - Numeric input for stacks, bets, and blinds
- **Auto-format** - Prevents leading zeros and non-numeric characters

### Selection Controls:
- **Dropdowns** - Player selection, hand selection in logs
- **Tabs** - Switch between Your Cards, Community, Analytics, Players views
- **Buttons** - All primary actions (fold, call, raise, etc.)

---

## Session Management

### Current Session:
- **Session Start** - Tracked when game begins
- **Session Analytics** - Stats filtered to current session only
- **Session Reset** - New session starts when returning to main menu

---

## Notes

- All data is stored locally in browser (localStorage)
- Export data regularly for backup
- Session data resets when returning to main menu
- Historical data persists across sessions unless manually cleared
- AI recommendations are context-aware based on:
  - Your hole cards
  - Community cards
  - Current pot size
  - Betting history
  - Player actions
  - Position
  - Stack sizes

---

---

## Recent Updates (v1.8)

### Away Mode Feature
- **New:** Players can be marked as "Away" via their settings dialog
- **Automatic Skipping:** Away players are automatically skipped during betting rounds
- **Visual Indicators:** Moon (🌙) badge displays next to away player names
- **Away Notice:** Action panel shows informational message when away player's turn comes up
- **Persistent:** Away status persists across rounds until manually toggled off
- **Smart Turn Management:** Game logic automatically finds next non-away player
- **Safety Features:** Prevents infinite loops if all players marked away

### Pot Display Enhancement
- **Fixed:** Pot now updates immediately after every player action
- **Real-time Updates:** Both header and main pot displays refresh instantly
- **Improved Reactivity:** Enhanced React state management for reliable updates
- **Debug Logging:** Console logs track pot changes for verification

---

**Last Updated:** 2025-10-29
**Version:** 1.8
