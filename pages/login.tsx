import { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setError('');

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setError('ユーザー情報の取得に失敗しました');
        return;
      }

      const userId = userData.user.id;

      const { error: insertError } = await supabase
        .from('users')
        .insert({ id: userId, name });

      if (insertError) {
        setError('ユーザー情報の保存に失敗しました');
        return;
      }

    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }
    }

    router.push('/');
  };

  return (
    <div style={{ padding: 32 }}>
      <h2>{isSignUp ? '新規登録' : 'ログイン'}</h2>

      {isSignUp && (
        <input
          type="text"
          placeholder="ユーザー名"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <br />

      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      /><br />

      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      /><br />

      <button onClick={handleAuth}>
        {isSignUp ? '登録する' : 'ログイン'}
      </button>
      <br />

      <button onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp ? 'ログインに切り替え' : '新規登録に切り替え'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
