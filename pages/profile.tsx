import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';

export default function ProfilePage() {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  // ユーザー情報の取得
  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage('ログインしてください');
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (error) {
        setMessage('ユーザー情報の取得に失敗しました');
      } else {
        setName(data?.name || '');
      }
    };

    fetchUserInfo();
  }, []);

  // ユーザー名の更新
  const updateName = async () => {
    const { error } = await supabase
      .from('users')
      .update({ name })
      .eq('id', userId);

    if (error) {
      setMessage('更新に失敗しました');
    } else {
      setMessage('ユーザー名を更新しました');
    }
  };

  //アカウントの削除
const deleteAccount = async () => {
  const confirmed = confirm('本当にアカウントを削除しますか？この操作は元に戻せません。');
  if (!confirmed) return;

  try {
    const { error } = await supabase.rpc('delete_user');
    if (error) {
      setMessage('アカウントの削除に失敗しました: ' + error.message);
      return;
    }

    await supabase.auth.signOut();
    setMessage('アカウントを削除しました。');
    window.location.href = '/login';

  } catch (e: any) {
    setMessage('予期せぬエラー: ' + e.message);
  }
};


  return (
    <div style={{ padding: 32 }}>
      <h1>プロフィール</h1>

      <label>ユーザー名:</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br />
      <button onClick={updateName}>変更を保存</button>
      <button onClick={deleteAccount} style={{color: `red` , marginTop:16}}>アカウントを削除する</button>
      {message && <p>{message}</p>}
    </div>
  );
}
