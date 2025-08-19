// pages/_app.tsx
import type { AppProps } from "next/app";
import { useEffect } from "react";
import '../node_modules/leaflet/dist/leaflet.css';
import { supabase } from "../src/lib/supabase";
import Header from "../components/Header";
import "../src/styles/globals.css"; // ← パスはこの形に（/src/styles/globals.css が存在する前提）

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // ログイン済なら users 行を作成（なければ）
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!data && !error) {
        await supabase.from("users").insert({
          id: user.id,
          name: user.email ?? "no name",
          team_id: null,
        });
      }
    })();
  }, []);

  return (
    <>
      <Header />
        <main className="container">
          <Component {...pageProps} />
        </main>
    </>
  );
}
