import { Card } from '@/types/poker';
import { getBestHand } from '@/lib/hand-evaluator';
import { Card as UICard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HandStrengthProps {
  holeCards: Card[];
  communityCards: Card[];
}

function detectDraws(holeCards: Card[], communityCards: Card[]): string[] {
  const allCards = [...holeCards, ...communityCards];
  const draws: string[] = [];
  
  if (allCards.length < 5) return draws;
  
  const suits = allCards.map(c => c.suit);
  const ranks = allCards.map(c => c.rank);
  
  // Check for flush draw
  const suitCounts = new Map<string, number>();
  suits.forEach(s => suitCounts.set(s, (suitCounts.get(s) || 0) + 1));
  suitCounts.forEach((count) => {
    if (count === 4) {
      draws.push('Flush Draw');
    }
  });
  
  // Check for straight draw (simplified)
  const rankValues: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  };
  
  const sortedValues = [...new Set(ranks.map(r => rankValues[r]))].sort((a, b) => a - b);
  
  // Open-ended straight draw (4 consecutive cards)
  for (let i = 0; i <= sortedValues.length - 4; i++) {
    if (sortedValues[i + 3] - sortedValues[i] === 3) {
      draws.push('Open-Ended Straight Draw');
      break;
    }
  }
  
  // Gutshot straight draw (3 consecutive with 1 gap)
  if (!draws.includes('Open-Ended Straight Draw')) {
    for (let i = 0; i <= sortedValues.length - 3; i++) {
      const span = sortedValues[i + 2] - sortedValues[i];
      if (span === 3 || span === 4) {
        draws.push('Gutshot Straight Draw');
        break;
      }
    }
  }
  
  return draws;
}

function formatHandDescription(description: string, holeCards: Card[], communityCards: Card[]): string {
  const allCards = [...holeCards, ...communityCards];
  
  if (description.includes('Pair')) {
    // Find which rank is the pair
    const rankCounts = new Map<string, number>();
    allCards.forEach(c => rankCounts.set(c.rank, (rankCounts.get(c.rank) || 0) + 1));
    
    let pairRank = '';
    rankCounts.forEach((count, rank) => {
      if (count === 2 && !pairRank) pairRank = rank;
    });
    
    if (pairRank) {
      const rankNames: Record<string, string> = {
        'A': 'Aces', 'K': 'Kings', 'Q': 'Queens', 'J': 'Jacks', '10': 'Tens',
        '9': 'Nines', '8': 'Eights', '7': 'Sevens', '6': 'Sixes', '5': 'Fives',
        '4': 'Fours', '3': 'Threes', '2': 'Twos'
      };
      return `Pair of ${rankNames[pairRank] || pairRank + 's'}`;
    }
  }
  
  if (description.includes('Three of a Kind')) {
    const rankCounts = new Map<string, number>();
    allCards.forEach(c => rankCounts.set(c.rank, (rankCounts.get(c.rank) || 0) + 1));
    
    let tripRank = '';
    rankCounts.forEach((count, rank) => {
      if (count === 3) tripRank = rank;
    });
    
    if (tripRank) {
      const rankNames: Record<string, string> = {
        'A': 'Aces', 'K': 'Kings', 'Q': 'Queens', 'J': 'Jacks', '10': 'Tens',
        '9': 'Nines', '8': 'Eights', '7': 'Sevens', '6': 'Sixes', '5': 'Fives',
        '4': 'Fours', '3': 'Threes', '2': 'Twos'
      };
      return `Three ${rankNames[tripRank] || tripRank + 's'}`;
    }
  }
  
  if (description.includes('High Card')) {
    const highCard = holeCards.concat(communityCards).reduce((max, card) => {
      const values: Record<string, number> = {
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'J': 11, 'Q': 12, 'K': 13, 'A': 14,
      };
      return values[card.rank] > values[max.rank] ? card : max;
    }, holeCards[0]);
    
    const rankNames: Record<string, string> = {
      'A': 'Ace', 'K': 'King', 'Q': 'Queen', 'J': 'Jack', '10': 'Ten',
      '9': 'Nine', '8': 'Eight', '7': 'Seven', '6': 'Six', '5': 'Five',
      '4': 'Four', '3': 'Three', '2': 'Two'
    };
    
    return `${rankNames[highCard.rank]} High`;
  }
  
  return description;
}

export function HandStrength({ holeCards, communityCards }: HandStrengthProps) {
  if (holeCards.length < 2) {
    return null;
  }
  
  const evaluation = getBestHand(holeCards, communityCards);
  const draws = detectDraws(holeCards, communityCards);
  const formattedDescription = formatHandDescription(evaluation.description, holeCards, communityCards);
  
  return (
    <UICard className="bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Your Hand Strength</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-xl font-bold text-purple-700">
            {formattedDescription}
          </div>
          
          {draws.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs font-semibold text-gray-600 mb-1">Possible Draws:</div>
              <div className="flex flex-wrap gap-1">
                {draws.map((draw, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-blue-100 text-blue-700">
                    {draw}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {communityCards.length === 0 && (
            <div className="text-xs text-gray-500 italic pt-1">
              Preflop - waiting for community cards
            </div>
          )}
        </div>
      </CardContent>
    </UICard>
  );
}
