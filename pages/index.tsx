import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../src/lib/supabase';

export default function HomePage() {
  const [matchList, setMatchList] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('name, team_id')
        .eq('id', user.id)
        .single();

      setUsername(userData?.name || '');
      const myTeamId = userData?.team_id;
      if (!myTeamId) return;

      // チーム名を取得
      const { data: teamData } = await supabase
        .from('teams')
        .select('name')
        .eq('id', myTeamId)
        .single();

      setTeamName(teamData?.name || '');

      // 試合取得ロジック（同じ）
      const { data: hostMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('team_id', myTeamId)
        .eq('status', 'マッチ済');

      const { data: approvedApps } = await supabase
        .from('applications')
        .select('match_id')
        .eq('team_id', myTeamId)
        .eq('status', '承認');

      const approvedMatchIds = approvedApps?.map(a => a.match_id);
      const { data: approvedMatches } = await supabase
        .from('matches')
        .select('*')
        .in('id', approvedMatchIds || [])
        .eq('status', 'マッチ済');

      const combined = [...(hostMatches || []), ...(approvedMatches || [])];
      setMatchList(combined);
    };

    fetchData();
  }, []);

  return (
    
<div style={{ padding: 32 }} className='container'>
  <h1>Match to Match ホーム</h1>
  <li><Link href="/profile">プロフィール</Link></li>
  <div style={{ marginBottom: 16 }}>
    <p><strong>ユーザー名：</strong>{username || '未設定'}</p>
    <p><strong>所属チーム：</strong>{teamName || '未所属'}</p>
  </div>

      {matchList.length === 0 && <p>関係するマッチ済み試合はありません。</p>}

      <ul>
        {matchList.map(match => (
          <li key={match.id}>
            {match.date} / {match.location} - 
            <Link href={`/chat/${match.id}`} style={{ marginLeft: 8 }}>
              💬 チャットへ
            </Link>
          </li>
        ))}
      </ul>

      <hr />
      <p>その他のページ:</p>
      <ul>
        <li><Link href="/login">ログイン</Link></li>
        <li><Link href="/create_team">チーム作成</Link></li>
        <li><Link href="/join_team">チームに参加</Link></li>
        <li><Link href="/create_match">試合作成</Link></li>
        <li><Link href="/matches">試合を探す</Link></li>
        <li><Link href="/applications">応募管理</Link></li>
        <li><Link href="/my_applications">自分の応募一覧</Link></li>
      </ul>
    </div>
  );
}
