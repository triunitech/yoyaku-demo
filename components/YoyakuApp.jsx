'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadData, saveData, resetData, newId } from '@/lib/store';
import { toDateKey, weekDays, addDays, formatJa, formatYen } from '@/lib/date';
import { summarize } from '@/lib/booking';
import WeekCalendar from './WeekCalendar';
import ReservationModal from './ReservationModal';
import ReservationList from './ReservationList';
import MenuManager from './MenuManager';
import SettingsPanel from './SettingsPanel';

const TABS = [
  { id: 'calendar', label: '週間カレンダー' },
  { id: 'list', label: '予約一覧' },
  { id: 'menu', label: 'メニュー' },
  { id: 'settings', label: '店舗設定' },
];

export default function YoyakuApp() {
  const [data, setData] = useState(null); // null = 読み込み中（SSR とのずれを防ぐ）
  const [tab, setTab] = useState('calendar');
  const [today, setToday] = useState('');
  const [weekKey, setWeekKey] = useState('');
  const [editing, setEditing] = useState(null); // モーダルで編集中の予約
  const [resetKey, setResetKey] = useState(0); // 初期化時に設定フォームを作り直すため

  useEffect(() => {
    const t = toDateKey(new Date());
    setToday(t);
    setWeekKey(t);
    setData(loadData());
  }, []);

  // データ更新は必ずこの関数経由で行い、同時に保存する
  const update = (fn) =>
    setData((prev) => {
      const next = fn(prev);
      saveData(next);
      return next;
    });

  const days = useMemo(() => (weekKey ? weekDays(weekKey) : []), [weekKey]);
  const stats = useMemo(
    () => (data ? summarize(data.reservations, today, days) : null),
    [data, today, days]
  );

  if (!data) return <div className="loading">読み込み中…</div>;

  const openNew = (date, start) =>
    setEditing({
      id: null, date, start, menuId: data.menus[0]?.id ?? '', staffId: data.staff[0]?.id ?? '',
      customerName: '', phone: '', memo: '', status: 'booked',
    });

  const saveReservation = (r) => {
    update((d) => {
      const exists = d.reservations.some((x) => x.id === r.id);
      const reservations = exists
        ? d.reservations.map((x) => (x.id === r.id ? r : x))
        : [...d.reservations, { ...r, id: newId() }];
      return { ...d, reservations };
    });
    setEditing(null);
  };

  const deleteReservation = (id) => {
    update((d) => ({ ...d, reservations: d.reservations.filter((x) => x.id !== id) }));
    setEditing(null);
  };

  return (
    <div className="app">
      <div className="demo-banner" role="note">
        これは TRIUNITECH が自社で制作したデモです（受託案件ではありません）。データはすべて架空で、お使いのブラウザ内にのみ保存されます。
      </div>

      <header className="app-header">
        <div>
          <h1>{data.settings.shopName}　予約管理</h1>
          <p className="sub">本日：{formatJa(today)}</p>
        </div>
        <div className="stats">
          <div className="stat"><span>本日の予約</span><strong>{stats.todayCount}件</strong></div>
          <div className="stat"><span>表示週の予約</span><strong>{stats.weekCount}件</strong></div>
          <div className="stat"><span>表示週の売上見込み</span><strong>{formatYen(stats.weekSales)}</strong></div>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="panel">
        {tab === 'calendar' && (
          <>
            <div className="toolbar">
              <button onClick={() => setWeekKey(addDays(weekKey, -7))}>← 前の週</button>
              <button onClick={() => setWeekKey(today)}>今週</button>
              <button onClick={() => setWeekKey(addDays(weekKey, 7))}>次の週 →</button>
              <span className="range">{formatJa(days[0])} 〜 {formatJa(days[6])}</span>
              <button className="primary" onClick={() => openNew(today, data.settings.open)}>＋ 新規予約</button>
            </div>
            <WeekCalendar
              days={days}
              today={today}
              data={data}
              onSelectSlot={openNew}
              onSelectReservation={setEditing}
            />
          </>
        )}
        {tab === 'list' && (
          <ReservationList data={data} today={today} onSelect={setEditing} />
        )}
        {tab === 'menu' && (
          <MenuManager data={data} today={today} update={update} />
        )}
        {tab === 'settings' && (
          <SettingsPanel
            key={resetKey}
            data={data}
            update={update}
            onReset={() => {
              if (window.confirm('すべてのデータを初期状態に戻します。よろしいですか？')) {
                setData(resetData());
                setResetKey((k) => k + 1);
              }
            }}
          />
        )}
      </main>

      {editing && (
        <ReservationModal
          initial={editing}
          data={data}
          today={today}
          onSave={saveReservation}
          onDelete={deleteReservation}
          onClose={() => setEditing(null)}
        />
      )}

      <footer className="app-footer">
        © 2026 TRIUNITECH — <a href="https://www.triunitech.com/ja/" target="_blank" rel="noopener">www.triunitech.com</a>
      </footer>
    </div>
  );
}
