'use client';

import { useState, useEffect } from 'react';
import { getDataStorage } from '@/lib/storage';
import { PlayerAnalytics } from '@/types/poker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil, Save, X } from 'lucide-react';

interface PlayerStatsTableProps {
  players: Array<{ id: number; name: string; customName?: string }>;
}

export function PlayerStatsTable({ players }: PlayerStatsTableProps) {
  const storage = getDataStorage();
  const [analytics, setAnalytics] = useState<Record<number, PlayerAnalytics>>({});
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlayerAnalytics>>({});

  useEffect(() => {
    loadAnalytics();
  }, [players]);

  const loadAnalytics = () => {
    const allAnalytics = storage.getPlayerAnalytics();
    const playerAnalytics: Record<number, PlayerAnalytics> = {};
    
    players.forEach(player => {
      if (allAnalytics[player.id]) {
        playerAnalytics[player.id] = allAnalytics[player.id];
      } else {
        // Create default analytics for new players
        playerAnalytics[player.id] = storage.createDefaultAnalytics(
          player.id, 
          player.customName || player.name
        );
      }
    });
    
    setAnalytics(playerAnalytics);
  };

  const startEditing = (playerId: number) => {
    setEditingPlayer(playerId);
    setEditForm(analytics[playerId] || {});
  };

  const saveEdits = () => {
    if (editingPlayer !== null && editForm) {
      storage.updatePlayerAnalytics(editingPlayer, editForm);
      loadAnalytics();
      setEditingPlayer(null);
      setEditForm({});
    }
  };

  const cancelEditing = () => {
    setEditingPlayer(null);
    setEditForm({});
  };

  const updateField = (field: keyof PlayerAnalytics, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const getPlayerDisplayName = (player: { id: number; name: string; customName?: string }) => {
    return analytics[player.id]?.customName || player.customName || player.name;
  };

  const getStyleLabel = (vpip: number, pfr: number, aggFactor: number): string => {
    const isLoose = vpip > 30;
    const isTight = vpip < 20;
    const isAggressive = aggFactor > 2 || pfr > 15;
    const isPassive = aggFactor < 1 || pfr < 8;

    if (isLoose && isAggressive) return '🔴 LAG (Loose-Aggressive)';
    if (isLoose && isPassive) return '🟡 LP (Loose-Passive)';
    if (isTight && isAggressive) return '🟢 TAG (Tight-Aggressive)';
    if (isTight && isPassive) return '🔵 TP (Tight-Passive)';
    return '⚪ Balanced';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Player Analytics</h3>
        <Button size="sm" variant="outline" onClick={loadAnalytics}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Player</th>
              <th className="p-2 text-center">Style</th>
              <th className="p-2 text-center">VPIP</th>
              <th className="p-2 text-center">PFR</th>
              <th className="p-2 text-center">Agg Factor</th>
              <th className="p-2 text-center">3-Bet %</th>
              <th className="p-2 text-center">WTSD</th>
              <th className="p-2 text-center">Bluff %</th>
              <th className="p-2 text-center">Hands</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map(player => {
              const stats = analytics[player.id];
              if (!stats) return null;

              return (
                <tr key={player.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 font-medium">{getPlayerDisplayName(player)}</td>
                  <td className="p-2 text-center text-xs">
                    {getStyleLabel(stats.vpip, stats.pfr, stats.aggressionFactor)}
                  </td>
                  <td className="p-2 text-center">{stats.vpip}%</td>
                  <td className="p-2 text-center">{stats.pfr}%</td>
                  <td className="p-2 text-center">{stats.aggressionFactor.toFixed(1)}</td>
                  <td className="p-2 text-center">{stats.threeBetPercent}%</td>
                  <td className="p-2 text-center">{stats.wtsd}%</td>
                  <td className="p-2 text-center">{stats.bluffFrequency}%</td>
                  <td className="p-2 text-center text-muted-foreground">{stats.handsTracked}</td>
                  <td className="p-2 text-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => startEditing(player.id)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Stats — {getPlayerDisplayName(player)}</DialogTitle>
                        </DialogHeader>
                        
                        {editingPlayer === player.id && (
                          <div className="space-y-4">
                            {/* Custom Name */}
                            <div>
                              <Label>Custom Name</Label>
                              <Input
                                value={editForm.customName || ''}
                                onChange={(e) => updateField('customName', e.target.value)}
                                placeholder="Enter custom name"
                              />
                            </div>

                            {/* Core Stats */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>VPIP (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editForm.vpip ?? 0}
                                  onChange={(e) => updateField('vpip', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>PFR (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editForm.pfr ?? 0}
                                  onChange={(e) => updateField('pfr', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>Aggression Factor</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={editForm.aggressionFactor ?? 0}
                                  onChange={(e) => updateField('aggressionFactor', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>3-Bet (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editForm.threeBetPercent ?? 0}
                                  onChange={(e) => updateField('threeBetPercent', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>C-Bet (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editForm.cBetPercent ?? 0}
                                  onChange={(e) => updateField('cBetPercent', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>Fold to C-Bet (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editForm.foldToCBetPercent ?? 0}
                                  onChange={(e) => updateField('foldToCBetPercent', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                            </div>

                            {/* Showdown Stats */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>WTSD (Went to Showdown %)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editForm.wtsd ?? 0}
                                  onChange={(e) => updateField('wtsd', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>W$SD (Won at Showdown %)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editForm.wsd ?? 0}
                                  onChange={(e) => updateField('wsd', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                            </div>

                            {/* Tendency Stats */}
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label>Bluff Frequency (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editForm.bluffFrequency ?? 30}
                                  onChange={(e) => updateField('bluffFrequency', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>Calldown Frequency (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editForm.calldownFrequency ?? 0}
                                  onChange={(e) => updateField('calldownFrequency', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div>
                                <Label>Fold to Aggression (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editForm.foldToAggression ?? 0}
                                  onChange={(e) => updateField('foldToAggression', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                            </div>

                            {/* Hands Tracked */}
                            <div>
                              <Label>Hands Tracked</Label>
                              <Input
                                type="number"
                                min="0"
                                value={editForm.handsTracked ?? 0}
                                onChange={(e) => updateField('handsTracked', parseInt(e.target.value) || 0)}
                              />
                            </div>

                            {/* Tags */}
                            <div>
                              <Label>Tags (comma-separated)</Label>
                              <Input
                                value={editForm.tags?.join(', ') || ''}
                                onChange={(e) => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                                placeholder="e.g., tight, aggressive, bluffs_river"
                              />
                            </div>

                            {/* Notes */}
                            <div>
                              <Label>Notes</Label>
                              <Textarea
                                value={editForm.notes || ''}
                                onChange={(e) => updateField('notes', e.target.value)}
                                placeholder="Add notes about this player's tendencies..."
                                rows={3}
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 justify-end pt-4 border-t">
                              <Button variant="outline" onClick={cancelEditing}>
                                <X className="h-4 w-4 mr-1" /> Cancel
                              </Button>
                              <Button onClick={saveEdits}>
                                <Save className="h-4 w-4 mr-1" /> Save Changes
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-md">
        <div className="font-semibold mb-1">Stats Guide:</div>
        <div><strong>VPIP:</strong> Voluntarily Put $ In Pot (preflop participation)</div>
        <div><strong>PFR:</strong> Pre-Flop Raise (aggression preflop)</div>
        <div><strong>Agg Factor:</strong> (Bets + Raises) / Calls ratio</div>
        <div><strong>3-Bet %:</strong> Frequency of re-raising preflop</div>
        <div><strong>WTSD:</strong> How often they reach showdown</div>
        <div><strong>Bluff %:</strong> Estimated bluffing frequency</div>
      </div>
    </div>
  );
}
