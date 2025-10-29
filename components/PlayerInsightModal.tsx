import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CardSelector } from '@/components/CardSelector';
import { generatePlayerInsight } from '@/lib/poker-ai-engine';
import { getDataStorage } from '@/lib/storage';
import { Card as PokerCard, Player } from '@/types/poker';
import { useMemo, useState } from 'react';

interface PlayerInsightModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  player: Player | null;
  context: { currentRound: string; communityCards: PokerCard[] };
  allowRevealCards?: boolean;
}

export function PlayerInsightModal({ open, onOpenChange, player, context, allowRevealCards = false }: PlayerInsightModalProps) {
  const storage = getDataStorage();
  const [reveal, setReveal] = useState<PokerCard[]>([]);

  const insight = useMemo(() => {
    if (!player) return null;
    const playerAnalytics = storage.getPlayerAnalyticsById(player.id);
    return generatePlayerInsight(player.actions || [], context, playerAnalytics || undefined);
  }, [player, context, storage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Insight {player ? `— ${player.name}` : ''}</DialogTitle>
        </DialogHeader>
        {player && insight && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="text-sm text-muted-foreground font-medium">{insight.summary}</div>
            
            {/* Detailed Analysis */}
            <div className="text-sm bg-muted/30 p-3 rounded-md">
              <div className="font-semibold mb-1">Detailed Analysis</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{insight.detailedAnalysis}</div>
            </div>

            {/* Possible Hands */}
            {insight.possibleHands && insight.possibleHands.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-1">Possible Hands</div>
                <div className="flex flex-wrap gap-1.5">
                  {insight.possibleHands.map((hand, idx) => (
                    <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
                      {hand}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bluff Detection */}
            <div className="border-t pt-3">
              <div className="text-sm font-semibold mb-1">Bluff Analysis</div>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs text-muted-foreground">Bluff Likelihood:</div>
                <div className={`text-sm font-semibold ${
                  insight.bluffLikelihood >= 60 ? 'text-red-500' : 
                  insight.bluffLikelihood >= 40 ? 'text-yellow-500' : 
                  'text-green-500'
                }`}>
                  {insight.bluffLikelihood}%
                </div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">{insight.bluffReasoning}</div>
            </div>

            {/* Stats */}
            <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-2">
              <div>Confidence: {insight.confidence}%</div>
              <div>Community: {context.communityCards.map(c => `${c.rank}${c.suit[0].toUpperCase()}`).join(' ') || '—'}</div>
            </div>

            {allowRevealCards && (
              <div className="border-t pt-3">
                <div className="text-sm font-semibold mb-1">Record Revealed Hand</div>
                <CardSelector selectedCards={reveal} onCardsChange={setReveal} maxCards={2} title="Hole Cards" />
                <div className="flex gap-2">
                  <Button size="sm" disabled={reveal.length !== 2} onClick={() => {
                    storage.recordRevealedHand(player.id, reveal, { round: context.currentRound, community: context.communityCards });
                    setReveal([]);
                    onOpenChange(false);
                  }}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { storage.recordDidNotShow(player.id); onOpenChange(false); }}>Did not show</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}