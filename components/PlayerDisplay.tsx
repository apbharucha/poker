import { Player } from '@/types/poker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PlayerDisplayProps {
  player: Player;
  isUserPlayer?: boolean;
  startingBalance: number;
  onSetDealer?: (playerId: number) => void;
  onSetSmallBlind?: (playerId: number) => void;
  onSetBigBlind?: (playerId: number) => void;
  allowPositionChange?: boolean;
}

export function PlayerDisplay({ 
  player, 
  isUserPlayer = false, 
  startingBalance,
  onSetDealer,
  onSetSmallBlind,
  onSetBigBlind,
  allowPositionChange = false
}: PlayerDisplayProps) {
  const stackChange = player.stack - startingBalance;
  const winRate = player.handsPlayed > 0 ? ((player.handsWon / player.handsPlayed) * 100).toFixed(1) : '0.0';

  return (
    <div
      className={`p-3 rounded-lg border-2 ${
        isUserPlayer ? 'bg-blue-50 border-blue-500' : player.isActive ? 'bg-white border-gray-300' : 'bg-gray-100 border-gray-200 opacity-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-semibold truncate">{player.name}</span>
            {player.isDealer && (
              <Badge variant="secondary" className="text-xs">
                BTN
              </Badge>
            )}
            {player.isSmallBlind && (
              <Badge variant="outline" className="text-xs bg-yellow-100">
                SB
              </Badge>
            )}
            {player.isBigBlind && (
              <Badge variant="outline" className="text-xs bg-orange-100">
                BB
              </Badge>
            )}
            {isUserPlayer && (
              <Badge variant="default" className="text-xs">
                You
              </Badge>
            )}
          </div>

          <div className="text-sm mt-1">
            <div className="font-bold text-lg">${player.stack}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Hands: {player.handsPlayed}</span>
              <span>•</span>
              <span>Won: {player.handsWon}</span>
              <span>•</span>
              <span>{winRate}%</span>
            </div>
          </div>
        </div>

        {stackChange !== 0 && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${stackChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stackChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{stackChange > 0 ? '+' : ''}${stackChange}</span>
          </div>
        )}
      </div>

      {player.currentBet > 0 && (
        <div className="mt-2 text-xs">
          <Badge variant="outline">Current Bet: ${player.currentBet}</Badge>
        </div>
      )}

      {allowPositionChange && (
        <div className="mt-2 flex gap-1">
          <Button 
            type="button"
            size="sm" 
            variant={player.isDealer ? "default" : "outline"} 
            className="h-6 px-2 text-xs"
            onClick={() => onSetDealer?.(player.id)}
          >
            BTN
          </Button>
          <Button 
            type="button"
            size="sm" 
            variant={player.isSmallBlind ? "default" : "outline"} 
            className="h-6 px-2 text-xs"
            onClick={() => onSetSmallBlind?.(player.id)}
          >
            SB
          </Button>
          <Button 
            type="button"
            size="sm" 
            variant={player.isBigBlind ? "default" : "outline"} 
            className="h-6 px-2 text-xs"
            onClick={() => onSetBigBlind?.(player.id)}
          >
            BB
          </Button>
        </div>
      )}
    </div>
  );
}
