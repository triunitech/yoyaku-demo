'use client';

import { useMemo, useState } from 'react';
import { toCSV, STATUS } from '@/lib/booking';
import { formatJa, formatYen } from '@/lib/date';

export default function ReservationList({ data, today, onSelect }) {
  const [range, setRange] = useState('upcoming'); // upcoming | past | all
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const staffName = (id) => data.staff.find((s) => s.id === id)?.name ?? '—';

  const rows = useMemo(() => {
    const keyword = q.trim();
    return data.reservations
      .filter((r) => (range === 'upcoming' ? r.date >= today : range === 'past' ? r.date < today : true))
      .filter((r) => (status ? r.status === status : true))
      .filter((r) => (keyword ? `${r.customerName}${r.phone}${r.menuName}${r.memo}`.includes(keyword) : true))
      .sort((a, b) => {
        const k = (a.date + a.start).localeCompare(b.date + b.start);
        return range === 'past' ? -k : k;
      });
  }, [data.reservations, range, status, q, today]);

  const downloadCSV = () => {
    // 先頭に BOM を付け、Excel で開いても文字化けしないようにする
    const blob = new Blob(['﻿' + toCSV(rows, data.staff)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `予約一覧_${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="toolbar">
        <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="期間">
          <option value="upcoming">本日以降</option>
          <option value="past">過去</option>
          <option value="all">すべて</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="状態">
          <option value="">状態：すべて</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="お客様名・電話番号・メニューで検索" />
        <span className="spacer" />
        <button onClick={downloadCSV} disabled={rows.length === 0}>CSV出力（{rows.length}件）</button>
      </div>

      {rows.length === 0 ? (
        <p className="empty">該当する予約はありません。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>日付</th><th>時間</th><th>お客様名</th><th>電話番号</th><th>メニュー</th><th>担当</th><th className="num">料金</th><th>状態</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => onSelect(r)} className={`row status-${r.status}`}>
                  <td>{formatJa(r.date)}</td>
                  <td>{r.start}〜{r.end}</td>
                  <td>{r.customerName}様</td>
                  <td>{r.phone}</td>
                  <td>{r.menuName}</td>
                  <td>{staffName(r.staffId)}</td>
                  <td className="num">{formatYen(r.price)}</td>
                  <td><span className={`badge ${r.status}`}>{STATUS[r.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
