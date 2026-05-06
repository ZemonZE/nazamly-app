// ─── Shared Types & Helpers for GPA Planner ──────────────────────────────────

export interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
}

export type DataSource = 'manual' | 'upload' | 'history';
export type UploadState = 'idle' | 'uploading' | 'processing' | 'review' | 'error';

export function classifyGpa(v: number | string) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n) || n < 0) return { label: '', color: 'transparent' };
  if (n === 0) return { label: 'F', color: '#ef4444' };
  if (n < 1.0) return { label: 'Pass', color: '#ef4444' };
  if (n < 1.5) return { label: 'C+', color: '#f97316' };
  if (n < 2.5) return { label: 'B', color: '#eab308' };
  if (n < 3.5) return { label: 'B+', color: '#f59e0b' };
  if (n < 4.0) return { label: 'A', color: '#38bdf8' };
  if (n < 4.5) return { label: 'A+', color: '#3b82f6' };
  if (n <= 5.0) return { label: 'A+ (Honors)', color: '#22c55e' };
  return { label: '', color: 'transparent' };
}

export function gradeLabel(val: number) {
  const opts = [
    { value: 4.0, label: 'A+' }, { value: 3.5, label: 'A' },
    { value: 3.0, label: 'B+' }, { value: 2.5, label: 'B' },
    { value: 2.0, label: 'C+' }, { value: 1.5, label: 'C' },
  ];
  return opts.find(o => o.value === val)?.label ?? classifyGpa(val).label;
}

export function computeStrategy(courses: Course[], grades: Record<string, number>, oldCgpa: number, oldHours: number, target: number) {
  const termHours = courses.reduce((s, c) => s + c.credits, 0);
  const totalHours = oldHours + termHours;
  const neededPoints = target * totalHours - oldCgpa * oldHours;
  const maxPoints = courses.reduce((s, c) => s + 5.0 * c.credits, 0);
  const maxCgpa = (oldCgpa * oldHours + maxPoints) / totalHours;

  if (target > 5.0 || neededPoints > maxPoints)
    return { possible: false, maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2) };
  if (neededPoints <= 0)
    return { possible: true, requiredTermGpa: '0.00', maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2), plan: courses.map(c => ({ ...c, requiredGrade: 1.5 })), note: 'Target already met.' };

  let remaining = [...courses];
  let remainingPoints = neededPoints;
  const planGrades: Record<string, number> = {};

  while (remaining.length > 0) {
    const ppc = remainingPoints / remaining.length;
    const overflow = remaining.filter(c => ppc / c.credits > 5.0);
    if (overflow.length === 0) {
      remaining.forEach(c => { planGrades[c.id] = parseFloat((ppc / c.credits).toFixed(2)); });
      break;
    }
    overflow.forEach(c => { planGrades[c.id] = 4.9; remainingPoints -= 4.9 * c.credits; });
    remaining = remaining.filter(c => planGrades[c.id] === undefined);
    if (remaining.length === 0 && remainingPoints > 0.001)
      return { possible: false, maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2) };
  }

  return {
    possible: true,
    requiredTermGpa: (termHours ? neededPoints / termHours : 0).toFixed(2),
    maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2),
    plan: courses.map(c => ({ ...c, requiredGrade: planGrades[c.id] ?? 0 })),
  };
}

export function extractedToCourses(extracted: any[]): { courses: Course[]; grades: Record<string, number> } {
  const courses: Course[] = extracted.map((c, i) => ({
    id: `ext_${i}`,
    name: c.courseName || c.courseCode,
    code: c.courseCode,
    credits: c.creditHours || 3,
  }));
  const grades: Record<string, number> = {};
  extracted.forEach((c, i) => { grades[`ext_${i}`] = c.gradePoints ?? 0; });
  return { courses, grades };
}
