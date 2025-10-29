import { useEffect, useState } from 'react';
import { Player, ActionType } from '@/types/poker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PlayerActionPanelProps {
  players: Player[];
  currentPlayer: number;
  currentBet: number;
  onPlayerAction: (playerId: number, action: ActionType, amount?: number) => void;
  onNextPlayer: () => void;
  onSkipPlayer?: () => void;
  onConfirmRound: () => void;
  canConfirmRound: boolean;
  currentRound: string;
  bigBlind: number;
}

export function PlayerActionPanel({ 
  players, 
  currentPlayer, 
  currentBet, 
  onPlayerAction, 
  onNextPlayer,
  onSkipPlayer,
  onConfirmRound,
  canConfirmRound,
  currentRound,
  bigBlind
}: PlayerActionPanelProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>('fold');
  const [betAmount, setBetAmount] = useState<number>(0);
  const [betInBBs, setBetInBBs] = useState<number>(0);
  
  const player = players[currentPlayer];
  const callAmount = Math.max(0, currentBet - player.currentBet);
  
  // If there's no bet yet, minimum bet is 1 big blind
  // If there's a bet, minimum raise is currentBet + (currentBet amount)
  const minBet = bigBlind;
  const minRaise = currentBet > 0 ? currentBet + currentBet : currentBet + bigBlind;
  
  // Auto-skip folded/inactive/busted/away players
  useEffect(() => {
    if (!player || !player.isActive || player.stack === 0 || player.isAway) {
      onNextPlayer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, players]);

  // Display away notice for away players
  if (player && player.isAway) {
    return (
      <Card className="bg-slate-100 border-slate-400">
        <CardContent className="py-8 text-center">
          <p className="text-slate-800 font-semibold">
            🌙 {player.customName || player.name} is away
          </p>
          <p className="text-sm text-slate-600 mt-2">
            Player is currently in away mode and will be automatically skipped
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!player || !player.isActive || player.stack === 0) {
    return null;
  }

  // Handle dollar amount change (update BBs)
  const handleDollarChange = (value: number) => {
    setBetAmount(value);
    setBetInBBs(parseFloat((value / bigBlind).toFixed(2)));
  };

  // Handle BB change (update dollars)
  const handleBBChange = (value: number) => {
    setBetInBBs(value);
    setBetAmount(Math.round(value * bigBlind));
  };

  const handleAction = () => {
    if (selectedAction === 'bet' && betAmount < minBet) {
      alert(`Minimum bet is $${minBet} (${(minBet / bigBlind).toFixed(1)} BB)`);
      return;
    }
    
    if (selectedAction === 'raise' && betAmount < minRaise) {
      alert(`Minimum raise is $${minRaise} (${(minRaise / bigBlind).toFixed(1)} BB)`);
      return;
    }
    
    if (selectedAction === 'call' || selectedAction === 'bet' || selectedAction === 'raise') {
      const amount = selectedAction === 'call' ? callAmount : betAmount;
      if (amount > player.stack) {
        // All-in situation
        onPlayerAction(currentPlayer, 'all-in', player.stack);
      } else {
        onPlayerAction(currentPlayer, selectedAction, amount);
      }
    } else {
      onPlayerAction(currentPlayer, selectedAction);
    }
    
    setBetAmount(0);
    setBetInBBs(0);
    setSelectedAction('fold');
    
    // Automatically advance to the next player after confirming action
    onNextPlayer();
  };

  const getAvailableActions = (): ActionType[] => {
    const actions: ActionType[] = [];
    
    // Only allow fold if there's a bet to call (callAmount > 0)
    if (callAmount > 0) {
      actions.push('fold');
    }
    
    if (callAmount === 0) {
      actions.push('check');
      // Allow bet if no one has bet yet
      if (player.stack >= minBet) {
        actions.push('bet');
      }
    } else {
      actions.push('call');
      // Allow raise if they can afford it
      if (player.stack > callAmount) {
        actions.push('raise');
      }
    }
    
    if (player.stack > 0) {
      actions.push('all-in');
    }
    
    return actions;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {player.name}'s Action ({currentRound.toUpperCase()})
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Stack: ${player.stack} ({(player.stack / bigBlind).toFixed(1)} BB) | 
          Current Bet: ${player.currentBet} ({(player.currentBet / bigBlind).toFixed(1)} BB) | 
          To Call: ${callAmount} ({(callAmount / bigBlind).toFixed(1)} BB)
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Action:</label>
          <Select value={selectedAction} onValueChange={(value: ActionType) => setSelectedAction(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAvailableActions().map((action) => (
                <SelectItem key={action} value={action}>
                  {action.toUpperCase()}
                  {action === 'call' && ` ($${callAmount})`}
                  {action === 'all-in' && ` ($${player.stack})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedAction === 'bet' && (
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium">Bet Amount ($):</label>
              <Input
                type="number"
                min={minBet}
                max={player.stack}
                value={betAmount || ''}
                onChange={(e) => handleDollarChange(parseInt(e.target.value) || 0)}
                placeholder={`Min: $${minBet}`}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Or Bet in Big Blinds:</label>
              <Input
                type="number"
                min={minBet / bigBlind}
                max={player.stack / bigBlind}
                step="0.5"
                value={betInBBs || ''}
                onChange={(e) => handleBBChange(parseFloat(e.target.value) || 0)}
                placeholder={`Min: ${(minBet / bigBlind).toFixed(1)} BB`}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {betAmount > 0 && `= $${betAmount}`}
              </div>
            </div>
          </div>
        )}
        
        {selectedAction === 'raise' && (
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium">Raise To ($):</label>
              <Input
                type="number"
                min={minRaise}
                max={player.stack + player.currentBet}
                value={betAmount || ''}
                onChange={(e) => handleDollarChange(parseInt(e.target.value) || 0)}
                placeholder={`Min: $${minRaise}`}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Or Raise To (Big Blinds):</label>
              <Input
                type="number"
                min={minRaise / bigBlind}
                max={(player.stack + player.currentBet) / bigBlind}
                step="0.5"
                value={betInBBs || ''}
                onChange={(e) => handleBBChange(parseFloat(e.target.value) || 0)}
                placeholder={`Min: ${(minRaise / bigBlind).toFixed(1)} BB`}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {betAmount > 0 && `= $${betAmount}`}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleAction} disabled={
            (selectedAction === 'bet' && betAmount < minBet) ||
            (selectedAction === 'raise' && betAmount < minRaise)
          }>
            Confirm Action
          </Button>
          <Button variant="outline" onClick={onSkipPlayer || onNextPlayer}>
            Skip Player
          </Button>
        </div>

        {canConfirmRound && (
          <div className="border-t pt-4">
            <Button onClick={onConfirmRound} className="w-full" variant="default">
              Confirm {currentRound.toUpperCase()} Actions → Next Phase
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
