// components/RecruitCard.tsx
import React from "react";
type Sport = "soccer" | "baseball";
import LocationActions from "./LocationActions";
export type TeamSlot = { role: string; required: number; filled: number };
export type FeedMatch = {
  id: string;
  date: string;
  time: string;
  location: string;
  location_lat?: number | null;
  location_lng?: number | null;

  level_preference: string | null;
  status: string;
  team_id: string;
  show_team_slots: boolean;
  sport: Sport;
  teams: { name: string; team_slots: TeamSlot[] };
};


type Props = {
  data: FeedMatch;
  myTeamId?: string | null;
  onApply: (matchId: string, hostTeamId: string) => void;
  onJoin: (hostTeamId: string, role: string) => void;
};

const remain = (s: TeamSlot) => Math.max(0, (s.required | 0) - (s.filled | 0));
const sum = (a: number, b: number) => a + b;

const ICONS = {
  soccer: { GK: "🧤", DF: "🛡️", MF: "⚙️", FW: "🎯", 自由枠: "⚽" } as Record<string, string>,
  baseball: { P: "⚾", C: "🧢", "1B": "①", "2B": "②", SS: "SS", "3B": "③", OF: "外", DH: "DH", 自由枠: "🧤" } as Record<string, string>,
};


function roleIcon(sport: "soccer" | "baseball" | undefined, role: string) {
  const dict = ICONS[sport || "soccer"];
  return dict[role] ?? "🟦";
}

export default function RecruitCard({ data, myTeamId, onApply, onJoin }: Props) {
  const slots = data.teams?.team_slots || [];
  const totalReq = slots.map((s) => s.required | 0).reduce(sum, 0);
  const totalFilled = slots.map((s) => s.filled | 0).reduce(sum, 0);
  const initial = (data.teams?.name || "?").slice(0, 1).toUpperCase();

  return (
    <article className="card recruit">
      {/* ヘッダー：左にチーム、右に日程/場所（大きめ） */}
      <header className="recruit-head">
        <div className="recruit-team">
          <div className="avatar">{initial}</div>
          <div>
            <div className="recruit-title">{data.teams?.name}</div>
            <div className="recruit-badges">
              <span className="badge gray">{data.sport === "baseball" ? "野球" : "サッカー"}</span>
              <span className={`badge ${data.level_preference ? "blue" : "gray"}`}>
                {data.level_preference || "指定なし"}
              </span>
              {totalReq > 0 && <span className="badge green">参加 {totalFilled}/{totalReq}</span>}
            </div>
          </div>
        </div>

        <div className="recruit-when">
          <div className="dt">
            <span className="date">{data.date}</span>
            <span className="time">{data.time}</span>
          </div>
          <div className="loc">{data.location}</div>
        </div>
      </header>

         <LocationActions
        locationText={data.location}
        pos={
          data.location_lat != null && data.location_lng != null
            ? { lat: Number(data.location_lat), lng: Number(data.location_lng) }
            : null
        }
      />
      {/* 要参加ロール：コンパクト表示 */}
      {data.show_team_slots && (
        <div className="role-grid">
          {slots.map((s, idx) => {
            const r = remain(s);
            const tone = r > 0 ? "open" : "full";
            return (
              <div key={idx} className={`role-card ${tone}`}>
                <div className="role-top">
                  <span className="role-ic">{roleIcon(data.sport, s.role)}</span>
                  <span className="role-name">{s.role}</span>
                </div>
                <div className="role-meta">
                  <span>残り {r}</span>
                  <span className="muted">
                    {s.filled}/{s.required}
                  </span>
                </div>
                <button
                  className="btn xs"
                  disabled={r <= 0}
                  onClick={() => onJoin(data.team_id, s.role)}
                  title={r > 0 ? `${s.role} で参加` : "満員"}
                >
                  参加
                </button>
              </div>
            );
          })}
          {slots.length === 0 && <div className="empty">ロール募集は未設定です（チーム側で設定できます）</div>}
        </div>
      )}

      {/* アクション */}
      <footer className="recruit-actions">
        <button className="btn primary" onClick={() => onApply(data.id, data.team_id)}>
          対戦申請
        </button>
        {!myTeamId && <span className="help">※チーム未所属でも上の「参加」から空きロールに入れます</span>}
      </footer>
    </article>
  );
}
