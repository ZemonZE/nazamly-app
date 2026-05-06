# Code Practice Platform — Usage Guide

End-to-end walkthrough: from an admin creating a problem to a student receiving AC or WA.

---

## Prerequisites

- Backend running on `http://localhost:5000`
- Admin panel running (Vite dev server in `nazamly-admin/`)
- Student frontend running (Vite dev server in `nazamly-front/`)
- A valid Firebase account with `admin` custom claim set (see `nazamly-backend/scripts/set-admin-claim.js`)
- `PISTON_BASE_URL` set in `nazamly-backend/.env` (defaults to `https://emkc.org/api/v2/piston`)

---

## Part 1 — Admin: Creating a Problem

### Step 1: Log in to the Admin Panel

Open the admin panel in your browser and log in with your admin Firebase account. You must have the `admin` custom claim — if not, run:

```bash
node nazamly-backend/scripts/set-admin-claim.js <firebase-uid>
```

### Step 2: Navigate to Coding Problems

Click **Coding Problems** in the sidebar. You'll see a table of existing problems (empty on first run).

### Step 3: Prepare your files

You need two files before clicking "Create Problem":

**Description file** (`description.md`) — a Markdown file with the problem statement.

Example:
```markdown
## Sum of Two Numbers

Given two integers `a` and `b` on separate lines, print their sum.

### Input
Two integers, one per line.

### Output
A single integer — the sum.

### Example
Input:
3
5

Output:
8
```

**Test cases file** (`testcases.txt`) — plain text, blocks separated by blank lines. Each block has input lines, then a line with only `---`, then expected output lines.

Format rules:
- Blocks are separated by **one or more blank lines**
- The separator inside a block is a line containing **only** `---`
- The **first two** test cases will be marked visible (shown to students as samples)
- All remaining test cases are hidden (used for judging only)

Example `testcases.txt`:
```
3
5
---
8

10
20
---
30

-1
1
---
0

100
200
---
300
```

In this example: blocks 1 and 2 are visible to students, blocks 3 and 4 are hidden.

### Step 4: Fill in the Create Problem form

Click **Create Problem** and fill in the fields:

| Field | Description | Example |
|-------|-------------|---------|
| Title | Problem name | `Sum of Two Numbers` |
| Topic | Category within the course | `Basic I/O` |
| Course | Select from dropdown | `CS101` |
| Estimated Minutes | Expected solve time | `15` |
| Difficulty | 1 = Easy, 2 = Medium, 3 = Hard | `1` |
| Supported Languages | Check one or more | `cpp`, `js` |
| Tags | Comma-separated keywords | `math, beginner` |
| Description File | Upload your `.md` file | `description.md` |
| Test Cases File | Upload your `.txt` file | `testcases.txt` |

Click **Create**. The backend will:
1. Parse the test cases file and validate every block has a `---` separator
2. Mark the first two test cases as `visible: true`
3. Store the problem in MongoDB

If the test cases file has a malformed block (missing `---`), you'll get a `400` error identifying the block index. Fix the file and retry.

### Step 5: Verify the problem was created

The problem appears in the table with its title, topic, difficulty, and acceptance count (starts at 0). You can:

