import { useState } from "react";
import { IconTrash } from "../Icons/DashboardIcons";
import { calculateTermGPA } from "../services/gpaService";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

/* mark → grade‑point (same formula the backend uses) */
const markToGP = (m) => (m < 60 ? 0 : Number((m / 10 - 5).toFixed(1)));

function GpaCalculator() {
  const [courses, setCourses] = useState([]);
  const [courseCode, setCourseCode] = useState("");
  const [mark, setMark] = useState(80);
  const [credits, setCredits] = useState(3);
  const [isRetake, setIsRetake] = useState(false);

  /* Result from the server */
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addCourse = () => {
    if (!courseCode.trim()) return;
    const m = Math.min(100, Math.max(0, parseInt(mark)));
    setCourses((prev) => [
      ...prev,
      {
        id: Date.now(),
        courseCode: courseCode.trim(),
        mark: m,
        creditHours: parseInt(credits),
        isRetake,
      },
    ]);
    setCourseCode("");
    setMark(80);
    setCredits(3);
    setIsRetake(false);
    setResult(null); // clear stale result
  };

  const removeCourse = (id) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setResult(null);
  };

  /* ── Call the server ── */
  const handleCalculate = async () => {
    if (!courses.length) return;
    setLoading(true);
    setError("");
    try {
      const data = await calculateTermGPA(
        courses.map(({ courseCode, creditHours, mark, isRetake }) => ({
          courseCode,
          creditHours,
          mark,
          isRetake,
        })),
      );
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Local quick stats ── */
  const totalCredits = courses.reduce((s, c) => s + c.creditHours, 0);
  const avgMark = courses.length
    ? (courses.reduce((s, c) => s + c.mark, 0) / courses.length).toFixed(1)
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ── GPA Result Card ── */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">
            {result ? "Semester GPA" : "Current GPA"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-6xl font-bold text-primary mb-6">
              {result ? result.termGPA : "—"}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Expected CGPA</p>
                <p className="text-2xl font-semibold">{result ? result.newCGPA : "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-semibold">
                  {result ? result.termHoursCalculated : totalCredits}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Courses Count</p>
                <p className="text-2xl font-semibold">{courses.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Average Grade</p>
                <p className="text-2xl font-semibold">{avgMark}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Bottom Grid ── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Add Course */}
        <Card>
          <CardHeader>
            <CardTitle>Add Course</CardTitle>
            <CardDescription>Enter course details to calculate your GPA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courseCode">Course Code</Label>
              <Input
                id="courseCode"
                type="text"
                placeholder="Example: CS 301"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCourse()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mark">Grade (0 — 100)</Label>
              <Input
                id="mark"
                type="number"
                min={0}
                max={100}
                step={1}
                value={mark}
                onChange={(e) => setMark(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credits">Credit Hours</Label>
              <Input
                id="credits"
                type="number"
                min={1}
                max={6}
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRetake"
                checked={isRetake}
                onChange={(e) => setIsRetake(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isRetake" className="cursor-pointer">
                Retake Course
              </Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={addCourse} className="w-full">
              + Add Course
            </Button>
          </CardFooter>
        </Card>

        {/* Courses List */}
        <Card>
          <CardHeader>
            <CardTitle>Added Courses</CardTitle>
            <CardDescription>
              {courses.length
                ? `${courses.length} course(s) added`
                : "No courses added yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {courses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <span className="text-4xl mb-2 block">📚</span>
                  <p>Add courses to calculate your GPA</p>
                </div>
              )}
              {courses.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold">{c.courseCode}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.creditHours} hours • grade {c.mark}/100 → {markToGP(c.mark)} GPA
                      {c.isRetake ? " (Retake)" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-primary">
                      {(markToGP(c.mark) * c.creditHours).toFixed(1)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCourse(c.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <IconTrash width={16} height={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          {courses.length > 0 && (
            <CardFooter>
              <Button
                onClick={handleCalculate}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Calculating..." : "Calculate GPA"}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

export default GpaCalculator;
