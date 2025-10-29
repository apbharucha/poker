import { useState, useCallback } from 'react';
import { GameSetup } from '@/components/GameSetup';
import { CardSelector } from '@/components/CardSelector';
import { PlayerDisplay } from '@/components/PlayerDisplay';
import { AIRecommendation } from '@/components/AIRecommendation';
import { PlayerActionPanel } from '@/components/PlayerActionPanel';
import { GamePhaseManager } from '@/components/GamePhaseManager';
import { PlayerInsightModal } from '@/components/PlayerInsightModal';
import { PlayerSettingsDialog } from '@/components/PlayerSettingsDialog';
import { DataAnalytics } from '@/components/DataAnalytics';
// import { PlayerStats } from '@/components/PlayerStats';
import { PlayerStatsTable } from '@/components/PlayerStatsTable';
import { GameSettingsDialog } from '@/components/GameSettingsDialog';
import { HandHistoryLogs } from '@/components/HandHistoryLogs';
import { HandStrength } from '@/components/HandStrength';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Input } from '@/components/ui/input';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GameSetup as GameSetupType,
  GameState,
  Player,
  BettingRound,
  ActionType,
  AIRecommendation as AIRecommendationType,
} from '@/types/poker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dices, SkipForward, Brain, Settings, Home } from 'lucide-react';
import { generateAIRecommendation } from '@/lib/poker-ai-engine';
import { SUIT_SYMBOLS, SUIT_COLORS } from '@/lib/poker-utils';
import { getDataStorage } from '@/lib/storage';

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendationType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentHandId, setCurrentHandId] = useState<string | null>(null);
  const [bluffIntent, setBluffIntent] = useState(false);
  const [forceBluff, setForceBluff] = useState(false);
  const [bluffAttemptActive, setBluffAttemptActive] = useState(false);
  const [bluffEligible, setBluffEligible] = useState(false);
  
  const dataStorage = getDataStorage();
  const [bluffStats, setBluffStats] = useState<{ attempts: number; successes: number; failures: number }>(() => dataStorage.getBluffStats());
  const [insightOpen, setInsightOpen] = useState(false);
  const [insightPlayer, setInsightPlayer] = useState<Player | null>(null);
  const [insightAllowReveal, setInsightAllowReveal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playerSettingsOpen, setPlayerSettingsOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [bettingPhaseActive, setBettingPhaseActive] = useState(true);
  
  const initializeGame = useCallback((setup: GameSetupType) => {
    const smallBlindPos = setup.numberOfPlayers === 2 ? 0 : 1;
    const bigBlindPos = setup.numberOfPlayers === 2 ? 1 : 2;
    
    const players: Player[] = [];
    for (let i = 0; i < setup.numberOfPlayers; i++) {
      let playerStack = setup.startingBalance;
      let currentBet = 0;
      
      // Deduct blinds from stacks
      if (i === smallBlindPos) {
        playerStack -= setup.smallBlind;
        currentBet = setup.smallBlind;
      } else if (i === bigBlindPos) {
        playerStack -= setup.bigBlind;
        currentBet = setup.bigBlind;
      }
      
      players.push({
        id: i,
        name: i === 0 ? 'You' : `Player ${i + 1}`,
        stack: playerStack,
        position: i,
        isDealer: i === 0,
        isSmallBlind: i === smallBlindPos,
        isBigBlind: i === bigBlindPos,
        isActive: playerStack > 0,
        isAway: false,
        currentBet: currentBet,
        handsPlayed: 0,
        handsWon: 0,
        actions: [],
      });
    }

    // Find first non-away player after big blind for initial turn
    let initialTurn = (bigBlindPos + 1) % setup.numberOfPlayers;
    let safety = 0;
    while (
      safety < setup.numberOfPlayers &&
      players[initialTurn].isAway
    ) {
      initialTurn = (initialTurn + 1) % setup.numberOfPlayers;
      safety++;
    }

    const newGameState = {
      setup,
      players,
      currentRound: 'preflop' as const,
      pot: setup.smallBlind + setup.bigBlind, // Start pot with blinds
      communityCards: [],
      userHoleCards: [],
      currentHandNumber: 1,
      dealerPosition: 0,
      smallBlindPosition: smallBlindPos,
      bigBlindPosition: bigBlindPos,
      currentPlayerTurn: initialTurn,
      handHistory: [],
      bettingComplete: false,
    };
    
    setGameState(newGameState);
    
    // Track session start time
    if (!sessionStartTime) {
      setSessionStartTime(Date.now());
    }
    
    // Create a temporary hand id (only persist on completion)
    const tempId = Date.now().toString() + Math.random().toString(36).slice(2);
    setCurrentHandId(tempId);
  }, []);

  const [activeTab, setActiveTab] = useState<'your-cards'|'community'|'analytics'>('your-cards');

  const requestAIRecommendation = useCallback(() => {
    if (!gameState || gameState.userHoleCards.length !== 2) return;

    setIsAnalyzing(true);
    
    setTimeout(() => {
      const allPlayerActions = gameState.players.flatMap(p => 
        p.actions.map(a => ({ action: a.action, amount: a.amount }))
      );

      const tableMaxBet = Math.max(...gameState.players.map(p => p.currentBet));
      const heroToCall = Math.max(0, tableMaxBet - gameState.players[0].currentBet);
      const roundForAI = gameState.currentRound === 'showdown' ? 'river' : gameState.currentRound;

      // Load opponent analytics for AI decision making
      const opponentAnalytics: Record<number, any> = {};
      gameState.players.forEach(player => {
        if (player.id !== 0) { // Exclude hero
          const analytics = dataStorage.getPlayerAnalyticsById(player.id);
          if (analytics) {
            opponentAnalytics[player.id] = analytics;
          }
        }
      });

      // Collect opponent stack sizes for stack psychology analysis
      const opponentStacks = gameState.players
        .filter(p => p.id !== 0 && p.isActive) // Exclude hero, only active opponents
        .map(p => p.stack);

      const recommendation = generateAIRecommendation({
        holeCards: gameState.userHoleCards,
        communityCards: gameState.communityCards,
        currentRound: roundForAI,
        pot: gameState.pot,
        currentBet: heroToCall, // pass amount to call for the hero
        playerStack: gameState.players[0].stack,
        bigBlind: gameState.setup.bigBlind,
        smallBlind: gameState.setup.smallBlind,
        activePlayers: gameState.players.filter(p => p.isActive).length,
        playerActions: allPlayerActions,
        bluffIntent,
        forceBluff,
        opponentAnalytics,
        opponentStacks, // Stack sizes for stack psychology
        startingStack: gameState.setup.startingBalance, // Starting balance for context
      });

      setAiRecommendation(recommendation);
      setIsAnalyzing(false);

      // Store AI recommendation if we have a current hand
      if (currentHandId) {
        dataStorage.storeAIRecommendation(currentHandId, recommendation);
      }
    }, 800);
  }, [gameState, bluffIntent, forceBluff]);

  const handlePlayerAction = useCallback(
    (playerId: number, action: ActionType, amount?: number) => {
      if (!gameState) return;

      const updatedPlayers = [...gameState.players];
      const player = updatedPlayers[playerId];
      
      if (!player.isActive || player.stack === 0) return;

      // If hero folds while bluff eligible, record a failed bluff attempt
      if (playerId === 0 && action === 'fold' && bluffAttemptActive && bluffEligible) {
        dataStorage.recordBluffAttempt();
        dataStorage.recordBluffResult(false);
        setBluffStats(dataStorage.getBluffStats());
        setBluffAttemptActive(false);
        setBluffEligible(false);
      }

      let actionAmount = 0;
      let newCurrentBet = player.currentBet;

      switch (action) {
        case 'fold':
          player.isActive = false;
          break;
        case 'check':
          // No money involved
          break;
        case 'call': {
          const currentMaxBet = Math.max(...updatedPlayers.map(p => p.currentBet));
          actionAmount = Math.min(currentMaxBet - player.currentBet, player.stack);
          newCurrentBet = player.currentBet + actionAmount;
          player.stack -= actionAmount;
          break;
        }
        case 'bet':
        case 'raise':
          actionAmount = (amount || 0) - player.currentBet;
          actionAmount = Math.min(actionAmount, player.stack);
          newCurrentBet = player.currentBet + actionAmount;
          player.stack -= actionAmount;
          break;
        case 'all-in':
          actionAmount = player.stack;
          newCurrentBet = player.currentBet + actionAmount;
          player.stack = 0;
          break;
      }

      player.currentBet = newCurrentBet;
      player.actions.push({
        playerId,
        action,
        amount: actionAmount,
        timestamp: Date.now(),
      });

      // Store player action in database
      if (currentHandId) {
        const position = player.isDealer ? 'BTN' : player.isSmallBlind ? 'SB' : player.isBigBlind ? 'BB' : `P${player.position}`;
        dataStorage.storePlayerAction(
          currentHandId,
          playerId,
          player.name,
          action,
          actionAmount,
          gameState.currentRound,
          position,
          player.stack + actionAmount,
          player.stack
        );
      }

      let newPot = gameState.pot + actionAmount;
      
      console.log(`[Pot Update] Action: ${action}, Amount: $${actionAmount}, Old Pot: $${gameState.pot}, New Pot: $${newPot}`);

      // If only one player remains active, end the hand immediately and award the pot
      const remainingActive = updatedPlayers.filter(p => p.isActive).length;
      if (remainingActive === 1) {
        const winner = updatedPlayers.find(p => p.isActive)!;
        winner.stack += newPot;
        winner.handsWon += 1;
        const outcome = `All opponents folded. ${winner.name} wins $${newPot} uncontested.`;

        // Record bluff result if applicable and eligible (bluff stayed on)
        if (bluffAttemptActive && bluffEligible) {
          dataStorage.recordBluffAttempt();
          dataStorage.recordBluffResult(winner.id === 0);
          setBluffStats(dataStorage.getBluffStats());
          setBluffAttemptActive(false);
          setBluffEligible(false);
        } else {
          setBluffAttemptActive(false);
          setBluffEligible(false);
        }

        // Store completed hand (only now)
        dataStorage.storeHand({ ...gameState, players: updatedPlayers, pot: 0 }, outcome);

        setGameState({
          ...gameState,
          players: updatedPlayers.map(p => ({ ...p, currentBet: 0 })),
          pot: 0,
          currentRound: 'showdown',
          handOutcome: outcome,
          bettingComplete: true,
        });
        setAiRecommendation(null);
        return;
      }

      // Check if round should auto-complete
      const activePlayers = updatedPlayers.filter(p => p.isActive && p.stack > 0);
      const maxBet = Math.max(...updatedPlayers.map(p => p.currentBet));
      const allMatched = activePlayers.every(p => p.currentBet === maxBet || p.stack === 0);
      
      setGameState({
        ...gameState,
        players: updatedPlayers,
        pot: newPot,
        bettingComplete: allMatched && activePlayers.length > 1
      });
      
      if (allMatched && activePlayers.length > 1) {
        setBettingPhaseActive(false);
      }
    },
    [gameState, bluffAttemptActive, bluffEligible, dataStorage, currentHandId]
  );

  const advanceRound = useCallback(() => {
    if (!gameState) return;

    const roundOrder: (BettingRound | 'showdown')[] = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const currentIndex = roundOrder.indexOf(gameState.currentRound);

    if (currentIndex < roundOrder.length - 1) {
      const nextRound = roundOrder[currentIndex + 1];
      
      // Find the first non-away player starting from dealer + 1
      let nextPlayerIdx = (gameState.dealerPosition + 1) % gameState.players.length;
      let safety = 0;
      while (
        safety < gameState.players.length &&
        gameState.players[nextPlayerIdx].isAway
      ) {
        nextPlayerIdx = (nextPlayerIdx + 1) % gameState.players.length;
        safety++;
      }
      
      setGameState({
        ...gameState,
        currentRound: nextRound,
        players: gameState.players.map((p) => ({ ...p, currentBet: 0 })),
        bettingComplete: false,
        currentPlayerTurn: nextPlayerIdx,
      });
      if (nextRound === 'flop' || nextRound === 'turn' || nextRound === 'river') {
        setActiveTab('community');
      }
      setAiRecommendation(null);
    }
  }, [gameState]);

  const nextPlayer = useCallback((skipPriorityCheck = false) => {
    if (!gameState) return;
    
    // First, check if there are any active players who haven't acted yet (unless skipping)
    if (!skipPriorityCheck) {
      const playersWithoutAction = gameState.players.filter(p => 
        p.isActive && p.stack > 0 && p.actions.length === 0 && !p.isAway
      );
      
      // If there are players without actions, go to the first one
      if (playersWithoutAction.length > 0) {
        setGameState({
          ...gameState,
          currentPlayerTurn: playersWithoutAction[0].id,
        });
        return;
      }
    }
    
    // Proceed to next player in order
    let nextPlayerIndex = gameState.currentPlayerTurn;
    let safety = 0;
    do {
      nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
      safety++;
      // Skip players who are folded/inactive, have zero stack, or are away
    } while (
      safety < gameState.players.length &&
      (!gameState.players[nextPlayerIndex].isActive || 
       gameState.players[nextPlayerIndex].stack === 0 ||
       gameState.players[nextPlayerIndex].isAway)
    );

    setGameState({
      ...gameState,
      currentPlayerTurn: nextPlayerIndex,
    });
  }, [gameState]);

  const confirmRound = useCallback(() => {
    if (!gameState) return;
    
    setGameState({
      ...gameState,
      bettingComplete: true,
    });
    setBettingPhaseActive(false);
  }, [gameState]);

  const finishHand = useCallback((outcome: string) => {
    if (!gameState) return;
    
    // Store the completed hand in database (only completed hands are persisted)
    dataStorage.storeHand(gameState, outcome);
    
    // Check if we should upload training data (after 3+ hands)
    const completedHands = dataStorage.getHands();
    if (completedHands.length >= 3) {
      // Submit training data to backend
      const trainingData = dataStorage.getTrainingData(100); // Last 100 hands
      
      try {
        fetch('/api/train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trainingData }),
        }).catch(() => {}); // Fire and forget
        
        fetch('http://localhost:4000/train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trainingData }),
        }).catch(() => {}); // Fire and forget
      } catch {}
    }
    
    // Update AI recommendation with actual outcome if we have one
    if (currentHandId && aiRecommendation) {
      const followedRecommendation = gameState.players[0].actions.some(action => 
        action.action === aiRecommendation.action
      );
      
      dataStorage.storeAIRecommendation(
        currentHandId,
        aiRecommendation,
        outcome,
        followedRecommendation
      );
    }
    
    // Heuristic: finalize bluff attempt only if eligible
    if (bluffAttemptActive && bluffEligible) {
      const lower = (outcome || '').toLowerCase();
      const heroWon = lower.includes('you') && (lower.includes(' win') || lower.includes(' wins'));
      dataStorage.recordBluffAttempt();
      dataStorage.recordBluffResult(!!heroWon);
      setBluffStats(dataStorage.getBluffStats());
      setBluffAttemptActive(false);
      setBluffEligible(false);
    } else {
      setBluffAttemptActive(false);
      setBluffEligible(false);
    }

    setGameState({
      ...gameState,
      handOutcome: outcome,
      currentRound: 'showdown',
    });
  }, [gameState, currentHandId, aiRecommendation, dataStorage, bluffAttemptActive]);

  const startNextHand = useCallback(() => {
    if (!gameState) return;

    const newDealerPosition = (gameState.dealerPosition + 1) % gameState.players.length;
    const newSmallBlindPosition = gameState.players.length === 2 
      ? newDealerPosition 
      : (newDealerPosition + 1) % gameState.players.length;
    const newBigBlindPosition = gameState.players.length === 2
      ? (newDealerPosition + 1) % gameState.players.length
      : (newDealerPosition + 2) % gameState.players.length;

    const updatedPlayers = gameState.players.map((p, idx) => {
      let playerStack = p.stack;
      let currentBet = 0;
      
      // Deduct blinds for new hand
      if (idx === newSmallBlindPosition) {
        playerStack -= gameState.setup.smallBlind;
        currentBet = gameState.setup.smallBlind;
      } else if (idx === newBigBlindPosition) {
        playerStack -= gameState.setup.bigBlind;
        currentBet = gameState.setup.bigBlind;
      }
      
      return {
        ...p,
        isDealer: idx === newDealerPosition,
        isSmallBlind: idx === newSmallBlindPosition,
        isBigBlind: idx === newBigBlindPosition,
        isActive: playerStack > 0,
        currentBet: currentBet,
        stack: playerStack,
        actions: [],
        handsPlayed: p.handsPlayed + 1,
      };
    });

    // Find first non-away player after big blind for initial turn
    let initialTurn = (newBigBlindPosition + 1) % gameState.players.length;
    let safety = 0;
    while (
      safety < gameState.players.length &&
      updatedPlayers[initialTurn].isAway
    ) {
      initialTurn = (initialTurn + 1) % gameState.players.length;
      safety++;
    }

    setGameState({
      ...gameState,
      currentRound: 'preflop',
      pot: gameState.setup.smallBlind + gameState.setup.bigBlind,
      communityCards: [],
      userHoleCards: [],
      currentHandNumber: gameState.currentHandNumber + 1,
      bettingComplete: false,
      handOutcome: undefined,
      dealerPosition: newDealerPosition,
      smallBlindPosition: newSmallBlindPosition,
      bigBlindPosition: newBigBlindPosition,
      currentPlayerTurn: initialTurn,
      players: updatedPlayers,
    });
    setAiRecommendation(null);
    setBluffIntent(false);
    setForceBluff(false);
    setBluffAttemptActive(false);
    setBluffEligible(false);
    
    // Create new temp hand id for the new hand (persist on completion only)
    const tempId = Date.now().toString() + Math.random().toString(36).slice(2);
    setCurrentHandId(tempId);
  }, [gameState, dataStorage]);

  const handleSetDealer = useCallback((playerId: number) => {
    if (!gameState) return;
    setGameState({
      ...gameState,
      dealerPosition: playerId,
      players: gameState.players.map(p => ({ ...p, isDealer: p.id === playerId }))
    });
  }, [gameState]);

  const handleSetSmallBlind = useCallback((playerId: number) => {
    if (!gameState) return;
    const smallBlind = gameState.setup.smallBlind;
    const players = gameState.players.map(p => ({ ...p }));
    let pot = gameState.pot;

    const prevId = gameState.smallBlindPosition;
    if (prevId !== undefined && prevId !== playerId) {
      const prev = players[prevId];
      if (prev && prev.isSmallBlind) {
        const refund = Math.min(smallBlind, prev.currentBet);
        prev.stack += refund;
        prev.currentBet -= refund;
        prev.isSmallBlind = false;
        pot -= refund;
      }
    }

    const next = players[playerId];
    if (next && !next.isSmallBlind) {
      const deduct = Math.min(smallBlind, next.stack);
      next.stack -= deduct;
      next.currentBet += deduct;
      next.isSmallBlind = true;
      pot += deduct;
    }

    setGameState({
      ...gameState,
      smallBlindPosition: playerId,
      players,
      pot,
    });
  }, [gameState]);

  const handleSetBigBlind = useCallback((playerId: number) => {
    if (!gameState) return;
    const bigBlind = gameState.setup.bigBlind;
    const players = gameState.players.map(p => ({ ...p }));
    let pot = gameState.pot;

    const prevId = gameState.bigBlindPosition;
    if (prevId !== undefined && prevId !== playerId) {
      const prev = players[prevId];
      if (prev && prev.isBigBlind) {
        const refund = Math.min(bigBlind, prev.currentBet);
        prev.stack += refund;
        prev.currentBet -= refund;
        prev.isBigBlind = false;
        pot -= refund;
      }
    }

    const next = players[playerId];
    if (next && !next.isBigBlind) {
      const deduct = Math.min(bigBlind, next.stack);
      next.stack -= deduct;
      next.currentBet += deduct;
      next.isBigBlind = true;
      pot += deduct;
    }

    setGameState({
      ...gameState,
      bigBlindPosition: playerId,
      players,
      pot,
    });
  }, [gameState]);

  const handleOpenPlayerSettings = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setPlayerSettingsOpen(true);
  }, []);

  const handleUpdatePlayer = useCallback((playerId: number, updates: Partial<Player>) => {
    if (!gameState) return;

    const updatedPlayers = gameState.players.map(p => {
      if (p.id === playerId) {
        // If updating custom name, also save to storage
        if (updates.customName) {
          dataStorage.setPlayerCustomName(playerId, updates.customName);
        }
        return { ...p, ...updates };
      }
      return p;
    });

    setGameState({
      ...gameState,
      players: updatedPlayers
    });
  }, [gameState, dataStorage]);

  const handleRemovePlayer = useCallback((playerId: number) => {
    if (!gameState) return;
    if (playerId === 0) {
      alert('Cannot remove the hero player (You)!');
      return;
    }

    const updatedPlayers = gameState.players.filter(p => p.id !== playerId);
    
    // Adjust positions if necessary
    let newDealerPos = gameState.dealerPosition;
    let newSBPos = gameState.smallBlindPosition;
    let newBBPos = gameState.bigBlindPosition;

    if (playerId === gameState.dealerPosition && updatedPlayers.length > 0) {
      newDealerPos = updatedPlayers[0].id;
    }
    if (playerId === gameState.smallBlindPosition && updatedPlayers.length > 1) {
      newSBPos = updatedPlayers[1].id;
    }
    if (playerId === gameState.bigBlindPosition && updatedPlayers.length > 2) {
      newBBPos = updatedPlayers[2 % updatedPlayers.length].id;
    }

    setGameState({
      ...gameState,
      players: updatedPlayers,
      dealerPosition: newDealerPos,
      smallBlindPosition: newSBPos,
      bigBlindPosition: newBBPos
    });
  }, [gameState]);

  const handleRedoAction = useCallback((playerId: number) => {
    if (!gameState) return;

    const player = gameState.players[playerId];
    if (!player || player.actions.length === 0) return;

    // Find all players who acted after this player
    const targetActionTime = player.actions[player.actions.length - 1].timestamp;
    const affectedPlayers: string[] = [];
    
    let totalRefund = 0;
    
    // Restore the player's state and all subsequent players
    const updatedPlayers = gameState.players.map(p => {
      // Find actions after the target time
      const actionsAfterTarget = p.actions.filter(a => a.timestamp >= targetActionTime);
      
      if (actionsAfterTarget.length > 0) {
        // Calculate refund for this player
        const playerRefund = actionsAfterTarget.reduce((sum, a) => sum + (a.amount || 0), 0);
        totalRefund += playerRefund;
        
        // Track affected players
        if (p.id !== playerId) {
          affectedPlayers.push(p.name);
        }
        
        // Check if any removed action was a fold
        const hadFoldAction = actionsAfterTarget.some(a => a.action === 'fold');
        
        // Remove actions after target time
        const remainingActions = p.actions.filter(a => a.timestamp < targetActionTime);
        
        return {
          ...p,
          stack: p.stack + playerRefund,
          currentBet: Math.max(0, p.currentBet - playerRefund),
          isActive: hadFoldAction ? true : p.isActive,
          actions: remainingActions
        };
      }
      return p;
    });

    // Notify user if other players were affected
    if (affectedPlayers.length > 0) {
      alert(`⚠️ Redo action: ${affectedPlayers.join(', ')} will also need to re-enter their actions.`);
    }

    // Adjust pot
    const newPot = Math.max(0, gameState.pot - totalRefund);

    // Set this player as the current turn
    setGameState({
      ...gameState,
      players: updatedPlayers,
      pot: newPot,
      currentPlayerTurn: playerId,
      bettingComplete: false
    });

    // Switch to betting phase if not already there
    setBettingPhaseActive(true);
  }, [gameState]);

  if (!gameState) {
    return <GameSetup onStartGame={initializeGame} />;
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <Card className="bg-gradient-to-r from-green-700 to-green-800 text-white border-green-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Dices className="h-6 w-6" />
                Poker AI Assistant
              </CardTitle>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Hand #{gameState.currentHandNumber}
                </Badge>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {gameState.currentRound.toUpperCase()}
                </Badge>
                <Badge variant="secondary" className="text-lg px-4 py-2" key={`pot-badge-${gameState.pot}`}>
                  Pot: ${gameState.pot} ({(gameState.pot / gameState.setup.bigBlind).toFixed(1)} BB)
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="text-gray-800">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="outline" size="sm" onClick={() => setGameState(null)} className="text-gray-800">
                  <Home className="h-4 w-4 mr-2" />
                  Main Menu
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Poker Table</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    Click BTN/SB/BB to set positions
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {gameState.players.filter((p) => p.stack > 0).map((player) => (
                      <PlayerDisplay
                        key={player.id}
                        player={player}
                        isUserPlayer={player.id === 0}
                        startingBalance={gameState.setup.startingBalance}
                        bigBlind={gameState.setup.bigBlind}
                        allowPositionChange={true}
                        onSetDealer={handleSetDealer}
                        onSetSmallBlind={handleSetSmallBlind}
                        onSetBigBlind={handleSetBigBlind}
                        canShowInsight={(() => {
                          if (player.id === 0) return false;
                          if (!player.isActive) return false;
                          if (gameState.currentRound === 'preflop') {
                            const acted = player.actions && player.actions.length > 0;
                            if (player.isBigBlind) {
                              // BB: require an action beyond checking
                              const nonCheck = player.actions?.some(a => a.action !== 'check');
                              return !!nonCheck;
                            }
                            if (player.isSmallBlind) {
                              // SB: require any action (post-blind is not an action in our model)
                              return acted;
                            }
                            // Other positions: require they have acted preflop
                            return acted;
                          }
                          return true;
                        })()}
                        onShowInsight={(p) => { setInsightPlayer(p); setInsightAllowReveal(false); setInsightOpen(true); }}
                        onRedoAction={handleRedoAction}
                        onOpenSettings={handleOpenPlayerSettings}
                        currentRound={gameState.currentRound}
                      />
                    ))}
                  </div>
                </ScrollArea>

                <Separator className="my-4" />

                {/* Pot Display */}
                <div className="flex justify-center my-4" key={`pot-display-${gameState.pot}`}>
                  <div className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-6 py-3 rounded-full shadow-lg">
                    <div className="text-center">
                      <div className="text-xs font-semibold uppercase tracking-wide">Current Pot</div>
                      <div className="text-2xl font-bold">
                        ${gameState.pot}
                      </div>
                      <div className="text-sm opacity-90">
                        {(gameState.pot / gameState.setup.bigBlind).toFixed(1)} BB
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-semibold">Community Cards:</span>
                    <div className="flex gap-2 mt-2 flex-wrap min-h-[40px]">
                      {gameState.communityCards.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No community cards yet</span>
                      ) : (
                        gameState.communityCards.map((card, idx) => (
                          <Badge key={idx} variant="outline" className="text-xl px-3 py-2">
                            <span className={`font-bold ${SUIT_COLORS[card.suit]}`}>
                              {card.rank}
                              {SUIT_SYMBOLS[card.suit]}
                            </span>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {gameState.bettingComplete && gameState.currentRound !== 'showdown' && (
                      <Button onClick={advanceRound} variant="outline" disabled={gameState.currentRound === 'river'}>
                        <SkipForward className="h-4 w-4 mr-2" />
                        Next Round
                      </Button>
                    )}
                    {gameState.bettingComplete && gameState.currentRound === 'river' && gameState.communityCards.length === 5 && (
                      <Button 
                        onClick={() => {
                          // Open reveal dialog for first active opponent
                          const firstOpponent = gameState.players.find(p => p.id !== 0 && p.isActive);
                          if (firstOpponent) {
                            setInsightPlayer(firstOpponent);
                            setInsightAllowReveal(true);
                            setInsightOpen(true);
                          }
                        }} 
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold"
                        style={{ animation: 'bounce 1s ease-in-out 5' }}
                      >
                        🎯 Record Revealed Hands
                      </Button>
                    )}
                    <Button onClick={startNextHand} variant="default">
                      Next Hand
                    </Button>
                  </div>
                </div>

                {bluffStats && (
                  <div className="text-xs text-muted-foreground">
                    Bluff attempts: {bluffStats.attempts} • Successes: {bluffStats.successes} • Failures: {bluffStats.failures}
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="your-cards">Your Cards</TabsTrigger>
                <TabsTrigger value="community">Community Cards</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="players">Players</TabsTrigger>
              </TabsList>
              <TabsContent value="your-cards">
                <CardSelector
                  selectedCards={gameState.userHoleCards}
                  onCardsChange={(cards) => {
                    setGameState({ ...gameState, userHoleCards: cards });
                    setAiRecommendation(null);
                  }}
                  maxCards={2}
                  title="Your Hole Cards"
                  disabled={gameState.currentRound !== 'preflop'}
                />
              </TabsContent>
              <TabsContent value="community">
                <CardSelector
                  selectedCards={gameState.communityCards}
                  onCardsChange={(cards) => {
                    // Enforce card limits based on current round
                    let maxAllowed = 5;
                    if (gameState.currentRound === 'flop') {
                      maxAllowed = 3;
                    } else if (gameState.currentRound === 'turn') {
                      maxAllowed = 4;
                    }
                    
                    // Only update if within limits
                    if (cards.length <= maxAllowed) {
                      setGameState({ ...gameState, communityCards: cards });
                      setAiRecommendation(null);
                    }
                  }}
                  maxCards={gameState.currentRound === 'flop' ? 3 : gameState.currentRound === 'turn' ? 4 : 5}
                  title={`Community Cards (${gameState.currentRound === 'flop' ? 'Max 3' : gameState.currentRound === 'turn' ? 'Max 4' : 'Max 5'})`}
                  excludeCards={gameState.userHoleCards}
                />
              </TabsContent>
              <TabsContent value="players">
                <Card>
                  <CardHeader>
                    <CardTitle>Player Statistics & Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlayerStatsTable 
                      players={gameState.players.map(p => ({
                        id: p.id,
                        name: p.name,
                        customName: p.customName
                      }))}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="analytics" className="space-y-4">
                <DataAnalytics gameState={gameState} sessionStartTime={sessionStartTime || undefined} />
                <HandHistoryLogs sessionStartTime={sessionStartTime || undefined} />
              </TabsContent>
            </Tabs>
          </div>

          {bluffIntent && !forceBluff && aiRecommendation?.goodForValue && (
            <Card className="border-yellow-300 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-sm">Strong hand detected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-2">
                  Your hand appears strong now. Turn off bluff mode and switch to value line?
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setBluffIntent(false)}>Turn Off Bluff</Button>
                  <Button size="sm" variant="outline" onClick={() => { setForceBluff(true); requestAIRecommendation(); }}>Keep Bluffing</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  AI Analysis Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Advanced poker AI using hand evaluation, Monte Carlo simulation, and game theory optimal strategies.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={requestAIRecommendation} 
                    disabled={isAnalyzing || gameState.userHoleCards.length !== 2} 
                    className="flex-1"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Get AI Recommendation'}
                  </Button>
                  <Button 
                    type="button"
                    variant={bluffIntent ? 'default' : 'outline'}
                    onClick={() => {
                      const next = !bluffIntent;
                      setBluffIntent(next);
                      setForceBluff(false);
                      if (next) {
                        setBluffAttemptActive(true);
                        setBluffEligible(true);
                      } else {
                        // Turning off bluff mid-hand invalidates eligibility
                        setBluffEligible(false);
                      }
                    }}
                  >
                    {bluffIntent ? 'Bluff: On' : 'Bluff: Off'}
                  </Button>
                </div>
                {bluffIntent && aiRecommendation?.action === 'fold' && !forceBluff && (
                  <div className="mt-2">
                    <Button 
                      type="button"
                      variant="destructive"
                      onClick={() => { setForceBluff(true); requestAIRecommendation(); }}
                      className="w-full"
                    >
                      Continue Bluff
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Smart Bluff Opportunity prompt */}
            {aiRecommendation && aiRecommendation.smartBluff && !bluffIntent && (
              <Card className="border-purple-300 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-sm">Strong Bluff Opportunity Detected</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-2">{aiRecommendation.smartBluffReason}</div>
                  {typeof aiRecommendation.smartBluffSuccessOdds === 'number' && (
                    <div className="text-xs mb-2">Estimated success: {aiRecommendation.smartBluffSuccessOdds}%</div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setBluffIntent(true); setForceBluff(true); setBluffAttemptActive(true); setBluffEligible(true); requestAIRecommendation(); }}>
                      Take Bluff Line
                    </Button>
                    <Button size="sm" variant="outline" onClick={requestAIRecommendation}>Recompute</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <HandStrength 
              holeCards={gameState.userHoleCards} 
              communityCards={gameState.communityCards}
            />

            <AIRecommendation recommendation={aiRecommendation} loading={isAnalyzing} />

            {!gameState.bettingComplete && gameState.currentRound !== 'preflop' && (() => {
              // Check if all active players are all-in
              const activePlayers = gameState.players.filter(p => p.isActive && p.stack > 0);
              if (activePlayers.length === 0) {
                return (
                  <Card className="bg-green-50 border-green-300">
                    <CardContent className="py-8 text-center">
                      <p className="text-green-800 font-semibold">
                        ✓ All players are all-in
                      </p>
                      <p className="text-sm text-green-600 mt-2">
                        No more betting - continue to next phase
                      </p>
                    </CardContent>
                  </Card>
                );
              }
              
              const expectedCards = gameState.currentRound === 'flop' ? 3 : gameState.currentRound === 'turn' ? 4 : 5;
              if (gameState.communityCards.length < expectedCards) {
                return (
                  <Card className="bg-yellow-50 border-yellow-300">
                    <CardContent className="py-8 text-center">
                      <p className="text-yellow-800 font-semibold">
                        ⚠️ Please update community cards before inputting player actions
                      </p>
                      <p className="text-sm text-yellow-600 mt-2">
                        Current round: {gameState.currentRound.toUpperCase()} - Expected {expectedCards} cards, have {gameState.communityCards.length}
                      </p>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })()}

            {(gameState.bettingComplete && bettingPhaseActive === false) ? (
              <GamePhaseManager
                currentRound={gameState.currentRound}
                communityCards={gameState.communityCards}
                onCommunityCardsChange={(cards) => setGameState({ ...gameState, communityCards: cards })}
                onAdvancePhase={advanceRound}
                onNextHand={startNextHand}
                onFinishHand={finishHand}
                handOutcome={gameState.handOutcome}
                holeCards={gameState.userHoleCards}
                onAwardPot={(winnerIds) => {
                  if (!gameState) return;
                  let pot = gameState.pot;
                  const winners = gameState.players.filter(p => winnerIds.includes(p.id));
                  if (winners.length === 0) return;
                  const share = Math.floor(pot / winners.length);
                  const updatedPlayers = gameState.players.map(p => ({ ...p }));
                  winners.forEach(w => { updatedPlayers[w.id].stack += share; });
                  pot = 0;
                  setGameState({
                    ...gameState,
                    players: updatedPlayers.map(p => ({ ...p, currentBet: 0 })),
                    pot,
                    currentRound: 'showdown',
                    bettingComplete: true,
                  });
                }}
                onBackToActions={() => setGameState({ ...gameState, bettingComplete: false })}
              />
            ) : (
              // Don't show action panel if betting is complete or all active players are all-in
              (() => {
                const activePlayers = gameState.players.filter(p => p.isActive && p.stack > 0);
                return activePlayers.length === 0;
              })() ? (
                <Card className="bg-green-50 border-green-300">
                  <CardContent className="py-8 text-center">
                    <p className="text-green-800 font-semibold">
                      ✓ All players are all-in
                    </p>
                    <p className="text-sm text-green-600 mt-2">
                      No more betting - continue to showdown
                    </p>
                  </CardContent>
                </Card>
              ) : gameState.bettingComplete ? (
                <Card className="bg-blue-50 border-blue-300">
                  <CardContent className="py-8 text-center">
                    <p className="text-blue-800 font-semibold">
                      ✓ Betting round complete
                    </p>
                    <p className="text-sm text-blue-600 mt-2">
                      Click "Confirm Actions → Next Phase" to advance, or use "Redo Action" to modify
                    </p>
                  </CardContent>
                </Card>
              ) : (
                // Check if community cards are sufficient for current round
                gameState.currentRound !== 'preflop' && (() => {
                  const expectedCards = gameState.currentRound === 'flop' ? 3 : gameState.currentRound === 'turn' ? 4 : 5;
                  return gameState.communityCards.length < expectedCards;
                })() ? null :
                <PlayerActionPanel
                  players={gameState.players}
                  currentPlayer={gameState.currentPlayerTurn}
                  currentBet={Math.max(...gameState.players.map(p => p.currentBet))}
                  onPlayerAction={handlePlayerAction}
                  onNextPlayer={() => nextPlayer(false)}
                  onSkipPlayer={() => nextPlayer(true)}
                  onConfirmRound={confirmRound}
                  canConfirmRound={gameState.players.filter(p => p.isActive).length <= 1 || 
                    gameState.players.filter(p => p.isActive && p.stack > 0).every(p => 
                      p.currentBet === Math.max(...gameState.players.map(pl => pl.currentBet)) || p.stack === 0
                    )}
                  currentRound={gameState.currentRound}
                  bigBlind={gameState.setup.bigBlind}
                />
              )
            )}
          </div>
        </div>
      </div>

      <PlayerInsightModal
        open={insightOpen}
        onOpenChange={setInsightOpen}
        player={insightPlayer}
        context={{ currentRound: gameState.currentRound, communityCards: gameState.communityCards }}
        allowRevealCards={insightAllowReveal}
      />
      
      <PlayerSettingsDialog
        open={playerSettingsOpen}
        onOpenChange={setPlayerSettingsOpen}
        player={selectedPlayer}
        onUpdatePlayer={handleUpdatePlayer}
        onRemovePlayer={handleRemovePlayer}
        isUserPlayer={selectedPlayer?.id === 0}
      />
      
      <GameSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        gameState={gameState}
        onUpdateGameState={setGameState}
        onLogEvent={(event, data) => dataStorage.logEvent(event, data)}
      />
    </div>
  );
}

export default App;
