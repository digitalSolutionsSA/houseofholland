import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isStudioOpen } from '../data/booking';
import './BookingCalendar.css';

interface BookingCalendarProps {
  selected: Date | null;
  onSelect: (date: Date) => void;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function BookingCalendar({ selected, onSelect }: BookingCalendarProps) {
  const today = startOfDay(new Date());
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Don't allow paging earlier than the current month.
  const atCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const isSameDay = (a: Date | null, b: Date | null) =>
    !!a && !!b && a.getTime() === b.getTime();

  return (
    <div className="calendar">
      <div className="calendar__header">
        <button
          type="button"
          className="calendar__nav"
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          disabled={atCurrentMonth}
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="calendar__title">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          className="calendar__nav"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="calendar__weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="calendar__grid">
        {cells.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} className="calendar__cell calendar__cell--empty" />;
          const past = date < today;
          const open = isStudioOpen(date);
          const disabled = past || !open;
          return (
            <button
              key={date.toISOString()}
              type="button"
              className={[
                'calendar__cell',
                disabled ? 'calendar__cell--disabled' : 'calendar__cell--open',
                isSameDay(date, selected) ? 'calendar__cell--selected' : '',
                isSameDay(date, today) ? 'calendar__cell--today' : '',
              ].join(' ')}
              disabled={disabled}
              onClick={() => onSelect(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <p className="calendar__legend">
        <span className="calendar__legend-dot" /> Studio open — Tue–Sat
      </p>
    </div>
  );
}