- **Edit** — update any field (this resets all students' `solved` status to `attempted` for this problem)
- **Delete** — soft-deletes the problem and all its submissions (`isDeleted: true`)
- **View Submissions** — see all student submissions for this problem

---

## Part 2 — Student: Solving a Problem

### Step 1: Log in to the Student Portal

Open the student frontend and log in with a student Firebase account.

### Step 2: Navigate to Coding Practice

Click **Coding Practice** in the sidebar. Add `?courseId=<your-course-id>` to the URL if not redirected automatically from a course page.

Example URL:
```
http://localhost:5173/dashboard/coding?courseId=64abc123def456
```

You'll see all problems for that course grouped by topic. Each row shows:
- Status icon: `✅` solved, `🔄` attempted, `○` unsolved
- Problem title
- Difficulty (only if you've toggled it on)
- Acceptance count
- Supported languages

### Step 3: Sort the problem list (optional)

Use the sort buttons at the top:
- **Recently Updated** — default, newest changes first
- **Difficulty** — click again to toggle ascending/descending
- **Acceptance Count** — problems with most accepted solutions first/last

### Step 4: Open a problem

Click any problem row to open the split-screen solver page.

**Left panel** shows:
- Problem title, topic, difficulty (if enabled), estimated time
- Tags
- Full Markdown-rendered description
- Sample test cases (the two visible ones)

**Right panel** shows:
- Language selector
- Code editor
- Submit button
- Verdict area
- Submission history

### Step 5: Show/Hide Difficulty (optional)

Click **👁 Show Difficulty** to reveal the difficulty rating. This preference is saved per-problem. After you get AC, it automatically resets to hidden.

### Step 6: Write your solution

Select your language from the dropdown. The editor pre-fills with a starter template for the selected language.

Available languages and their runtimes:

| Language | Runtime | Notes |
|----------|---------|-------|
| `cpp` | g++ on Piston | Fully supported |
| `js` | Node.js on Piston | Fully supported |
| `emu8086` | DOSBox-based | Returns `LANGUAGE_UNAVAILABLE` if not on self-hosted Piston |
| `plsql` | Oracle-compatible | Returns `LANGUAGE_UNAVAILABLE` if not on self-hosted Piston |

Write your solution in the editor. For the example problem above in C++:

```cpp
#include <iostream>
using namespace std;
int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}
```

### Step 7: Submit

Click **▶ Submit**. The backend will:

1. Send your code to the Piston API for each test case (including hidden ones)
2. Compare `trim(stdout)` against `trim(expectedOutput)` for each test case
3. Return a verdict

**Rate limit:** 10 submissions per minute. If exceeded, you'll see a `429` message — wait a moment and retry.

### Step 8: Read the verdict

**Accepted (AC):**
```
✅ Accepted — All test cases passed!
```
Your progress is updated to `solved`. The `showDifficulty` preference resets to hidden.

**Wrong Answer (WA):**
```
❌ Wrong Answer

Input:
-1
1

Expected:
0

Your Output:
2
```
Only the **first failing test case** is shown. Hidden test case details beyond the first failure are not revealed. Your progress is updated to `attempted` (unless you already had AC — that is never downgraded).

**Language Unavailable (503):**
```
⚠️ Language 'emu8086' is temporarily unavailable. Please try again later or use a different language.
```
Switch to `cpp` or `js`, or configure a self-hosted Piston instance via `PISTON_BASE_URL`.

**Judge Unavailable (503):**
```
⚠️ Code execution service is temporarily unavailable. Please try again.
```
The Piston API is unreachable. Check your network or `PISTON_BASE_URL`.

### Step 9: View submission history

Click **▼ Show Submission History** to see your last 20 submissions for this problem, sorted newest first. Each row shows verdict, language, timestamp, and an expandable code view.

---

## Part 3 — Admin: Monitoring Submissions

In the admin panel, click **View Submissions** on any problem to see all student submissions:

- Student Firebase UID
- Language used
- Verdict badge (AC / WA)
- Submission timestamp
- Expandable code view

---

## Environment Variables Reference

File: `nazamly-backend/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `PISTON_BASE_URL` | `https://emkc.org/api/v2/piston` | Piston API base URL. Point to a self-hosted instance for emu8086/PL-SQL support |
| `MONGO_URI` | — | MongoDB connection string |
| `FIREBASE_PROJECT_ID` | — | Firebase project ID for JWT verification |

To use a self-hosted Piston instance:
```env
PISTON_BASE_URL=http://localhost:2000/api/v2/piston
```

---

## Common Issues

**Test case file rejected with `INVALID_TEST_CASE_FORMAT`**
The block at the reported index is missing a `---` separator line. Open the file, find that block, and add `---` between the input and expected output.

**Problem not appearing in student list**
Check that the `courseId` query param matches the `_id` of the course the problem was created under.

**Verdict always WA despite correct output**
Your program may be printing extra whitespace or a trailing newline. The judge trims both sides, but check for extra blank lines or spaces in the middle of the output.

**`emu8086` / `plsql` always unavailable**
The public Piston instance at `emkc.org` does not include these runtimes. You need a self-hosted Piston with those runtimes installed. Set `PISTON_BASE_URL` accordingly.

**Solved status not updating**
Ensure the student is authenticated (valid Firebase JWT). Check the browser console for `401` or `403` errors.
