// pages/create_match.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { supabase } from "../src/lib/supabase";
import LocationActions from "../components/LocationActions";

type TeamSlot = { role: string; required: number; filled: number };
type Sport = "soccer" | "baseball";

const MapPicker = dynamic(() => import("../components/MapPicker"), { ssr: false });

export default function CreateMatch() {
  const router = useRouter();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [level, setLevel] = useState("");
  const [sport, setSport] = useState<Sport>("soccer");
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  const [teamSlots, setTeamSlots] = useState<TeamSlot[]>([]);
  const [showTeamSlots, setShowTeamSlots] = useState(true);

  // ← 追加: 地図で使う座標
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErr("ログインしてください"); return; }

      const { data: u, error: uErr } = await supabase.from("users").select("team_id").eq("id", user.id).single();
      if (uErr) { setErr(uErr.message); return; }
      if (!u?.team_id) { setErr("チームに所属していません。先にチーム作成/参加してください。"); return; }
      setMyTeamId(u.team_id);

      const { data: t } = await supabase.from("teams").select("sport").eq("id", u.team_id).single();
      if (t?.sport) setSport(t.sport as Sport);

      const { data: slots, error: sErr } = await supabase
        .from("team_slots").select("role, required, filled").eq("team_id", u.team_id).order("role");
      if (sErr) { setErr(sErr.message); return; }
      setTeamSlots(slots || []);
      setShowTeamSlots((slots || []).some((s) => s.required - s.filled > 0));
    })();
  }, []);

  // 住所→座標（OSMのNominatimを簡易利用）
  async function geocodeAddress(q: string) {
    if (!q) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&accept-language=ja`
      );
      const j = await res.json();
      if (j && j[0]) setPos({ lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) });
    } catch {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!myTeamId) return setErr("チームに所属していません");
    if (!date || !time || !location) return setErr("日付・時間・場所は必須です");

    setLoading(true);
    const { error } = await supabase.from("matches").insert({
      team_id: myTeamId,
      date, time, location,
      location_lat: pos?.lat ?? null,      // ← 追加
      location_lng: pos?.lng ?? null,      // ← 追加
      level_preference: level || null,
      status: "募集中",
      show_team_slots: showTeamSlots,
      sport,
    });
    setLoading(false);

    if (error) return setErr(error.message);
    router.push("/matches");
  };

  const remain = (s: TeamSlot) => Math.max(0, (s.required | 0) - (s.filled | 0));

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>試合作成</h2>
        {err && <div className="card" style={{ background: "#fef2f2", borderColor: "#fecaca", marginBottom: 12 }}>{err}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row"><label>日付</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div className="form-row"><label>時間</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></div>

          <div className="form-row" style={{ gridColumn: "1 / -1" }}>
            <label>場所</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={() => geocodeAddress(location)}
              placeholder="〇〇運動公園 Aコート"
              required
            />
            <div style={{ marginTop: 8 }}>
              <MapPicker
                position={pos}
                onChange={(p) => setPos(p)}
                onAddressFromMap={(addr) => setLocation(addr)}
              />
            </div>

            {/* ← これを追加 */}
            <LocationActions locationText={location} pos={pos} />
          </div>

          <div className="form-row" style={{ gridColumn: "1 / -1" }}>
            <label>種目</label>
            <select value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
              <option value="soccer">サッカー</option>
              <option value="baseball">野球</option>
            </select>
          </div>

          <div className="form-row" style={{ gridColumn: "1 / -1" }}>
            <label>希望レベル（任意）</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">指定なし</option>
              <option>初級</option><option>中級</option><option>上級</option>
            </select>
          </div>

          <div className="form-row" style={{ gridColumn: "1 / -1" }}>
            <label>メンバー募集も同時に掲載（任意）</label>
            <div className="help">自チームの不足ロール（team_slots）の空きがあれば試合カードにも表示します。</div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
              <input type="checkbox" checked={showTeamSlots} onChange={(e) => setShowTeamSlots(e.target.checked)} />
              この試合にメンバー募集も載せる
            </label>
            {showTeamSlots && (
              <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {(teamSlots || []).map((s, i) => {
                  const r = remain(s);
                  const cls = r > 0 ? "orange" : "gray";
                  return <span key={i} className={`badge ${cls}`}>{s.role} {s.filled}/{s.required}</span>;
                })}
                {teamSlots.length === 0 && <div className="help">不足ロールは設定されていません（チーム作成/編集で設定できます）。</div>}
              </div>
            )}
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <button className="btn primary" type="submit" disabled={loading}>{loading ? "公開中…" : "公開する"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
