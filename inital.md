# Requirements

## Summary

A poker AI assistant web app that provides real-time strategic recommendations to users during poker games. The system tracks game state including player balances, blinds, community cards, and player actions across all betting rounds (preflop, flop, turn, river). It analyzes playing styles over time to suggest optimal actions (fold, check, call, raise with specific amounts) and calculates win probabilities. The app maintains persistent session state across multiple hands, tracking statistics like stack sizes, hands won, and win percentages for all players. It uses machine learning APIs to continuously improve recommendations based on bet sizing patterns, bluffing opportunities, and opponent behavior analysis, delivering value through data-driven poker strategy optimization.

## Use cases

- Game Setup and Live Hand Analysis

  1. User creates a new poker game session by entering number of players, starting balances, blind amounts, and game rules
  2. User starts a hand and inputs their hole cards
  3. User manually logs each opponent's action (fold, check, call, raise amount) as the hand progresses
  4. AI provides real-time recommendations at each stage (preflop, flop, turn, river) with suggested actions and bet sizing
  5. User views win probability and strategic insights based on current game state
  6. Hand completes and stacks automatically update for next hand

- Multi-Hand Session Management and Statistics

  1. User continues playing multiple hands without resetting the game
  2. App maintains updated stack sizes for all players across hands
  3. User views player statistics including hands won, win percentage, and stack trends
  4. App tracks betting patterns and playing styles for each player
  5. User can end session and review complete game history

- AI-Powered Strategy Analysis
  1. AI analyzes opponent betting patterns and identifies playing styles (aggressive, passive, tight, loose)
  2. AI calculates pot odds, expected value, and win probability for each decision point
  3. AI suggests optimal bet sizing based on pot size, stack depths, and opponent tendencies
  4. AI identifies bluffing opportunities based on board texture and opponent behavior
  5. Machine learning model improves recommendations over time based on game outcomes

## Plan

### Game Setup and Live Hand Analysis

1. [x] Create game setup interface with forms for number of players (2-10), starting balances, small blind, big blind, and game variant selection
2. [x] Design main game view with poker table layout showing all player positions, current stacks, and pot size
3. [x] Build hand input interface for user to enter their hole cards using card selector component
4. [x] Implement betting round tracker with visual indicators for preflop, flop, turn, and river stages
5. [x] Create community cards display area that updates as hand progresses through each street
6. [x] Build action logging system for recording each player's actions (fold, check, call amount, raise amount, all-in)
7. [x] Integrate AI recommendation engine API that analyzes current game state and returns suggested action with reasoning
8. [x] Display AI recommendations prominently with action type, bet sizing, win probability percentage, and strategic explanation
9. [x] Implement pot calculation logic that tracks main pot and side pots for all-in scenarios
10. [x] Create hand completion workflow that determines winner, distributes pot, and automatically updates all player stacks
11. [x] Add "Next Hand" button that advances to next hand while preserving updated stacks and rotating dealer button

### Multi-Hand Session Management and Statistics

1. [] Implement session state management that persists player data across multiple hands
2. [] Create player statistics panel showing each player's current stack, starting stack, hands played, hands won, and win percentage
3. [] Build visual stack trend indicators (up/down arrows, color coding) to show who's winning or losing
4. [] Design hand history log that records actions from all completed hands in the session
5. [] Add session summary dashboard with key metrics like total hands played, biggest pot, and largest stack swings
6. [] Implement player profiling system that categorizes each player based on aggression frequency, VPIP (voluntarily put in pot), and showdown tendencies
7. [] Create export functionality to download session data as JSON or CSV for external analysis

### AI-Powered Strategy Analysis

1. [] Integrate machine learning API for poker hand strength evaluation and win probability calculation
2. [] Build opponent modeling system that tracks betting patterns (preflop raise %, 3-bet %, c-bet frequency)
3. [] Implement playing style classifier that labels players as tight-aggressive, loose-passive, etc. based on accumulated actions
4. [] Create pot odds calculator that compares call amount to potential return and displays expected value
5. [] Build bet sizing recommendation engine that suggests optimal raise amounts (1/3 pot, 1/2 pot, 2/3 pot, full pot) based on situation
6. [] Implement bluff detection algorithm that analyzes board texture, opponent range, and betting sequence to identify bluffing spots
7. [] Create ICM (Independent Chip Model) calculator for tournament scenarios if tournament mode is selected
8. [] Build feedback loop where hand outcomes are sent back to ML API to improve future recommendations
9. [] Add explainability layer that shows reasoning behind AI suggestions (e.g., "opponent likely has weak pair based on passive turn play")
10. [] Implement real-time equity calculator that shows hand strength vs estimated opponent ranges
