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
  onConfirmRound,
  canConfirmRound,
  currentRound,
  bigBlind
}: PlayerActionPanelProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>('fold');
  const [betAmount, setBetAmount] = useState<number>(0);
  
  const player = players[currentPlayer];
  const callAmount = Math.max(0, currentBet - player.currentBet);
  const minRaise = currentBet + bigBlind;
  
  // Auto-skip folded/inactive/busted players
  useEffect(() => {
    if (!player || !player.isActive || player.stack === 0) {
      onNextPlayer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, players]);

  if (!player || !player.isActive || player.stack === 0) {
    return null;
  }

  const handleAction = () => {
    if (selectedAction === 'raise' && betAmount < minRaise) {
      alert(`Minimum raise is $${minRaise}`);
      return;
    }
    
    if (selectedAction === 'call' || selectedAction === 'raise') {
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
    setSelectedAction('fold');
    
    // Automatically advance to the next player after confirming action
    onNextPlayer();
  };

  const getAvailableActions = (): ActionType[] => {
    const actions: ActionType[] = ['fold'];
    
    if (callAmount === 0) {
      actions.push('check');
    } else {
      actions.push('call');
    }
    
    if (player.stack > callAmount) {
      actions.push('raise');
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
          Stack: ${player.stack} | Current Bet: ${player.currentBet} | To Call: ${callAmount}
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

        {selectedAction === 'raise' && (
          <div>
            <label className="text-sm font-medium">Raise Amount:</label>
            <Input
              type="number"
              min={minRaise}
              max={player.stack}
              value={betAmount || ''}
              onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
              placeholder={`Min: $${minRaise}`}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleAction} disabled={selectedAction === 'raise' && betAmount < minRaise}>
            Confirm Action
          </Button>
          <Button variant="outline" onClick={onNextPlayer}>
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
