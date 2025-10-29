import { Player } from '@/types/poker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Settings, Moon } from 'lucide-react';

interface PlayerDisplayProps {
  player: Player;
  isUserPlayer?: boolean;
  startingBalance: number;
  bigBlind: number;
  onSetDealer?: (playerId: number) => void;
  onSetSmallBlind?: (playerId: number) => void;
  onSetBigBlind?: (playerId: number) => void;
  allowPositionChange?: boolean;
  canShowInsight?: boolean;
  onShowInsight?: (player: Player) => void;
  onRedoAction?: (playerId: number) => void;
  onOpenSettings?: (player: Player) => void;
  currentRound?: string;
}

export function PlayerDisplay({ 
  player, 
  isUserPlayer = false, 
  startingBalance,
  bigBlind,
  onSetDealer,
  onSetSmallBlind,
  onSetBigBlind,
  allowPositionChange = false,
  canShowInsight = false,
  onShowInsight,
  onRedoAction,
  onOpenSettings,
  currentRound
}: PlayerDisplayProps) {
  const stackChange = player.stack - startingBalance;
  const winRate = player.handsPlayed > 0 ? ((player.handsWon / player.handsPlayed) * 100).toFixed(1) : '0.0';
  const stackInBBs = (player.stack / bigBlind).toFixed(1);

  return (
    <div
      className={`p-3 rounded-lg border-2 relative ${
        isUserPlayer ? 'bg-blue-50 border-blue-500' : player.isActive ? 'bg-white border-gray-300' : 'bg-gray-100 border-gray-200 opacity-50'
      }`}
    >
      {/* Show last action for this round */}
      {player.actions.length > 0 && currentRound !== 'showdown' && (() => {
        const lastAction = player.actions[player.actions.length - 1];
        
        const actionColors = {
          check: 'bg-gray-400 text-white',
          call: 'bg-blue-500 text-white',
          bet: 'bg-green-600 text-white',
          raise: 'bg-orange-500 text-white',
          fold: 'bg-red-600 text-white',
          'all-in': 'bg-purple-600 text-white'
        };
        const displayText = lastAction.action === 'call' || lastAction.action === 'bet' || lastAction.action === 'raise'
          ? `${lastAction.action.toUpperCase()} $${lastAction.amount || 0}`
          : lastAction.action.toUpperCase();
        
        return (
          <Badge className={`absolute top-2 right-2 text-xs px-2 py-1 font-semibold ${actionColors[lastAction.action]}`}>
            {displayText}
          </Badge>
        );
      })()}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-semibold truncate">{player.customName || player.name}</span>
            {player.isAway && (
              <Badge variant="secondary" className="text-xs bg-slate-700 text-white flex items-center gap-1">
                <Moon className="h-3 w-3" />
                Away
              </Badge>
            )}
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
            <div className="font-bold text-lg">
              ${player.stack} 
              <span className="text-sm font-normal text-muted-foreground ml-1">({stackInBBs} BB)</span>
            </div>
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

      <div className="mt-2 flex gap-1 flex-wrap">
        {/* Settings Button - Always visible */}
        {onOpenSettings && (
          <Button 
            type="button" 
            size="sm" 
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-gray-200"
            onClick={() => onOpenSettings(player)}
            title="Player Settings"
          >
            <Settings className="h-3 w-3" />
          </Button>
        )}
        
        {allowPositionChange && (
          <>
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
          </>
        )}
        {!isUserPlayer && canShowInsight && (
          <Button 
            type="button" 
            size="sm" 
            variant="outline" 
            className="h-6 px-2 text-xs bg-purple-500 hover:bg-purple-600 text-white border-purple-600"
            style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) 3' }}
            onClick={() => onShowInsight?.(player)}
          >
            AI Insight
          </Button>
        )}
        {player.actions.length > 0 && onRedoAction && currentRound !== 'showdown' && (
          <Button 
            type="button" 
            size="sm" 
            variant="outline" 
            className={`h-6 px-2 text-xs bg-green-500 hover:bg-green-600 text-white border-green-600 ${
              currentRound === 'preflop' ? 'animate-pulse' : ''
            }`}
            style={currentRound === 'preflop' ? {
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) 3'
            } : undefined}
            onClick={() => onRedoAction?.(player.id)}
          >
            Redo Action
          </Button>
        )}
      </div>
    </div>
  );
}
