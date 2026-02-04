import { useState, useEffect, useMemo } from “react”;
import Navigation from “@/components/Navigation”;
import Footer from “@/components/Footer”;
import { Card, CardContent } from “@/components/ui/card”;
import { Button } from “@/components/ui/button”;
import { Badge } from “@/components/ui/badge”;
import { ChevronLeft, ChevronRight, CalendarDays, Download, ExternalLink, Clock, X } from “lucide-react”;
import { supabase } from “@/integrations/supabase/client”;
import { toast } from “sonner”;
import {
startOfMonth,
endOfMonth,
startOfWeek,
endOfWeek,
addMonths,
subMonths,
isSameMonth,
isSameDay,
isToday,
addDays,
differenceInDays,
} from “date-fns”;

// —————————————————————————
// Types
// —————————————————————————
interface CalendarEvent {
id: number;
title: string;
description: string;
start_date: string;
end_date: string;
start_time: string | null;
end_time: string | null;
}

// —————————————————————————
// iCal helpers
// —————————————————————————

/**

- Escape special characters required by RFC 5545
  */
  const icsEscape = (str: string) =>
  str.replace(/\/g, “\\”).replace(/;/g, “\;”).replace(/,/g, “\,”).replace(/\n/g, “\n”);

/**

- Strip HTML tags – used for the DESCRIPTION field in .ics
  */
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, “”).trim();

/**

- Format a date as YYYYMMDD for iCal DATE value
  */
  const icsDate = (iso: string) => iso.replace(/-/g, “”);

/**

- Format a date+time as YYYYMMDDTHHmmSS for iCal DATE-TIME value (local)
  */
  const icsDateTime = (iso: string, time: string) => `${iso.replace(/-/g, "")}T${time.replace(/:/g, "")}00`;

