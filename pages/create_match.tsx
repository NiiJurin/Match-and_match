import { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { useRouter } from 'next/router';

export default function CreateMatch() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [levelPreference, setLevelPreference] = useState('');
  const [error, setError] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserTeam = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('ログインしてください');
        return;
      }

      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .single();

      if (userErr || !userData.team_id) {
        setError('チームに所属していません');
        return;
      }

      setTeamId(userData.team_id);
    };

    fetchUserTeam();
  }, []);

const handleSubmit = async () => {
  if (!teamId) {
    setError('チーム情報が取得できません');
    return;
  }

  const { error: insertError } = await supabase.from('matches').insert({
    date,
    time,
    location,
    level_preference: levelPreference,
    team_id: teamId,
    status: '募集中'
  });

  if (insertError) {
    setError(insertError.message);
  } else {
    router.push('/matches');
  }
};
return (
  <div style={{ padding: 32 }}>
    <h1>試合作成</h1>
    <div>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="日付" />
    </div>
    <div>
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="時間" />
    </div>
    <div>
      <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="場所" />
    </div>
    <div>
      <input type="text" value={levelPreference} onChange={(e) => setLevelPreference(e.target.value)} placeholder="希望レベル" />
    </div>
    <div>
      <button onClick={handleSubmit}>作成する</button>
    </div>
    {error && <p style={{ color: 'red' }}>{error}</p>}
  </div>
);