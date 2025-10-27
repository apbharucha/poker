import { useState } from 'react';
import { Card } from '@/types/poker';
import { CardSelector } from './CardSelector';
import { Button } from '@/components/ui/button';
import { Card as UICard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GamePhaseManagerProps {
  currentRound: string;
  communityCards: Card[];
  onCommunityCardsChange: (cards: Card[]) => void;
  onAdvancePhase: () => void;
  onNextHand: () => void;
  onFinishHand: (outcome: string) => void;
  handOutcome?: string;
  holeCards?: Card[];
}

export function GamePhaseManager({
  currentRound,
  communityCards,
  onCommunityCardsChange,
  onAdvancePhase,
  onNextHand,
  onFinishHand,
  handOutcome,
  holeCards,
}: GamePhaseManagerProps) {
  const [outcomeInput, setOutcomeInput] = useState('');
  const [showOutcomeInput, setShowOutcomeInput] = useState(false);

  const getExpectedCards = () => {
    switch (currentRound) {
      case 'flop': return 3;
      case 'turn': return 4;
      case 'river': return 5;
      default: return 0;
    }
  };

  const getPhaseTitle = () => {
    switch (currentRound) {
      case 'preflop': return 'Preflop - Hole Cards';
      case 'flop': return 'Flop - Add 3 Community Cards';
      case 'turn': return 'Turn - Add 1 More Card';
      case 'river': return 'River - Add Final Card';
      default: return 'Community Cards';
    }
  };

  const canAdvance = () => {
    const expected = getExpectedCards();
    return expected === 0 || communityCards.length === expected;
  };

  const handleFinishHand = () => {
    if (outcomeInput.trim()) {
      onFinishHand(outcomeInput);
      setOutcomeInput('');
      setShowOutcomeInput(false);
    }
  };

  if (currentRound === 'preflop') {
    return (
      <UICard>
        <CardHeader>
          <CardTitle>Preflop Phase</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Complete all preflop actions, then advance to flop.
          </p>
          <Button onClick={onAdvancePhase} className="w-full">
            Advance to Flop
          </Button>
        </CardContent>
      </UICard>
    );
  }

  if (currentRound === 'showdown') {
    return (
      <UICard>
        <CardHeader>
          <CardTitle>Hand Complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {handOutcome ? (
            <div className="text-sm text-muted-foreground">{handOutcome}</div>
          ) : (
            <>
              <textarea
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Describe the hand outcome (winner, how they won, final pot size, etc.)"
                value={outcomeInput}
                onChange={(e) => setOutcomeInput(e.target.value)}
              />
              <Button onClick={handleFinishHand} disabled={!outcomeInput.trim()}>
                Save Hand & Continue
              </Button>
            </>
          )}
          <Button variant="default" onClick={onNextHand}>
            Next Hand
          </Button>
        </CardContent>
      </UICard>
    );
  }

  return (
    <UICard>
      <CardHeader>
        <CardTitle>{getPhaseTitle()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardSelector
          selectedCards={communityCards}
          onCardsChange={onCommunityCardsChange}
          maxCards={(() => {
            // Allow selecting 3 on flop, then exactly 1 on turn and 1 on river
            if (currentRound === 'flop') return 3;
            // On turn/river, let user add one more card beyond current count (capped at 5)
            return Math.min(5, communityCards.length + 1);
          })()}
          title={(() => {
            if (currentRound === 'flop') return `Select ${Math.max(0, 3 - communityCards.length)} more card(s)`;
            if (currentRound === 'turn') return `Select ${communityCards.length >= 4 ? 0 : 1} more card(s)`;
            if (currentRound === 'river') return `Select ${communityCards.length >= 5 ? 0 : 1} more card(s)`;
            return 'Select community cards';
          })()}
          excludeCards={holeCards || []}
        />
        
        <div className="flex gap-2">
          <Button 
            onClick={onAdvancePhase} 
            disabled={!canAdvance()}
            className="flex-1"
          >
            {currentRound === 'river' ? 'Complete Hand' : `Advance to ${
              currentRound === 'flop' ? 'Turn' : 
              currentRound === 'turn' ? 'River' : 'Next Phase'
            }`}
          </Button>
          
          <Button variant="outline" onClick={() => setShowOutcomeInput(true)}>
            End Hand Early
          </Button>
        </div>

        {showOutcomeInput && (
          <div className="border-t pt-4 space-y-2">
            <textarea
              className="w-full p-2 border rounded-md"
              rows={2}
              placeholder="Why did the hand end early?"
              value={outcomeInput}
              onChange={(e) => setOutcomeInput(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleFinishHand} size="sm">
                Finish Hand
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowOutcomeInput(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </UICard>
  );
}
