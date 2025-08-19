import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../src/lib/supabase';

export default function MatchChatPage() {
  const router = useRouter();
  const { matchId } = router.query as { matchId?: string };

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  useEffect(() => {
    const verifyAccessAndLoad = async () => {
      if (!matchId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users').select('team_id').eq('id', user.id).single();
      const userTeamId = userData?.team_id;
      if (!userTeamId) { alert('チームに所属していません'); router.push('/'); return; }

      const { data: matchData } = await supabase
        .from('matches').select('team_id').eq('id', matchId).single();
      const hostTeamId = matchData?.team_id;

      const { data: approvedApps } = await supabase
        .from('applications').select('team_id').eq('match_id', matchId).eq('status', '承認');
      const approvedTeamIds = approvedApps?.map(a => a.team_id) || [];

      const isAllowed = userTeamId === hostTeamId || approvedTeamIds.includes(userTeamId);
      if (!isAllowed) { alert('この試合の関係者ではありません'); router.push('/'); return; }

      setUserId(user.id);

      const { data } = await supabase
        .from('chat_messages')
        .select('*, users(name)')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };

    verifyAccessAndLoad();
  }, [matchId, router]);

  // リアルタイム購読
  useEffect(() => {
    if (!matchId) return;
    const ch = supabase
      .channel(`chat_${matchId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `match_id=eq.${matchId}` },
        payload => setMessages(prev => [...prev, payload.new])
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !matchId || !userId) return;
    const { error } = await supabase.from('chat_messages').insert({
      match_id: matchId, user_id: userId, message: newMessage,
    });
    if (!error) setNewMessage('');
  };

  return (
    <div className="container">
      <div className="card" style={{padding:0, display:'flex', flexDirection:'column', height:'70vh'}}>
        <div style={{padding:'12px 16px', borderBottom:'1px solid var(--line)'}}>
          <strong>チャット</strong>
        </div>

        <div style={{flex:1, overflow:'auto', padding:16}}>
          <div className="chat">
            {messages.map(msg => (
              <div key={msg.id} className={`msg ${msg.user_id === userId ? 'me' : ''}`}>
                <div className="meta">
                  {msg.users?.name || msg.user_id}・{new Date(msg.created_at).toLocaleTimeString()}
                </div>
                <div>{msg.message}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="chatbox">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="メッセージを入力…"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
          />
          <button className="btn primary" onClick={handleSend}>送信</button>
        </div>
      </div>
    </div>
  );
}
