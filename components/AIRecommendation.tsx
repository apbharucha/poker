import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AIRecommendation as AIRecommendationType } from '@/types/poker';
import { Lightbulb, TrendingUp, Target } from 'lucide-react';

interface AIRecommendationProps {
  recommendation: AIRecommendationType | null;
  loading: boolean;
}

export function AIRecommendation({ recommendation, loading }: AIRecommendationProps) {
  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-purple-600" />
            AI Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Analyzing game state...</div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-purple-600" />
            AI Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Enter your cards to get AI recommendation</div>
        </CardContent>
      </Card>
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'fold':
        return 'destructive';
      case 'check':
        return 'secondary';
      case 'call':
        return 'outline';
      case 'raise':
        return 'default';
      case 'all-in':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-purple-600" />
          AI Recommendation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-sm text-muted-foreground">Suggested Action:</span>
          </div>
          <Badge variant={getActionColor(recommendation.action)} className="text-lg px-4 py-1">
            {recommendation.action.toUpperCase()}
            {recommendation.betSize ? ` $${recommendation.betSize}` : ''}
            {typeof recommendation.primaryFrequency === 'number' && (
              <span className="ml-2 text-xs text-muted-foreground">{recommendation.primaryFrequency}%</span>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-xs text-muted-foreground">Win Probability</div>
              <div className="font-semibold text-lg">{recommendation.winProbability.toFixed(1)}%</div>
            </div>
          </div>

          {recommendation.potOdds && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-xs text-muted-foreground">Pot Odds</div>
                <div className="font-semibold text-lg">{recommendation.potOdds.toFixed(1)}%</div>
              </div>
            </div>
          )}
        </div>

        {recommendation.expectedValue !== null && recommendation.expectedValue !== undefined && (
          <div>
            <span className="text-xs text-muted-foreground">Expected Value:</span>{' '}
            <span className={`font-semibold ${recommendation.expectedValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${recommendation.expectedValue.toFixed(2)}
            </span>
          </div>
        )}

        {recommendation.bluffAware && typeof recommendation.bluffSuccessOdds === 'number' && (
          <div className="flex items-center gap-2">
            <div className="text-xs text-purple-700">Estimated bluff success:</div>
            <div className="font-semibold text-sm text-purple-800">{recommendation.bluffSuccessOdds}%</div>
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-1">Strategic Analysis:</div>
          <p className="text-sm leading-relaxed">{recommendation.reasoning}</p>
        </div>

        {recommendation.secondary && (
          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground mb-1">Alternative Line:</div>
            <div className="flex items-center gap-3">
              <Badge variant={getActionColor(recommendation.secondary.action)} className="text-sm px-3 py-1">
                {recommendation.secondary.action.toUpperCase()}
                {recommendation.secondary.betSize ? ` $${recommendation.secondary.betSize}` : ''}
                {typeof recommendation.secondary.frequency === 'number' && (
                  <span className="ml-2 text-[10px] text-muted-foreground">{recommendation.secondary.frequency}%</span>
                )}
              </Badge>
            </div>
            <p className="text-xs mt-2 text-muted-foreground">{recommendation.secondary.reasoning}</p>
          </div>
        )}

        {recommendation.bluffAware && (
          <div className="text-[11px] text-purple-700 mt-2">Bluff intent detected: recommendations biased toward aggression.</div>
        )}
      </CardContent>
    </Card>
  );
}
