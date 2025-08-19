import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../src/lib/supabase';

export default function MatchChatPage() {
  const router = useRouter();
  const { matchId } = router.query;

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

useEffect(() => {
  const verifyAccessAndLoad = async () => {
    if (!matchId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userData } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', user.id)
      .single();

    const userTeamId = userData?.team_id;
    if (!userTeamId) {
      alert('チームに所属していません');
      router.push('/'); // ホームに戻す
      return;
    }

    const { data: matchData } = await supabase
      .from('matches')
      .select('team_id')
      .eq('id', matchId)
      .single();

    const hostTeamId = matchData?.team_id;

    const { data: approvedApps } = await supabase
      .from('applications')
      .select('team_id')
      .eq('match_id', matchId)
      .eq('status', '承認');

    const approvedTeamIds = approvedApps?.map(a => a.team_id) || [];

    const isAllowed =
      userTeamId === hostTeamId || approvedTeamIds.includes(userTeamId);

    if (!isAllowed) {
      alert('この試合の関係者ではありません');
      router.push('/');
      return;
    }

    setUserId(user.id);

    // チャットメッセージを取得
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`*, users(name)`)
      .eq('match_id', matchId)  
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  verifyAccessAndLoad();
}, [matchId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !matchId || !userId) return;

    const { error } = await supabase.from('chat_messages').insert({
      match_id: matchId,
      user_id: userId,
      message: newMessage,
    });

    if (!error) {
      setNewMessage('');
      const { data } = await supabase
        .from('chat_messages')
        .select(`*, users(username)`)
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>チャットルーム</h2>
      <div style={{ maxHeight: 400, overflowY: 'scroll', border: '1px solid #ccc', padding: 8 }}>
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.users?.name || msg.user_id}</strong>: {msg.message}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          style={{ width: '80%' }}
        />
        <button onClick={handleSend}>送信</button>
      </div>
    </div>
  );
}
