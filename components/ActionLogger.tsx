import { useState } from 'react';
import { ActionType } from '@/types/poker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ActionLoggerProps {
  playerName: string;
  currentPot: number;
  currentBet: number;
  playerStack: number;
  onActionSubmit: (action: ActionType, amount?: number) => void;
}

export function ActionLogger({ playerName, currentPot, currentBet, playerStack, onActionSubmit }: ActionLoggerProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType>('fold');
  const [betAmount, setBetAmount] = useState(currentBet);

  const handleSubmit = () => {
    if (selectedAction === 'raise') {
      onActionSubmit(selectedAction, betAmount);
    } else if (selectedAction === 'call') {
      onActionSubmit(selectedAction, currentBet);
    } else {
      onActionSubmit(selectedAction);
    }
    setSelectedAction('fold');
    setBetAmount(currentBet);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Log Action for {playerName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="action">Action</Label>
          <Select value={selectedAction} onValueChange={(val) => setSelectedAction(val as ActionType)}>
            <SelectTrigger id="action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fold">Fold</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="call">Call ${currentBet}</SelectItem>
              <SelectItem value="raise">Raise</SelectItem>
              <SelectItem value="all-in">All-In (${playerStack})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedAction === 'raise' && (
          <div className="grid gap-2">
            <Label htmlFor="bet-amount">Raise Amount ($)</Label>
            <Input
              id="bet-amount"
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              min={currentBet * 2}
              max={playerStack}
            />
            <div className="text-xs text-muted-foreground">
              Min raise: ${currentBet * 2} | Max: ${playerStack}
            </div>
          </div>
        )}

        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Pot:</span> <span className="font-semibold">${currentPot}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Current Bet:</span> <span className="font-semibold">${currentBet}</span>
          </div>
        </div>

        <Button onClick={handleSubmit} className="w-full">
          Submit Action
        </Button>
      </CardContent>
    </Card>
  );
}
