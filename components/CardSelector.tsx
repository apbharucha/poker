import { Card } from '@/types/poker';
import { RANKS, SUITS, SUIT_SYMBOLS, SUIT_COLORS } from '@/lib/poker-utils';
import { Button } from '@/components/ui/button';
import { Card as UICard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface CardSelectorProps {
  selectedCards: Card[];
  onCardsChange: (cards: Card[]) => void;
  maxCards: number;
  title: string;
  disabled?: boolean;
  excludeCards?: Card[]; // cards that must not be selectable
}

export function CardSelector({ selectedCards, onCardsChange, maxCards, title, disabled = false, excludeCards = [] }: CardSelectorProps) {
  const isCardSelected = (card: Card) => {
    return selectedCards.some((c) => c.rank === card.rank && c.suit === card.suit);
  };

  const isExcluded = (card: Card) => {
    return excludeCards.some((c) => c.rank === card.rank && c.suit === card.suit);
  };

  const toggleCard = (card: Card) => {
    if (disabled || isExcluded(card)) return;
    if (isCardSelected(card)) {
      onCardsChange(selectedCards.filter((c) => !(c.rank === card.rank && c.suit === card.suit)));
    } else if (selectedCards.length < maxCards) {
      onCardsChange([...selectedCards, card]);
    }
  };

  const removeCard = (card: Card) => {
    if (disabled) return;
    onCardsChange(selectedCards.filter((c) => !(c.rank === card.rank && c.suit === card.suit)));
  };

  return (
    <UICard>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap min-h-[60px] p-2 border rounded-md bg-muted/30">
          {selectedCards.length === 0 ? (
            <span className="text-sm text-muted-foreground">{disabled ? 'Selection disabled' : 'Select cards below'}</span>
          ) : (
            selectedCards.map((card, index) => (
              <Badge key={index} variant="secondary" className="text-xl px-3 py-2 gap-2">
                <span className={SUIT_COLORS[card.suit]}>
                  {card.rank}
                  {SUIT_SYMBOLS[card.suit]}
                </span>
                <button type="button" onClick={() => removeCard(card)} className={`hover:opacity-70 ${disabled ? 'pointer-events-none opacity-50' : ''}`} disabled={disabled}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>

        <div className="space-y-2">
          {SUITS.map((suit) => (
            <div key={suit} className="flex gap-1 flex-wrap">
              {RANKS.map((rank) => {
                const card: Card = { rank, suit };
                const selected = isCardSelected(card);
                return (
                  <Button
                    key={`${rank}-${suit}`}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleCard(card)}
                    disabled={disabled || isExcluded(card) || (!selected && selectedCards.length >= maxCards)}
                    className={`w-12 h-10 p-0 ${(disabled || isExcluded(card)) ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <span className={`font-bold ${SUIT_COLORS[suit]} ${selected ? 'drop-shadow-sm' : ''}`}>
                      {rank}
                      {SUIT_SYMBOLS[suit]}
                    </span>
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </UICard>
  );
}