/**

- Build a full .ics string for an array of events
  */
  const buildIcs = (events: CalendarEvent[]): string => {
  const lines: string[] = [
  “BEGIN:VCALENDAR”,
  “VERSION:2.0”,
  `PRODID:-//BDL Saint-André//Calendrier//FR`,
  “CALSCALE:GREGORIAN”,
  “METHOD:PUBLISH”,
  `X-WR-CALNAME:Calendrier BDL – Lycée Saint-André`,
  “X-WR-CALDIV:Europe/Paris”,
  ];

events.forEach((evt) => {
lines.push(“BEGIN:VEVENT”);
lines.push(`UID:bdl-cal-${evt.id}@bdl-saintandre.fr`);
lines.push(`SUMMARY:${icsEscape(evt.title)}`);
lines.push(`DESCRIPTION:${icsEscape(stripHtml(evt.description))}`);

```
// DATE or DATE-TIME
if (evt.start_time) {
  lines.push(`DTSTART:${icsDateTime(evt.start_date, evt.start_time)}`);
} else {
  // all-day: use VALUE=DATE and the day AFTER end_date (exclusive end)
  lines.push(`DTSTART;VALUE=DATE:${icsDate(evt.start_date)}`);
}

if (evt.end_time) {
  lines.push(`DTEND:${icsDateTime(evt.end_date, evt.end_time)}`);
} else {
  // all-day exclusive end: add 1 day
  const endExclusive = new Date(evt.end_date + "T00:00:00");
  endExclusive.setDate(endExclusive.getDate() + 1);
  const yy = endExclusive.getFullYear();
  const mm = String(endExclusive.getMonth() + 1).padStart(2, "0");
  const dd = String(endExclusive.getDate()).padStart(2, "0");
  lines.push(`DTEND;VALUE=DATE:${yy}${mm}${dd}`);
}

lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`);
lines.push("END:VEVENT");
```

});

lines.push(“END:VCALENDAR”);
return lines.join(”\r\n”);
};

/**

- Trigger browser download of a .ics file
  */
  const downloadIcs = (events: CalendarEvent[]) => {
  const blob = new Blob([buildIcs(events)], { type: “text/calendar;charset=utf-8” });
  const url = URL.createObjectURL(blob);
  const a = document.createElement(“a”);
  a.href = url;
  a.download = “calendrier-bdl.ics”;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  };

/**

- Open Google Calendar “add from iCal URL” – works if the site hosts the .ics publicly.
- Fallback: open Google Calendar import page so the user can upload the file manually.
  */
  const openGoogleCalendar = () => {
  // Google Calendar can subscribe to a public .ics URL via webcal://.
  // Since we don’t host the file publicly, we redirect to the Google Calendar
  // import page and the user downloads + uploads it themselves.
  // This is the most reliable cross-platform approach.
  window.open(“https://calendar.google.com/calendar/r/settings/addcalendar”, “_blank”, “noopener,noreferrer”);
  };

// —————————————————————————
// Day-names header (lundi … dimanche – French locale)
// —————————————————————————
const DAYS_FR = [“Lun”, “Mar”, “Mer”, “Jeu”, “Ven”, “Sam”, “Dim”];

// —————————————————————————
// Component
// —————————————————————————
export default function Calendrier() {
// –– data ––
const [events, setEvents] = useState<CalendarEvent[]>([]);
const [loading, setLoading] = useState(true);

// –– calendar state ––
const [currentMonth, setCurrentMonth] = useState(new Date());

// –– popover (selected day) ––
const [selectedDay, setSelectedDay] = useState<Date | null>(null);
const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

// ———————————————————————–
// Fetch
// ———————————————————————–
useEffect(() => {
fetchEvents();
}, []);

const fetchEvents = async () => {
setLoading(true);
const { data, error } = await supabase
.from(“calendar_events”)
.select(”*”)
.order(“start_date”, { ascending: true });

```
if (error) {
  toast.error("Erreur lors du chargement du calendrier");
} else {
  setEvents(data || []);
}
setLoading(false);
```

};

// ———————————————————————–
// Calendar grid days
// ———————————————————————–
const calendarDays = useMemo(() => {
const monthStart = startOfMonth(currentMonth);
const monthEnd = endOfMonth(currentMonth);

```
// French weeks start on Monday → weekStartsOn: 1
const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

// Manually build array since eachDayOfInterval is not in date-fns v3
const days: Date[] = [];
const totalDays = differenceInDays(gridEnd, gridStart) + 1;
for (let i = 0; i < totalDays; i++) {
  days.push(addDays(gridStart, i));
}
return days;
```

}, [currentMonth]);

// ———————————————————————–
// Events for a given day
// ———————————————————————–
const eventsForDay = (day: Date): CalendarEvent[] => {
// Extract YYYY-MM-DD in local timezone (not UTC)
const year = day.getFullYear();
const month = String(day.getMonth() + 1).padStart(2, “0”);
const dayOfMonth = String(day.getDate()).padStart(2, “0”);
const dayStr = `${year}-${month}-${dayOfMonth}`;

```
return events.filter((e) => e.start_date <= dayStr && e.end_date >= dayStr);
```

};

// ———————————————————————–
// Navigation
// ———————————————————————–
const prevMonth = () => {
setSelectedDay(null);
setCurrentMonth((m) => subMonths(m, 1));
};
const nextMonth = () => {
setSelectedDay(null);
setCurrentMonth((m) => addMonths(m, 1));
};

// ———————————————————————–
// Day click → show popover with events
// ———————————————————————–
const handleDayClick = (day: Date, e: React.MouseEvent<HTMLButtonElement>) => {
const dayEvents = eventsForDay(day);
if (dayEvents.length === 0) return; // nothing to show

```
// If clicking the same day again, close
if (selectedDay && isSameDay(selectedDay, day)) {
  setSelectedDay(null);
  return;
}

setSelectedDay(day);
```

};

// ———————————————————————–
// Render
// ———————————————————————–
const monthLabel = currentMonth.toLocaleDateString(“fr-FR”, { month: “long”, year: “numeric” });
// Capitalise first letter
const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];

return (
<div className="min-h-screen flex flex-col">
<Navigation />

```
  <main className="flex-1">
    {/* ---- Hero (same pattern as Events / Actualités) ---- */}
    <section className="py-16 gradient-institutional text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <CalendarDays className="h-16 w-16 mx-auto" />
          <h1 className="text-5xl font-bold">Calendrier BDL</h1>
          <p className="text-xl">
            Suivez tous les événements du Bureau des Lycéens
          </p>
        </div>
      </div>
    </section>

    {/* ---- Export bar ---- */}
    <div className="border-b border-border bg-muted/40">
      <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {events.length} événement{events.length !== 1 ? "s" : ""} au total
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => downloadIcs(events)}
            disabled={events.length === 0}
          >
            <Download className="h-4 w-4" /> Exporter iCal (.ics)
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={openGoogleCalendar}
            disabled={events.length === 0}
          >
            <ExternalLink className="h-4 w-4" /> Google Calendar
          </Button>
        </div>
      </div>
    </div>

    {/* ---- Calendar ---- */}
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Mois précédent">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-2xl font-bold capitalize">{monthTitle}</h2>
            <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Mois suivant">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-16">Chargement du calendrier…</p>
          ) : (
            <Card className="shadow-card overflow-hidden">
              {/* Day-of-week header */}
              <div className="grid grid-cols-7">
                {DAYS_FR.map((d) => (
                  <div
                    key={d}
                    className="border-b border-border bg-muted/60 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  const dayEvents = eventsForDay(day);
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const selected = selectedDay && isSameDay(selectedDay, day);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => handleDayClick(day, e)}
                      className={[
                        "relative border-b border-r border-border min-h-[80px] sm:min-h-[100px] p-1 text-left transition-colors",
                        inMonth ? "bg-background hover:bg-muted/30" : "bg-muted/10 text-muted-foreground",
                        selected ? "ring-2 ring-inset ring-primary" : "",
                        dayEvents.length > 0 ? "cursor-pointer" : "cursor-default",
                      ].join(" ")}
                    >
                      {/* day number */}
                      <span
                        className={[
                          "inline-flex items-center justify-center w-6 h-6 text-sm font-medium rounded-full",
                          today ? "bg-primary text-primary-foreground" : "",
                          !inMonth ? "text-muted-foreground" : "",
                        ].join(" ")}
                      >
                        {day.getDate()}
                      </span>

                      {/* event pills */}
                      <div className="mt-0.5 space-y-0.5 max-h-[40px] overflow-hidden">
                        {dayEvents.slice(0, 2).map((evt) => (
                          <div
                            key={evt.id}
                            className="text-[10px] sm:text-xs leading-tight truncate bg-primary/15 text-primary font-medium rounded px-1 py-0.5"
                          >
                            {evt.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayEvents.length - 2} de plus
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ---- Selected-day event popover (rendered below the grid) ---- */}
          {selectedDay && selectedDayEvents.length > 0 && (
            <Card className="mt-4 shadow-card border-primary/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">
                    {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase())}
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDay(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {selectedDayEvents.map((evt) => (
                    <div key={evt.id} className="border rounded-lg p-4 space-y-2 bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold">{evt.title}</h4>
                        {(evt.start_time || evt.end_time) && (
                          <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            {evt.start_time || "—"}
                            {evt.end_time && ` – ${evt.end_time}`}
                          </Badge>
                        )}
                      </div>

                      {/* date range (if multi-day) */}
                      {evt.start_date !== evt.end_date && (
                        <p className="text-xs text-muted-foreground">
                          Du{" "}
                          {new Date(evt.start_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
                          {" "}au{" "}
                          {new Date(evt.end_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                      )}

                      {/* description (HTML) */}
                      {evt.description && (
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: evt.description }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Upcoming events list (below calendar) ---- */}
          <div className="mt-10">
            <h3 className="text-xl font-bold mb-4">Événements à venir</h3>
            {events.length === 0 ? (
              <p className="text-muted-foreground">Aucun événement prévu.</p>
            ) : (
              <div className="space-y-3">
                {[...events]
                  .filter((e) => e.end_date >= new Date().toISOString().split("T")[0])
                  .sort((a, b) => a.start_date.localeCompare(b.start_date))
                  .map((evt) => (
                    <Card key={evt.id} className="shadow-card">
                      <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className="font-semibold">{evt.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(evt.start_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                            {evt.start_date !== evt.end_date &&
                              ` – ${new Date(evt.end_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`}
                            {evt.start_time && ` · ${evt.start_time}`}
                            {evt.end_time && ` – ${evt.end_time}`}
                          </p>
                        </div>
                        {/* single-event iCal download */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => downloadIcs([evt])}
                        >
                          <Download className="h-3.5 w-3.5" /> .ics
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  </main>

  <Footer />
</div>
```

);
}
