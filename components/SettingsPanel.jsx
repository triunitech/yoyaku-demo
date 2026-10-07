'use client';

import { useState } from 'react';
import { timeToMin, WEEKDAYS_JA } from '@/lib/date';

export default function SettingsPanel({ data, update, onReset }) {
  const [form, setForm] = useState(data.settings);
  const [message, setMessage] = useState('');

  const toggleDay = (wd) =>
    setForm((f) => ({
      ...f,
      closedWeekdays: f.closedWeekdays.includes(wd)
        ? f.closedWeekdays.filter((x) => x !== wd)
        : [...f.closedWeekdays, wd].sort(),
    }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.shopName.trim()) return setMessage('店舗名を入力してください。');
    if (!form.open || !form.close) return setMessage('開店時刻と閉店時刻を入力してください。');
    if (timeToMin(form.open) % form.step !== 0 || timeToMin(form.close) % form.step !== 0) {
      return setMessage(`時刻は ${form.step} 分単位（例：10:00、10:30）で入力してください。`);
    }
    if (timeToMin(form.open) >= timeToMin(form.close)) return setMessage('閉店時刻は開店時刻より後にしてください。');
    if (form.closedWeekdays.length === 7) return setMessage('すべての曜日を定休日にはできません。');
    update((d) => ({ ...d, settings: { ...form, shopName: form.shopName.trim() } }));
    setMessage('保存しました。既存の予約はそのまま残ります（営業時間外になった予約はカレンダーで確認してください）。');
  };

  return (
    <div className="two-col">
      <form className="card" onSubmit={submit} noValidate>
        <h3>店舗設定</h3>
        {message && <p className="hint" role="status">{message}</p>}
        <label>店舗名
          <input value={form.shopName} onChange={(e) => setForm((f) => ({ ...f, shopName: e.target.value }))} />
        </label>
        <div className="grid2">
          <label>開店時刻
            <input type="time" step={1800} value={form.open} onChange={(e) => setForm((f) => ({ ...f, open: e.target.value }))} />
          </label>
          <label>閉店時刻
            <input type="time" step={1800} value={form.close} onChange={(e) => setForm((f) => ({ ...f, close: e.target.value }))} />
          </label>
        </div>
        <fieldset>
          <legend>定休日</legend>
          {WEEKDAYS_JA.map((w, i) => (
            <label key={w} className="check">
              <input type="checkbox" checked={form.closedWeekdays.includes(i)} onChange={() => toggleDay(i)} />
              {w}
            </label>
          ))}
        </fieldset>
        <div className="modal-actions">
          <span className="spacer" />
          <button type="submit" className="primary">保存</button>
        </div>
      </form>

      <div className="card">
        <h3>このデモについて</h3>
        <ul className="about">
          <li>Next.js（React）で作成した、小規模店舗向け予約管理のデモです。</li>
          <li>データはお使いのブラウザ（localStorage）にのみ保存され、外部には送信されません。</li>
          <li>本番導入時は、保存処理（<code>lib/store.js</code>）を API に置き換え、データベース・ログイン機能・予約確認メール等を追加する想定です。</li>
          <li>予約の重複・定休日・営業時間のチェックは単体テスト済みです（<code>npm test</code>）。</li>
        </ul>
        <button className="danger" onClick={onReset}>データを初期状態に戻す</button>
      </div>
    </div>
  );
}
