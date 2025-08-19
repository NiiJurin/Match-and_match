import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabase";

type Team = {
  id: string; name: string; area: string | null; level: string | null;
  team_slots: { role: string; required: number; filled: number }[];
};

export default function JoinTeam() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [choice, setChoice] = useState<Record<string,string>>({}); // teamId -> role
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: u } = await supabase.from("users").select("team_id").eq("id", user.id).single();
      setMyTeamId(u?.team_id ?? null);

      const { data } = await supabase
        .from("teams")
        .select("id,name,area,level, team_slots(role,required,filled)")
        .order("name");
      setTeams(data || []);
    })();
  }, []);

  const join = async (teamId: string) => {
    setMsg(""); setErr("");
    if (myTeamId) return setErr("すでにチームに所属しています");
    const role = choice[teamId];
    if (!role) return setErr("参加するロールを選択してください");

    const { error } = await supabase.rpc("claim_team_slot", { p_team_id: teamId, p_role: role });
    if (error) {
      if (error.message.includes("slot full")) setErr("そのロールは満員です");
      else if (error.message.includes("already in a team")) setErr("すでに別チームに所属しています");
      else setErr(error.message);
      return;
    }
    setMsg("チームに参加しました！");
    setMyTeamId(teamId);
  };

  return (
    <div className="container">
      <h2 style={{marginTop:0}}>チームに参加</h2>
      {err && <div className="card" style={{background:'#fef2f2', borderColor:'#fecaca', marginBottom:12}}>{err}</div>}
      {msg && <div className="card" style={{background:'#ecfdf5', borderColor:'#bbf7d0', marginBottom:12}}>{msg}</div>}

      <div className="list-cards">
        {teams.map(t => {
          const open = t.team_slots?.filter(s => s.required - s.filled > 0) || [];
          return (
            <div key={t.id} className="card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:600}}>{t.name}</div>
                  <div className="help">{t.area || 'エリア不明'}・{t.level || 'レベル指定なし'}</div>
                </div>
              </div>

              {/* ロール状況 */}
              <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
                {(t.team_slots || []).map((s,i)=> {
                  const remain = s.required - s.filled;
                  const cls = remain > 0 ? "orange" : "gray";
                  return <span key={i} className={`badge ${cls}`}>{s.role} {s.filled}/{s.required}</span>;
                })}
              </div>

              {/* 参加操作 */}
              <div style={{display:'flex', gap:8, marginTop:10}}>
                <select
                  value={choice[t.id] || ""}
                  onChange={e=>setChoice(c=>({ ...c, [t.id]: e.target.value }))}
                >
                  <option value="">参加するロールを選択</option>
                  {open.map((s,i)=>(
                    <option key={i} value={s.role}>
                      {s.role}（残り {s.required - s.filled}）
                    </option>
                  ))}
                </select>
                <button className="btn primary" onClick={()=>join(t.id)} disabled={!!myTeamId || open.length===0}>
                  参加する
                </button>
              </div>
              {myTeamId === t.id && <div className="help" style={{marginTop:6}}>※参加済み</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
