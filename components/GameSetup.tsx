import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GameSetup as GameSetupType } from '@/types/poker';

interface GameSetupProps {
  onStartGame: (setup: GameSetupType) => void;
}

export function GameSetup({ onStartGame }: GameSetupProps) {
  const [numberOfPlayers, setNumberOfPlayers] = useState(6);
  const [startingBalance, setStartingBalance] = useState(1000);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [gameVariant, setGameVariant] = useState<'no-limit-holdem' | 'pot-limit-omaha'>('no-limit-holdem');

  const handleStartGame = () => {
    onStartGame({
      numberOfPlayers,
      startingBalance,
      smallBlind,
      bigBlind,
      gameVariant,
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Poker AI Assistant Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="players">Number of Players</Label>
              <Select value={numberOfPlayers.toString()} onValueChange={(val) => setNumberOfPlayers(Number(val))}>
                <SelectTrigger id="players">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} Players
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="starting-balance">Starting Balance ($)</Label>
              <Input
                id="starting-balance"
                type="number"
                value={startingBalance}
                onChange={(e) => setStartingBalance(Number(e.target.value))}
                min={100}
                step={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="small-blind">Small Blind ($)</Label>
                <Input
                  id="small-blind"
                  type="number"
                  value={smallBlind}
                  onChange={(e) => setSmallBlind(Number(e.target.value))}
                  min={1}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="big-blind">Big Blind ($)</Label>
                <Input
                  id="big-blind"
                  type="number"
                  value={bigBlind}
                  onChange={(e) => setBigBlind(Number(e.target.value))}
                  min={smallBlind}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="variant">Game Variant</Label>
              <Select value={gameVariant} onValueChange={(val) => setGameVariant(val as typeof gameVariant)}>
                <SelectTrigger id="variant">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-limit-holdem">No Limit Hold'em</SelectItem>
                  <SelectItem value="pot-limit-omaha">Pot Limit Omaha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleStartGame} className="w-full" size="lg">
            Start Game
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
