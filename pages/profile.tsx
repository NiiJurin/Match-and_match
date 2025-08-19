// pages/profile.tsx
import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabase";

export default function Profile() {
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");

      const { data: u } = await supabase
        .from("users").select("name, team_id").eq("id", user.id).single();
      setUserName(u?.name || "");
      setTeamId(u?.team_id ?? null);

      if (u?.team_id) {
        const { data: t } = await supabase
          .from("teams").select("name, owner_id").eq("id", u.team_id).single();
        setTeamName(t?.name || "");
        setIsOwner(t?.owner_id === user.id);
      }
    })();
  }, []);

  const leaveTeam = async () => {
    setMsg(""); setErr("");
    if (!teamId) return;

    if (isOwner) {
      setErr("オーナーは退出できません。『チームを解散する』を実行してください。");
      return;
    }
    if (!confirm(`「${teamName}」を退出します。よろしいですか？`)) return;

    const { error } = await supabase.rpc("leave_team_and_release_slot");
    if (error) setErr(error.message);
    else {
      setMsg("チームを退出しました。");
      setTeamId(null); setTeamName(""); setIsOwner(false);
    }
  };

  const disbandTeam = async () => {
    setMsg(""); setErr("");
    if (!teamId) return;

    const ok = confirm(
      `【最終確認】\n「${teamName}」を解散します。\n\n` +
      `・主催試合／応募／チャットは削除されます\n` +
      `・メンバーは未所属に戻ります\n\n実行してよろしいですか？`
    );
    if (!ok) return;

    // RLS: "teams delete owner" が必要
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) {
      setErr(error.message + "（RLSポリシー 'teams delete owner' を確認してください）");
      return;
    }

    setMsg("チームを解散しました。");
    setTeamId(null); setTeamName(""); setIsOwner(false);
  };

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>プロフィール</h2>

        {err && <div className="card" style={{ background: "#fef2f2", borderColor: "#fecaca", marginBottom: 12, whiteSpace: "pre-line" }}>{err}</div>}
        {msg && <div className="card" style={{ background: "#ecfdf5", borderColor: "#bbf7d0", marginBottom: 12 }}>{msg}</div>}

        <p><strong>メール：</strong>{userEmail}</p>
        <p><strong>表示名：</strong>{userName || "未設定"}</p>
        <p><strong>所属チーム：</strong>{teamName || "未所属"}</p>

        {teamId ? (
          isOwner ? (
            <div style={{ marginTop: 12 }}>
              <button className="btn danger" onClick={disbandTeam}>チームを解散する</button>
              <div className="help" style={{ marginTop: 8 }}>
                ※解散すると主催試合・応募・チャットが削除され、メンバーは未所属に戻ります。
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={leaveTeam}>チームを退出する</button>
            </div>
          )
        ) : (
          <div style={{ marginTop: 12 }}>
            <a className="btn primary" href="/create_team">チームを作成</a>{' '}
            <a className="btn" href="/join_team">チームに参加</a>
          </div>
        )}
      </div>
    </div>
  );
}
