'use client';

import { generateSlots, STATUS } from '@/lib/booking';
import { timeToMin, weekdayOf, WEEKDAYS_JA, parseDateKey } from '@/lib/date';

const ROW_H = 28; // 1 枠あたりの高さ(px)

export default function WeekCalendar({ days, today, data, onSelectSlot, onSelectReservation }) {
  const { settings, staff, reservations } = data;
  const slots = generateSlots(settings.open, settings.close, settings.step);
  const openMin = timeToMin(settings.open);
  const laneWidth = 100 / Math.max(staff.length, 1);

  return (
    <div className="calendar-wrap">
      <div className="legend">
        {staff.map((s) => (
          <span key={s.id}><i style={{ background: s.color }} />{s.name}</span>
        ))}
        <span className="muted">空き枠をクリックすると予約を登録できます</span>
      </div>

      <div className="calendar" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(140px, 1fr))` }}>
        {/* 見出し行 */}
        <div className="cal-corner" />
        {days.map((d) => {
          const wd = weekdayOf(d);
          const closed = settings.closedWeekdays.includes(wd);
          return (
            <div key={d} className={`cal-head${d === today ? ' is-today' : ''}${wd === 0 ? ' is-sun' : ''}${wd === 6 ? ' is-sat' : ''}`}>
              {parseDateKey(d).getDate()}日（{WEEKDAYS_JA[wd]}）
              {closed && <small>定休日</small>}
            </div>
          );
        })}

        {/* 時刻の列 */}
        <div className="cal-times">
          {slots.map((t) => (
            <div key={t} className="cal-time" style={{ height: ROW_H }}>{t.endsWith(':00') ? t : ''}</div>
          ))}
        </div>

        {/* 日ごとの列 */}
        {days.map((d) => {
          const closed = settings.closedWeekdays.includes(weekdayOf(d));
          const past = d < today;
          const dayRes = reservations.filter((r) => r.date === d && r.status !== 'cancelled');
          return (
            <div key={d} className={`cal-day${closed ? ' is-closed' : ''}${past ? ' is-past' : ''}`} style={{ height: slots.length * ROW_H }}>
              {!closed && !past && slots.map((t, i) => (
                <button
                  key={t}
                  className="cal-slot"
                  style={{ top: i * ROW_H, height: ROW_H }}
                  onClick={() => onSelectSlot(d, t)}
                  aria-label={`${d} ${t} に予約を追加`}
                />
              ))}
              {dayRes.map((r) => {
                const lane = Math.max(staff.findIndex((s) => s.id === r.staffId), 0);
                const color = staff[lane]?.color ?? '#5A6B62';
                const top = ((timeToMin(r.start) - openMin) / settings.step) * ROW_H;
                const height = ((timeToMin(r.end) - timeToMin(r.start)) / settings.step) * ROW_H;
                return (
                  <button
                    key={r.id}
                    className={`cal-event status-${r.status}`}
                    style={{ top, height: height - 2, left: `${lane * laneWidth}%`, width: `calc(${laneWidth}% - 3px)`, borderColor: color, background: `${color}1A` }}
                    onClick={() => onSelectReservation(r)}
                    title={`${r.start}〜${r.end} ${r.customerName}様 / ${r.menuName}`}
                  >
                    <b>{r.start} {r.customerName}様</b>
                    {height > ROW_H && (
                      <span>{r.menuName}{r.status !== 'booked' ? `（${STATUS[r.status]}）` : ''}</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
