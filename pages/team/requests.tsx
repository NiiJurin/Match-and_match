import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Req = {
  id: string;
  role: string;
  status: string;
  created_at: string;
  users: { name: string | null; id: string };
};

export default function TeamRequests() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Req[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setErr("ログインしてください");

      // 自分が owner のチームを取得（owner 制約は任意）
      const { data: team } = await supabase
        .from("teams")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!team?.id) return setErr("チーム管理者ではありません");
      setTeamId(team.id);

      const { data, error } = await supabase
        .from("team_join_requests")
        .select("id, role, status, created_at, users:users(id, name)")
        .eq("team_id", team.id)
        .order("created_at", { ascending: true });
      if (error) setErr(error.message);
      else setRequests(data || []);
    })();
  }, []);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_team_join", { p_request_id: id });
    if (error) return setErr(error.message);
    setRequests(rs => rs.map(r => r.id === id ? { ...r, status: "承認" } : r));
  };

  const reject = async (id: string) => {
    const { error } = await supabase.rpc("reject_team_join", { p_request_id: id });
    if (error) return setErr(error.message);
    setRequests(rs => rs.map(r => r.id === id ? { ...r, status: "却下" } : r));
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>参加申請（管理）</h2>
      {err && <p style={{ color: "red" }}>{err}</p>}
      {requests.map(r => (
        <div key={r.id} className="card" style={{ marginBottom: 12 }}>
          <div><b>申請者:</b> {r.users?.name ?? r.users?.id}</div>
          <div><b>ロール:</b> {r.role}</div>
          <div><b>状態:</b> {r.status}</div>
          {r.status === "申請中" && (
            <div style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={() => approve(r.id)}>承認</button>
              <button className="btn" onClick={() => reject(r.id)} style={{ marginLeft: 8 }}>却下</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
