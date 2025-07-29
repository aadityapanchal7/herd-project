// lib/derive-school.ts
export function deriveSchoolKey(university?: string): string | undefined {
    if (!university) return undefined;
    const u = university.toLowerCase();
    if (u.includes("texas") && u.includes("austin")) return "ut_austin";
    // …add other campuses here…
    return undefined;
  }
  