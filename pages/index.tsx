// pages/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../src/lib/supabase";

type Match = {
  id: string;
  date: string;
  time: string;
  location: string;
  status: string;
  team_id: string;
};

const uniqById = <T extends { id: string }>(rows: T[]) =>
  Array.from(new Map(rows.map(r => [r.id, r])).values());

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [username, setUsername] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamId, setTeamId]     = useState<string | null>(null);
  const [matches, setMatches]   = useState<Match[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true); setError("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // users と teams を JOIN して1発で取得
      const { data: u, error: userErr } = await supabase
        .from("users")
        .select("name, team_id, teams(name)")
        .eq("id", user.id)
        .single();

      if (userErr) { setError(userErr.message); setLoading(false); return; }

      setUsername(u?.name || "");
      setTeamId(u?.team_id ?? null);
      setTeamName(u?.teams?.name || "");

      if (!u?.team_id) { setLoading(false); return; }

      const myTeamId = u.team_id;

      // 主催側でマッチ済
      const { data: hostMatches = [], error: hostErr } = await supabase
        .from("matches")
        .select("id, date, time, location, status, team_id")
        .eq("team_id", myTeamId)
        .eq("status", "マッチ済");
      if (hostErr) { setError(hostErr.message); setLoading(false); return; }

      // 承認側でマッチ済（applications を INNER JOIN）
      const { data: approvedRaw = [], error: appErr } = await supabase
        .from("matches")
        .select("id, date, time, location, status, team_id, applications!inner(team_id, status)")
        .eq("applications.team_id", myTeamId)
        .eq("applications.status", "承認")
        .eq("status", "マッチ済");
      if (appErr) { setError(appErr.message); setLoading(false); return; }

      const combined = uniqById([...hostMatches, ...approvedRaw]).sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.time.localeCompare(b.time);
      });

      setMatches(combined);
      setLoading(false);
    };

    fetchAll();
  }, []);

  const emptyState = useMemo(() => {
    if (loading || error) return null;
    if (!teamId) {
      return (
        <div className="rounded-2xl border p-6 bg-gray-50">
          <p className="mb-3">まだチームに所属していません。</p>
          <div className="flex gap-3">
            <Link href="/create_team" className="rounded-xl px-4 py-2 bg-blue-600 text-white">チーム作成</Link>
            <Link href="/join_team" className="rounded-xl px-4 py-2 bg-white border">チームに参加</Link>
          </div>
        </div>
      );
    }
    if (matches.length === 0) {
      return (
        <div className="rounded-2xl border p-6 bg-gray-50">
          <p className="mb-3">関係するマッチ済み試合はまだありません。</p>
          <div className="flex gap-3">
            <Link href="/create_match" className="rounded-xl px-4 py-2 bg-blue-600 text-white">試合作成</Link>
            <Link href="/matches" className="rounded-xl px-4 py-2 bg-white border">試合を探す</Link>
          </div>
        </div>
      );
    }
    return null;
  }, [loading, error, teamId, matches.length]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Match to Match ホーム</h1>
        <div className="text-sm text-gray-600 mt-2">
          <p><strong>ユーザー名：</strong>{username || "未設定"}</p>
          <p><strong>所属チーム：</strong>{teamName || "未所属"}</p>
        </div>
      </div>

      {loading && <p>読み込み中...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && matches.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">あなたが関係するマッチ済み試合</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {matches.map(m => (
              <Link
                key={m.id}
                href={`/chat/${m.id}`}
                className="rounded-2xl border p-4 shadow-sm hover:shadow transition block bg-white"
              >
                <div className="text-sm text-gray-500">{m.date} {m.time}</div>
                <div className="text-base font-medium mt-1">{m.location}</div>
                <div className="text-xs mt-2 inline-flex items-center gap-2 text-blue-700">
                  <span>💬 チャットへ</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {emptyState}
    </div>
  );
}
