import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getDataStorage } from '@/lib/storage';
import { FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { SUIT_SYMBOLS } from '@/lib/poker-utils';

interface HandHistoryLogsProps {
  sessionStartTime?: number;
}

export function HandHistoryLogs({ sessionStartTime }: HandHistoryLogsProps) {
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null);
  const [hands, setHands] = useState<any[]>([]);
  const dataStorage = getDataStorage();

  useEffect(() => {
    loadHands();
  }, [sessionStartTime]);

  const loadHands = () => {
    const allHands = dataStorage.getHands();
    const filteredHands = sessionStartTime
      ? allHands.filter((h: any) => h.timestamp >= sessionStartTime)
      : allHands;
    
    setHands(filteredHands.sort((a, b) => b.timestamp - a.timestamp));
    if (filteredHands.length > 0 && !selectedHandId) {
      setSelectedHandId(filteredHands[0].id);
    }
  };

  const getHandLog = (handId: string) => {
    const hand = hands.find(h => h.id === handId);
    if (!hand) return null;

    const actions = dataStorage.getPlayerActions().filter((a: any) => a.handId === handId);
    const recommendations = dataStorage.getAIRecommendations().filter((r: any) => r.handId === handId);

    // Build chronological event log
    const events: any[] = [];

    // Starting info
    events.push({
      type: 'hand_start',
      data: {
        handNumber: hand.handNumber,
        timestamp: hand.timestamp,
        players: hand.players.map((p: any) => ({ name: p.name, stack: p.stack, position: p.position }))
      }
    });

    // Add user hole cards if present
    if (hand.userHoleCards && hand.userHoleCards.length > 0) {
      events.push({
        type: 'hole_cards',
        data: { cards: hand.userHoleCards }
      });
    }

    // Add all actions chronologically
    actions
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((action: any) => {
        events.push({
          type: 'player_action',
          data: action
        });
      });

    // Add community cards by round
    if (hand.communityCards && hand.communityCards.length > 0) {
      if (hand.communityCards.length >= 3) {
        events.push({
          type: 'flop',
          data: { cards: hand.communityCards.slice(0, 3) }
        });
      }
      if (hand.communityCards.length >= 4) {
        events.push({
          type: 'turn',
          data: { cards: [hand.communityCards[3]] }
        });
      }
      if (hand.communityCards.length >= 5) {
        events.push({
          type: 'river',
          data: { cards: [hand.communityCards[4]] }
        });
      }
    }

    // Add outcome
    events.push({
      type: 'hand_end',
      data: {
        outcome: hand.outcome,
        potSize: hand.potSize
      }
    });

    return { hand, events, recommendations };
  };

  const formatCard = (card: any) => {
    return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
  };

  const downloadLogs = () => {
    const allLogs = hands.map(hand => {
      const log = getHandLog(hand.id);
      if (!log) return '';

      let text = `\n${'='.repeat(60)}\n`;
      text += `HAND #${log.hand.handNumber}\n`;
      text += `Date: ${new Date(log.hand.timestamp).toLocaleString()}\n`;
      text += `${'='.repeat(60)}\n\n`;

      text += `Starting Stacks:\n`;
      log.hand.players.forEach((p: any) => {
        const position = p.isDealer ? ' (BTN)' : p.isSmallBlind ? ' (SB)' : p.isBigBlind ? ' (BB)' : '';
        text += `  ${p.name}${position}: $${p.stack}\n`;
      });
      text += `\nPot: $${log.hand.potSize}\n\n`;

      if (log.hand.userHoleCards && log.hand.userHoleCards.length > 0) {
        text += `Your Cards: ${log.hand.userHoleCards.map(formatCard).join(', ')}\n\n`;
      }

      text += `Actions:\n`;
      log.events.forEach((event: any) => {
        switch (event.type) {
          case 'player_action':
            const action = event.data;
            let actionText = `  [${action.bettingRound.toUpperCase()}] ${action.playerName} ${action.action}`;
            if (action.amount > 0) {
              actionText += ` $${action.amount}`;
            }
            text += `${actionText}\n`;
            break;
          case 'flop':
            text += `\n  FLOP: ${event.data.cards.map(formatCard).join(', ')}\n\n`;
            break;
          case 'turn':
            text += `\n  TURN: ${event.data.cards.map(formatCard).join(', ')}\n\n`;
            break;
          case 'river':
            text += `\n  RIVER: ${event.data.cards.map(formatCard).join(', ')}\n\n`;
            break;
        }
      });

      text += `\nOutcome: ${log.hand.outcome}\n`;
      
      if (log.recommendations.length > 0) {
        text += `\nAI Recommendations:\n`;
        log.recommendations.forEach((rec: any) => {
          text += `  - ${rec.recommendation.action.toUpperCase()} (Win Probability: ${(rec.recommendation.winProbability * 100).toFixed(1)}%)\n`;
          text += `    Reasoning: ${rec.recommendation.reasoning}\n`;
        });
      }

      return text;
    }).join('\n\n');

    const fullLog = `POKER HAND HISTORY\nExported: ${new Date().toLocaleString()}\nTotal Hands: ${hands.length}\n${allLogs}`;

    const blob = new Blob([fullLog], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poker_logs_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (hands.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Hand History Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No hands played yet. Complete a hand to see logs here.
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedLog = selectedHandId ? getHandLog(selectedHandId) : null;
  const currentIndex = hands.findIndex(h => h.id === selectedHandId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Hand History Logs
          </CardTitle>
          <Button onClick={downloadLogs} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download All Logs
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (currentIndex < hands.length - 1) {
                setSelectedHandId(hands[currentIndex + 1].id);
              }
            }}
            disabled={currentIndex >= hands.length - 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Select value={selectedHandId || ''} onValueChange={setSelectedHandId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a hand" />
            </SelectTrigger>
            <SelectContent>
              {hands.map((hand, idx) => (
                <SelectItem key={hand.id} value={hand.id}>
                  Hand #{hand.handNumber} - {new Date(hand.timestamp).toLocaleTimeString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (currentIndex > 0) {
                setSelectedHandId(hands[currentIndex - 1].id);
              }
            }}
            disabled={currentIndex <= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {selectedLog && (
          <ScrollArea className="h-[500px] border rounded-lg p-4">
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-bold text-lg">Hand #{selectedLog.hand.handNumber}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedLog.hand.timestamp).toLocaleString()}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Starting Stacks</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedLog.hand.players.map((p: any) => (
                    <div key={p.id} className="text-sm">
                      <span className="font-medium">{p.name}</span>
                      {p.isDealer && <Badge variant="outline" className="ml-1 text-xs">BTN</Badge>}
                      {p.isSmallBlind && <Badge variant="outline" className="ml-1 text-xs">SB</Badge>}
                      {p.isBigBlind && <Badge variant="outline" className="ml-1 text-xs">BB</Badge>}
                      <span className="ml-2 text-muted-foreground">${p.stack}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedLog.hand.userHoleCards && selectedLog.hand.userHoleCards.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Your Cards</h4>
                  <div className="flex gap-2">
                    {selectedLog.hand.userHoleCards.map((card: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-base px-3 py-1">
                        {formatCard(card)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Hand Events</h4>
                <div className="space-y-2">
                  {selectedLog.events.map((event: any, idx: number) => {
                    switch (event.type) {
                      case 'player_action':
                        const action = event.data;
                        return (
                          <div key={idx} className="text-sm pl-3 border-l-2 border-gray-200">
                            <span className="text-xs text-muted-foreground">[{action.bettingRound.toUpperCase()}]</span>
                            {' '}
                            <span className="font-medium">{action.playerName}</span>
                            {' '}
                            <span className="text-blue-600">{action.action}</span>
                            {action.amount > 0 && <span className="ml-1 text-green-600">${action.amount}</span>}
                          </div>
                        );
                      case 'flop':
                        return (
                          <div key={idx} className="text-sm font-semibold bg-green-50 p-2 rounded">
                            <span className="text-green-700">FLOP:</span>
                            {' '}
                            {event.data.cards.map((c: any) => formatCard(c)).join(' ')}
                          </div>
                        );
                      case 'turn':
                        return (
                          <div key={idx} className="text-sm font-semibold bg-blue-50 p-2 rounded">
                            <span className="text-blue-700">TURN:</span>
                            {' '}
                            {event.data.cards.map((c: any) => formatCard(c)).join(' ')}
                          </div>
                        );
                      case 'river':
                        return (
                          <div key={idx} className="text-sm font-semibold bg-purple-50 p-2 rounded">
                            <span className="text-purple-700">RIVER:</span>
                            {' '}
                            {event.data.cards.map((c: any) => formatCard(c)).join(' ')}
                          </div>
                        );
                      case 'hand_end':
                        return (
                          <div key={idx} className="text-sm font-semibold bg-yellow-50 p-3 rounded mt-3">
                            <div className="text-yellow-800">Pot: ${event.data.potSize}</div>
                            <div className="text-gray-700 mt-1">{event.data.outcome}</div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              </div>

              {selectedLog.recommendations.length > 0 && (
                <div className="border-t pt-3">
                  <h4 className="font-semibold mb-2">AI Recommendations</h4>
                  {selectedLog.recommendations.map((rec: any, idx: number) => (
                    <div key={idx} className="text-sm bg-blue-50 p-3 rounded mb-2">
                      <div className="font-medium text-blue-700">
                        {rec.recommendation.action.toUpperCase()}
                        <Badge variant="outline" className="ml-2">
                          {(rec.recommendation.winProbability * 100).toFixed(1)}% Win
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {rec.recommendation.reasoning}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
