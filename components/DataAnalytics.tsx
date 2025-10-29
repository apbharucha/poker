import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDataStorage } from '@/lib/storage';
import { BarChart3, Download, Trash2, RefreshCw } from 'lucide-react';
import { GameState } from '@/types/poker';

interface DataAnalyticsProps {
  gameState?: GameState;
  sessionStartTime?: number;
}

export function DataAnalytics({ gameState, sessionStartTime }: DataAnalyticsProps) {
  const [stats, setStats] = useState<any>(null);
  const [handsCount, setHandsCount] = useState(0);
  const [actionsCount, setActionsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const dataStorage = getDataStorage();

  const loadStats = () => {
    setIsLoading(true);
    try {
      const allHands = dataStorage.getHands();
      const allRecommendations = dataStorage.getAIRecommendations();
      const allActions = dataStorage.getPlayerActions();
      
      // Filter to current session only if sessionStartTime provided
      const hands = sessionStartTime 
        ? allHands.filter((h: any) => h.timestamp >= sessionStartTime)
        : allHands;
      
      const completedHandIds = new Set(hands.map((h: any) => h.id));
      const recommendations = allRecommendations.filter((r: any) => completedHandIds.has(r.handId));
      const actions = allActions.filter((a: any) => completedHandIds.has(a.handId));
      
      // Calculate AI stats for current session
      const validRecs = recommendations.filter((rec: any) => rec.actualOutcome !== undefined);
      const aiStats = validRecs.length > 0 ? {
        totalRecommendations: validRecs.length,
        followRate: validRecs.filter((rec: any) => rec.wasFollowed === true).length / validRecs.length,
        avgConfidence: validRecs.reduce((sum: number, rec: any) => sum + rec.recommendation.winProbability, 0) / validRecs.length
      } : {
        totalRecommendations: 0,
        followRate: 0,
        avgConfidence: 0
      };
      
      setStats(aiStats);
      setHandsCount(hands.length);
      setActionsCount(actions.length);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, [sessionStartTime]);

  const exportData = () => {
    try {
      const data = dataStorage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poker_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data');
    }
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all poker data? This cannot be undone.')) {
      dataStorage.clearAllData();
      loadStats();
      alert('All data cleared successfully');
    }
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result as string;
            dataStorage.importData(data);
            loadStats();
            alert('Data imported successfully');
          } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import data: Invalid format');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Loading Analytics...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading poker data analytics...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {sessionStartTime ? 'Current Game Analytics' : 'Poker Data Analytics'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{handsCount}</div>
            <div className="text-sm text-muted-foreground">Hands Played</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{actionsCount}</div>
            <div className="text-sm text-muted-foreground">Player Actions</div>
          </div>
        </div>

        {stats && stats.totalRecommendations > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">AI Performance</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total AI Recommendations:</span>
                <Badge variant="outline">{stats.totalRecommendations}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Recommendation Follow Rate:</span>
                <Badge variant={stats.followRate > 0.5 ? "default" : "secondary"}>
                  {(stats.followRate * 100).toFixed(1)}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average AI Confidence:</span>
                <Badge variant="outline">
                  {(stats.avgConfidence * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button onClick={loadStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button onClick={importData} variant="outline" size="sm">
            Import
          </Button>
          <Button onClick={clearData} variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Data is stored locally in your browser. Export regularly for backup.
        </div>
      </CardContent>
    </Card>
  );
}
