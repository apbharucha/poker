import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameState, Player } from '@/types/poker';
import { Separator } from '@/components/ui/separator';

interface GameSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameState: GameState;
  onUpdateGameState: (gameState: GameState) => void;
  onLogEvent?: (event: string, data: any) => void;
}

export function GameSettingsDialog({
  open,
  onOpenChange,
  gameState,
  onUpdateGameState,
  onLogEvent,
}: GameSettingsDialogProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerStack, setNewPlayerStack] = useState<number | ''>('');
  const [removePlayerId, setRemovePlayerId] = useState<number | null>(null);
  const [setStackPlayerId, setSetStackPlayerId] = useState<number | null>(null);
  const [setStackAmount, setSetStackAmount] = useState<number | ''>('');
  const [smallBlindInput, setSmallBlindInput] = useState(gameState.setup.smallBlind.toString());
  const [bigBlindInput, setBigBlindInput] = useState(gameState.setup.bigBlind.toString());

  const handleAddPlayer = () => {
    const nextId = gameState.players.length;
    const playerName = newPlayerName.trim() || `Player ${nextId + 1}`;
    const initialStack = typeof newPlayerStack === 'number' && newPlayerStack > 0 
      ? newPlayerStack 
      : gameState.setup.startingBalance;
    
    const newPlayer: Player = {
      id: nextId,
      name: playerName,
      stack: initialStack,
      position: nextId,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      isActive: false,
      currentBet: 0,
      handsPlayed: 0,
      handsWon: 0,
      actions: [],
    };
    
    onUpdateGameState({ ...gameState, players: [...gameState.players, newPlayer] });
    setNewPlayerName('');
    setNewPlayerStack('');
  };

  const handleRemovePlayer = () => {
    if (removePlayerId === null) return;
    
    const updated = gameState.players.map((p) =>
      p.id === removePlayerId
        ? { ...p, stack: 0, isActive: false, currentBet: 0 }
        : p
    );
    
    let nextTurn = gameState.currentPlayerTurn;
    if (gameState.currentPlayerTurn === removePlayerId) {
      let idx = nextTurn;
      let safety = 0;
      do {
        idx = (idx + 1) % updated.length;
        safety++;
      } while (
        safety < updated.length &&
        (!updated[idx].isActive || updated[idx].stack === 0)
      );
      nextTurn = idx;
    }
    
    onUpdateGameState({ ...gameState, players: updated, currentPlayerTurn: nextTurn });
    setRemovePlayerId(null);
  };

  const handleSetStack = () => {
    if (setStackPlayerId === null || setStackAmount === '') return;
    
    const amount = Number(setStackAmount);
    const updated = gameState.players.map((p) =>
      p.id === setStackPlayerId 
        ? { ...p, stack: amount, isActive: amount > 0 ? p.isActive : false } 
        : p
    );
    
    const prev = gameState.players.find(p => p.id === setStackPlayerId)?.stack ?? null;
    
    onUpdateGameState({ ...gameState, players: updated });
    
    if (onLogEvent) {
      onLogEvent('set_stack', { playerId: setStackPlayerId, prevStack: prev, newStack: amount });
    }
    
    setSetStackPlayerId(null);
    setSetStackAmount('');
  };

  const handleUpdateBlinds = () => {
    const smallBlind = Math.max(1, parseInt(smallBlindInput || '1', 10));
    const bigBlindRaw = Math.max(1, parseInt(bigBlindInput || '2', 10));
    const bigBlind = Math.max(smallBlind, bigBlindRaw);
    
    onUpdateGameState({
      ...gameState,
      setup: {
        ...gameState.setup,
        smallBlind,
        bigBlind,
      },
    });
    
    if (onLogEvent) {
      onLogEvent('update_blinds', { smallBlind, bigBlind });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adjust Game Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="players" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="blinds">Blinds</TabsTrigger>
          </TabsList>
          
          <TabsContent value="players" className="space-y-6 mt-4">
            {/* Add Player */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Add Player</h3>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="new-player-name">Player Name</Label>
                  <Input
                    id="new-player-name"
                    placeholder="Player name (optional)"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-player-stack">Starting Stack ($)</Label>
                  <Input
                    id="new-player-stack"
                    type="number"
                    min={0}
                    placeholder={`Default: ${gameState.setup.startingBalance}`}
                    value={newPlayerStack}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewPlayerStack(val === '' ? '' : Math.max(0, parseInt(val || '0', 10)));
                    }}
                  />
                </div>
                <Button onClick={handleAddPlayer} className="w-full">
                  Add Player
                </Button>
                <p className="text-xs text-muted-foreground">
                  New players will join in the next hand.
                </p>
              </div>
            </div>

            <Separator />

            {/* Remove Player */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Remove Player</h3>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="remove-player">Select Player</Label>
                  <Select 
                    value={removePlayerId !== null ? String(removePlayerId) : ''} 
                    onValueChange={(v) => setRemovePlayerId(parseInt(v, 10))}
                  >
                    <SelectTrigger id="remove-player">
                      <SelectValue placeholder="Select player to remove" />
                    </SelectTrigger>
                    <SelectContent>
                      {gameState.players
                        .filter((p) => p.stack > 0)
                        .map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} (${p.stack})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="destructive"
                  disabled={removePlayerId === null}
                  onClick={handleRemovePlayer}
                  className="w-full"
                >
                  Remove Player
                </Button>
                <p className="text-xs text-muted-foreground">
                  Player will be hidden once their stack reaches $0.
                </p>
              </div>
            </div>

            <Separator />

            {/* Set Player Stack */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Set Player Stack</h3>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="stack-player">Select Player</Label>
                  <Select 
                    value={setStackPlayerId !== null ? String(setStackPlayerId) : ''} 
                    onValueChange={(v) => setSetStackPlayerId(parseInt(v, 10))}
                  >
                    <SelectTrigger id="stack-player">
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent>
                      {gameState.players.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} (${p.stack})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-stack">New Stack Amount ($)</Label>
                  <Input
                    id="new-stack"
                    type="number"
                    min={0}
                    placeholder="Enter new stack amount"
                    value={setStackAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSetStackAmount(val === '' ? '' : Math.max(0, parseInt(val || '0', 10)));
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={setStackPlayerId === null || setStackAmount === ''}
                  onClick={handleSetStack}
                  className="w-full"
                >
                  Update Stack
                </Button>
                <p className="text-xs text-muted-foreground">
                  Useful for custom scenarios. Does not affect pot or current bets.
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="blinds" className="space-y-6 mt-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Update Blinds</h3>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="small-blind-update">Small Blind ($)</Label>
                  <Input
                    id="small-blind-update"
                    type="number"
                    min={1}
                    value={smallBlindInput}
                    onChange={(e) => setSmallBlindInput(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="big-blind-update">Big Blind ($)</Label>
                  <Input
                    id="big-blind-update"
                    type="number"
                    min={1}
                    value={bigBlindInput}
                    onChange={(e) => setBigBlindInput(e.target.value)}
                  />
                </div>
                <Button onClick={handleUpdateBlinds} className="w-full">
                  Update Blinds
                </Button>
                <p className="text-xs text-muted-foreground">
                  Changes will take effect in the next hand.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
