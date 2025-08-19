// lib/to12h.ts
export function to12h(time24?: string | null): string {
    if (!time24) return "";
    const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time24.trim());
    if (!m) return time24; // fallback if it's not HH:mm
    let h = parseInt(m[1], 10);
    const mm = m[2];
    const am = h < 12;
    const h12 = (h % 12) || 12;
    return `${h12}:${mm} ${am ? "AM" : "PM"}`;
}
