import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../src/lib/supabase";

type Slot = { role: string; required: number };

const ROLE_SUGGESTIONS = ["自由枠", "GK", "DF", "MF", "FW"];

const SOCCER_TEMPLATE: Slot[] = [
  { role: "自由枠", required: 3 },
  { role: "GK", required: 1 },
  { role: "DF", required: 2 },
  { role: "MF", required: 2 },
  { role: "FW", required: 2 },
];

export default function CreateTeam() {
  const router = useRouter();

  // 基本情報
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [level, setLevel] = useState("");

  // 募集ロール
  const [slots, setSlots] = useState<Slot[]>([
    { role: "自由枠", required: 0 },
    { role: "GK", required: 0 },
    { role: "DF", required: 0 },
    { role: "MF", required: 0 },
    { role: "FW", required: 0 },
  ]);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  // ---- UI helpers ----
  const normalize = (role: string) => role.trim();

  // 同名ロールは1行に集約（requiredを合算）
  const dedupe = (rows: Slot[]) => {
    const map = new Map<string, number>();
    for (const s of rows) {
      const key = normalize(s.role);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + Math.max(0, s.required | 0));
    }
    return Array.from(map.entries()).map(([role, required]) => ({ role, required }));
  };

  const addEmptyRow = () => setSlots((s) => [...s, { role: "", required: 1 }]);

  const removeRow = (i: number) => setSlots((s) => s.filter((_, idx) => idx !== i));

  const updateRow = (i: number, patch: Partial<Slot>) =>
    setSlots((s) => s.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const bump = (i: number, delta: number) =>
    setSlots((s) =>
      s.map((row, idx) =>
        idx === i ? { ...row, required: Math.max(0, (row.required | 0) + delta) } : row
      )
    );

  // 候補チップ：存在すれば +1、なければ追加
  const quickAdd = (role: string) =>
    setSlots((s) => {
      const idx = s.findIndex((r) => normalize(r.role) === role);
      if (idx >= 0) {
        const clone = [...s];
        clone[idx] = { ...clone[idx], required: (clone[idx].required | 0) + 1 };
        return clone;
      }
      return [...s, { role, required: 1 }];
    });

  const applyTemplate = (tpl: Slot[]) => setSlots(dedupe(tpl));

  const canSubmit = name.trim().length > 0 && !loading;

  // ---- submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setOk("");

    if (!name.trim()) {
      setErr("チーム名は必須です");
      return;
    }

    const rows = dedupe(slots).filter((s) => normalize(s.role) !== "");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); setErr("ログインしてください"); return; }

    // チーム作成
    const { data: team, error: tErr } = await supabase
      .from("teams")
      .insert({ name: name.trim(), area: area.trim(), level, owner_id: user.id })
      .select("id")
      .single();

    if (tErr || !team) {
      setLoading(false);
      setErr(tErr?.message || "チーム作成に失敗しました");
      return;
    }

    // 自分を所属に
    await supabase.from("users").update({ team_id: team.id }).eq("id", user.id);

    // 募集ロール保存（0は除外）
    const toInsert = rows.filter((r) => r.required > 0)
      .map((r) => ({ team_id: team.id, role: r.role, required: r.required }));

    if (toInsert.length) {
      const { error: sErr } = await supabase.from("team_slots").insert(toInsert);
      if (sErr) { setLoading(false); setErr("募集ロールの保存に失敗: " + sErr.message); return; }
    }

    setOk("チームを作成しました");
    setLoading(false);
    router.push("/profile");
  };

  // ---- UI ----
  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>チーム作成</h2>

        {err && (
          <div className="card" style={{ background: "#fef2f2", borderColor: "#fecaca", marginBottom: 12 }}>
            {err}
          </div>
        )}
        {ok && (
          <div className="card" style={{ background: "#ecfdf5", borderColor: "#bbf7d0", marginBottom: 12 }}>
            {ok}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-grid">
          {/* 基本情報 */}
          <div className="form-row">
            <label>チーム名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例）FC Matchers"
              required
            />
            <div className="help">検索結果に表示される名前です。後から変更できます。</div>
          </div>

          <div className="form-row">
            <label>活動エリア</label>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="例）東京 23区 / 神奈川 など"
            />
            <div className="help">だいたいの活動場所（任意）</div>
          </div>

          <div className="form-row" style={{ gridColumn: "1 / -1" }}>
            <label>レベル</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">指定なし</option>
              <option value="初級">初級</option>
              <option value="中級">中級</option>
              <option value="上級">上級</option>
            </select>
          </div>

          {/* 募集ロール */}
          <div className="form-row" style={{ gridColumn: "1 / -1" }}>
            <label>募集ロール（不足ポジション）</label>
            <div className="help">
              例: 自由枠 / GK1 / DF2 など。行を追加して必要数を設定。重複ロールは自動でまとめます。
            </div>

            {/* クイック追加チップ */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0" }}>
              {ROLE_SUGGESTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="btn"
                  onClick={() => quickAdd(r)}
                  title={`${r} を1人分追加`}
                >
                  ＋ {r}
                </button>
              ))}
              <button type="button" className="btn ghost" onClick={() => applyTemplate(SOCCER_TEMPLATE)}>
                ⚡ テンプレートを挿入
              </button>
            </div>

            {/* 行リスト */}
            <div style={{ display: "grid", gap: 8 }}>
              {slots.map((s, i) => (
                <div
                  key={i}
                  className="card"
                  style={{
                    padding: 10,
                    display: "grid",
                    gridTemplateColumns: "1fr 140px 110px",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    placeholder="自由枠 / GK / DF / MF / FW など"
                    value={s.role}
                    onChange={(e) => updateRow(i, { role: e.target.value })}
                  />

                  {/* ステッパー付き数量 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => bump(i, -1)}
                      aria-label="人数を1減らす"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={s.required}
                      onChange={(e) =>
                        updateRow(i, { required: Math.max(0, Number(e.target.value || 0)) })
                      }
                      style={{ width: 70, textAlign: "right" }}
                      aria-label="募集人数"
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => bump(i, +1)}
                      aria-label="人数を1増やす"
                    >
                      ＋
                    </button>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <button type="button" className="btn" onClick={() => removeRow(i)}>
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn ghost" onClick={addEmptyRow}>
                ＋ 行を追加
              </button>
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, marginTop: 6 }}>
            <button className="btn primary" type="submit" disabled={!canSubmit}>
              {loading ? "作成中…" : "作成する"}
            </button>
            <span className="help">※ チーム名は必須です。募集ロールは必要に応じて設定してください。</span>
          </div>
        </form>
      </div>
    </div>
  );
}
