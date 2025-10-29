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
}

export function PlayerInsightModal({ open, onOpenChange, player, context }: PlayerInsightModalProps) {
  const storage = getDataStorage();
  const [reveal, setReveal] = useState<PokerCard[]>([]);

  const insight = useMemo(() => {
    if (!player) return null;
    return generatePlayerInsight(player.actions || [], context);
  }, [player, context]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Insight {player ? `— ${player.name}` : ''}</DialogTitle>
        </DialogHeader>
        {player && insight && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{insight.summary}</div>
            <div className="text-sm">Confidence: {insight.confidence}%</div>
            <div className="text-sm">Community: {context.communityCards.map(c => `${c.rank}${c.suit[0].toUpperCase()}`).join(' ') || '—'}</div>

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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}