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
  const [startingBalanceInput, setStartingBalanceInput] = useState('1000');
  const [smallBlindInput, setSmallBlindInput] = useState('5');
  const [bigBlindInput, setBigBlindInput] = useState('10');
  const gameVariant = 'no-limit-holdem' as const;

  const handleStartGame = () => {
    const startingBalance = Math.max(0, parseInt(startingBalanceInput || '0', 10));
    const smallBlind = Math.max(1, parseInt(smallBlindInput || '0', 10));
    const bigBlindRaw = Math.max(1, parseInt(bigBlindInput || '0', 10));
    const bigBlind = Math.max(smallBlind, bigBlindRaw);

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
          <div className="text-center mt-2">
            <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full border border-green-300">
              No Limit Hold'em
            </span>
          </div>
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={startingBalanceInput}
                onFocus={() => { if (startingBalanceInput === '0') setStartingBalanceInput(''); }}
                onKeyDown={(e) => {
                  const k = e.key;
                  if (/^[0-9]$/.test(k) && (startingBalanceInput === '0')) {
                    e.preventDefault();
                    setStartingBalanceInput(k);
                  }
                }}
                onPaste={(e) => {
                  const text = (e.clipboardData || (window as any).clipboardData).getData('text');
                  const v = text.replace(/[^0-9]/g, '');
                  if (!v) { e.preventDefault(); return; }
                  e.preventDefault();
                  setStartingBalanceInput(v.replace(/^0+(?=\d)/, ''));
                }}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  if (v === '') { setStartingBalanceInput(''); return; }
                  setStartingBalanceInput(v.replace(/^0+(?=\d)/, ''));
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="small-blind">Small Blind ($)</Label>
                <Input
                  id="small-blind"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={smallBlindInput}
                  onFocus={() => { if (smallBlindInput === '0') setSmallBlindInput(''); }}
                  onKeyDown={(e) => {
                    const k = e.key;
                    if (/^[0-9]$/.test(k) && (smallBlindInput === '0')) {
                      e.preventDefault();
                      setSmallBlindInput(k);
                    }
                  }}
                  onPaste={(e) => {
                    const text = (e.clipboardData || (window as any).clipboardData).getData('text');
                    const v = text.replace(/[^0-9]/g, '');
                    if (!v) { e.preventDefault(); return; }
                    e.preventDefault();
                    setSmallBlindInput(v.replace(/^0+(?=\d)/, ''));
                  }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    if (v === '') { setSmallBlindInput(''); return; }
                    setSmallBlindInput(v.replace(/^0+(?=\d)/, ''));
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="big-blind">Big Blind ($)</Label>
                <Input
                  id="big-blind"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={bigBlindInput}
                  onFocus={() => { if (bigBlindInput === '0') setBigBlindInput(''); }}
                  onKeyDown={(e) => {
                    const k = e.key;
                    if (/^[0-9]$/.test(k) && (bigBlindInput === '0')) {
                      e.preventDefault();
                      setBigBlindInput(k);
                    }
                  }}
                  onPaste={(e) => {
                    const text = (e.clipboardData || (window as any).clipboardData).getData('text');
                    const v = text.replace(/[^0-9]/g, '');
                    if (!v) { e.preventDefault(); return; }
                    e.preventDefault();
                    setBigBlindInput(v.replace(/^0+(?=\d)/, ''));
                  }}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    if (v === '') { setBigBlindInput(''); return; }
                    setBigBlindInput(v.replace(/^0+(?=\d)/, ''));
                  }}
                />
              </div>
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
