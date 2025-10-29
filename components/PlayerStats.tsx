import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDataStorage, PlayerTag } from '@/lib/storage';
import { Player } from '@/types/poker';

interface PlayerStatsProps {
  players: Player[];
}

const TAGS: { value: PlayerTag; label: string }[] = [
  { value: 'bluff_success', label: 'Bluffed successfully' },
  { value: 'bluff_fail', label: 'Bluffed unsuccessfully' },
  { value: 'agg_weak', label: 'Aggressive with weak hands' },
  { value: 'value_bet_good', label: 'Value betting well' },
  { value: 'called_bluff', label: 'Called a bluff well' },
];

export function PlayerStats({ players }: PlayerStatsProps) {
  const storage = getDataStorage();
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<PlayerTag>('bluff_success');
  const notes = storage.getPlayerNotes();

  const enriched = useMemo(() => {
    return players.map(p => ({
      ...p,
      notes: notes[String(p.id)] || {},
    }));
  }, [players, notes]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Player Stats & Reads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="sm:w-64"><SelectValue placeholder="Select player" /></SelectTrigger>
            <SelectContent>
              {players.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTag} onValueChange={(v: PlayerTag) => setSelectedTag(v)}>
            <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TAGS.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!selectedPlayer}
            onClick={() => {
              if (!selectedPlayer) return;
              storage.addPlayerTag(parseInt(selectedPlayer, 10), selectedTag);
            }}
          >
            Save Tag
          </Button>
          <Button variant="outline" onClick={() => { setSelectedPlayer(''); }}>
            No additional info
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {enriched.map(p => (
            <div key={p.id} className="border rounded-md p-3">
              <div className="font-semibold">{p.name}</div>
              <div className="text-xs text-muted-foreground">Stack: ${p.stack}</div>
              <div className="mt-2 text-sm grid grid-cols-2 gap-1">
                {TAGS.map(t => (
                  <div key={t.value} className="flex justify-between">
                    <span>{t.label}</span>
                    <span className="font-semibold">{(p.notes as any)[t.value] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}