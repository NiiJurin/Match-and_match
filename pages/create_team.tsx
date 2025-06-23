import { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { useRouter } from 'next/router';

export default function CreateTeam() {
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [level, setLevel] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('ログインしてください');
      return;
    }

    // 1. チーム作成
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        area,
        level,
        owner_id: user.id
      })
      .select()
      .single();

    if (teamError) {
      setError(teamError.message);
      return;
    }

    // 2. usersテーブルのteam_idを更新
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ team_id: team.id })
      .eq('id', user.id);

    if (userUpdateError) {
      setError(userUpdateError.message);
    } else {
      router.push('/');
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h2>チーム作成</h2>
      <input
        type="text"
        placeholder="チーム名"
        value={name}
        onChange={(e) => setName(e.target.value)}
      /><br />
      <input
        type="text"
        placeholder="活動地域（例：東京）"
        value={area}
        onChange={(e) => setArea(e.target.value)}
      /><br />
      <input
        type="text"
        placeholder="レベル（初心者〜上級者）"
        value={level}
        onChange={(e) => setLevel(e.target.value)}
      /><br />
      <button onClick={handleSubmit}>チームを作成</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
