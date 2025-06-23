// pages/_app.tsx
import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { supabase } from '../src/lib/supabase';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const ensureUserRecord = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existing && !error) {
        await supabase.from('users').insert({
          id: user.id,
          name: user.email ?? 'no name',
          team_id: null,
        });
      }
    };

    ensureUserRecord();
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
