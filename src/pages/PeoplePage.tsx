import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ChevronRight, Users, Loader2, Sparkles } from 'lucide-react';
import { Card, Button, Sheet, EyebrowLabel, SectionDivider } from '../components/ui';
import { PersonForm } from '../components/people/PersonForm';
import { useAuth } from '../context/AuthContext';
import { people as peopleDal } from '../dal';
import type { Person } from '../dal/people';
import { getZodiacSign } from '../utils/zodiac';
import { SIGN_GLYPH } from '../lib/chart';

const REL_LABEL: Record<string, string> = { self: 'You', partner: 'Partner', family: 'Family', friend: 'Friend', other: 'Other' };

function signGlyphFor(birthDate: string): string {
  try {
    const sign = getZodiacSign(birthDate);
    const cap = sign.charAt(0).toUpperCase() + sign.slice(1);
    return SIGN_GLYPH[cap] ?? '☉';
  } catch { return '☉'; }
}

/** People — save friends & family birth data to view their charts and
 *  compatibility (Arcana 2.0, Cece-style). */
export function PeoplePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Person[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await peopleDal.listForUser(user.id);
    setList(res.ok ? res.data : []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 pb-28">
      <div className="space-y-2">
        <EyebrowLabel>Your circle</EyebrowLabel>
        <h1 className="heading-display-xl text-mystic-100">People</h1>
        <p className="text-sm text-mystic-400">Save the birth details of people you care about to explore their charts and your compatibility.</p>
        <SectionDivider tone="gold" />
      </div>

      <Button variant="primary" size="md" fullWidth onClick={() => setShowForm(true)}>
        <UserPlus className="w-4 h-4 mr-2" /> Add a person
      </Button>

      {list === null ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <Users className="w-10 h-10 text-mystic-600 mx-auto" />
          <h3 className="heading-display-md text-mystic-200">No one here yet</h3>
          <p className="text-sm text-mystic-400">Add your partner, a parent, or a friend to reveal their natal chart and see how your stars align.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <button key={p.id} onClick={() => navigate(`/people/${p.id}`)}
              className="w-full flex items-center gap-3 rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 hover:border-gold/30 transition-colors text-left active:scale-[0.99]">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 border border-gold/25 flex items-center justify-center text-2xl" style={{ fontFamily: 'serif' }}>
                {signGlyphFor(p.birthDate)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-mystic-100 truncate">{p.name}</div>
                <div className="text-xs text-mystic-500">
                  {REL_LABEL[p.relationship]} · {new Date(p.birthDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  {!p.birthTime && ' · time unknown'}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-mystic-600 flex-shrink-0" />
            </button>
          ))}
          <p className="text-center text-xs text-mystic-600 pt-2"><Sparkles className="w-3 h-3 inline mr-1" />{list.length} / 50 saved</p>
        </div>
      )}

      <Sheet open={showForm} onClose={() => setShowForm(false)} title="Add a person">
        <PersonForm
          onSaved={(person) => { setShowForm(false); load(); navigate(`/people/${person.id}`); }}
          onCancel={() => setShowForm(false)}
        />
      </Sheet>
    </div>
  );
}
