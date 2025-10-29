'use client';

import { useState, useEffect } from 'react';
import { Player } from '@/types/poker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, Save, X, Moon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface PlayerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Player | null;
  onUpdatePlayer: (playerId: number, updates: Partial<Player>) => void;
  onRemovePlayer: (playerId: number) => void;
  isUserPlayer?: boolean;
}

export function PlayerSettingsDialog({
  open,
  onOpenChange,
  player,
  onUpdatePlayer,
  onRemovePlayer,
  isUserPlayer = false
}: PlayerSettingsDialogProps) {
  const [name, setName] = useState('');
  const [stack, setStack] = useState(0);
  const [isDealer, setIsDealer] = useState(false);
  const [isSmallBlind, setIsSmallBlind] = useState(false);
  const [isBigBlind, setIsBigBlind] = useState(false);
  const [isAway, setIsAway] = useState(false);

  useEffect(() => {
    if (player) {
      setName(player.customName || player.name);
      setStack(player.stack);
      setIsDealer(player.isDealer);
      setIsSmallBlind(player.isSmallBlind);
      setIsBigBlind(player.isBigBlind);
      setIsAway(player.isAway || false);
    }
  }, [player]);

  const handleSave = () => {
    if (!player) return;

    const updates: Partial<Player> = {
      customName: name !== player.name ? name : undefined,
      stack,
      isDealer,
      isSmallBlind,
      isBigBlind,
      isAway,
    };

    onUpdatePlayer(player.id, updates);
    onOpenChange(false);
  };

  const handleRemove = () => {
    if (!player) return;
    
    if (confirm(`Are you sure you want to remove ${player.customName || player.name} from the game?`)) {
      onRemovePlayer(player.id);
      onOpenChange(false);
    }
  };

  const handlePositionToggle = (position: 'dealer' | 'sb' | 'bb') => {
    switch (position) {
      case 'dealer':
        setIsDealer(!isDealer);
        break;
      case 'sb':
        setIsSmallBlind(!isSmallBlind);
        break;
      case 'bb':
        setIsBigBlind(!isBigBlind);
        break;
    }
  };

  if (!player) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Player Settings
            {isUserPlayer && <Badge variant="default" className="text-xs">You</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Player Name */}
          <div className="space-y-2">
            <Label htmlFor="player-name">Player Name</Label>
            <Input
              id="player-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter player name"
            />
            {player.name !== name && (
              <p className="text-xs text-muted-foreground">
                Original: {player.name}
              </p>
            )}
          </div>

          {/* Player Stack */}
          <div className="space-y-2">
            <Label htmlFor="player-stack">Stack Size ($)</Label>
            <Input
              id="player-stack"
              type="number"
              min="0"
              value={stack}
              onChange={(e) => setStack(parseInt(e.target.value) || 0)}
              placeholder="Enter stack size"
            />
            <p className="text-xs text-muted-foreground">
              Current bet: ${player.currentBet}
            </p>
          </div>

          <Separator />

          {/* Position Settings */}
          <div className="space-y-3">
            <Label>Position</Label>
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant={isDealer ? 'default' : 'outline'}
                onClick={() => handlePositionToggle('dealer')}
                className="flex-1"
              >
                <span className="text-xs font-semibold">
                  {isDealer ? '✓ ' : ''}Button (BTN)
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isSmallBlind ? 'default' : 'outline'}
                onClick={() => handlePositionToggle('sb')}
                className="flex-1"
              >
                <span className="text-xs font-semibold">
                  {isSmallBlind ? '✓ ' : ''}Small Blind
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isBigBlind ? 'default' : 'outline'}
                onClick={() => handlePositionToggle('bb')}
                className="flex-1"
              >
                <span className="text-xs font-semibold">
                  {isBigBlind ? '✓ ' : ''}Big Blind
                </span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click to toggle position assignments
            </p>
          </div>

          <Separator />

          {/* Away Mode Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="away-mode" className="cursor-pointer">Away Mode</Label>
              </div>
              <Switch
                id="away-mode"
                checked={isAway}
                onCheckedChange={setIsAway}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, this player will be idle and not prompted for actions
            </p>
          </div>

          <Separator />

          {/* Player Stats */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Hands Played:</span>
              <span className="font-semibold">{player.handsPlayed}</span>
            </div>
            <div className="flex justify-between">
              <span>Hands Won:</span>
              <span className="font-semibold">{player.handsWon}</span>
            </div>
            <div className="flex justify-between">
              <span>Active:</span>
              <span className="font-semibold">{player.isActive ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-2">
          <div className="flex gap-2">
            {!isUserPlayer && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                className="gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Remove Player
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="gap-1"
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="gap-1"
            >
              <Save className="h-3 w-3" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
