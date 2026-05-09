import { useState, useEffect, useCallback } from "react";
import {
  getMyCoursesMaterials,
  getSubFolderFiles,
} from "../services/materialsService";
import {
  BookOpen, FileText, Video, Image, Presentation,
  ChevronLeft, ExternalLink, FolderOpen, Loader2,
} from "lucide-react";

/* ── Sub-folder icons ── */
const SUB_FOLDER_ICONS = {
  lectures: <FileText className="h-4 w-4" />,
  sections: <BookOpen className="h-4 w-4" />,
  videos: <Video className="h-4 w-4" />,
  finals: <FileText className="h-4 w-4" />,
  mids: <FileText className="h-4 w-4" />,
  assignments: <FileText className="h-4 w-4" />,
  other: <FolderOpen className="h-4 w-4" />,
};

const SUB_FOLDER_LABELS = {
  lectures: "Lectures",
  sections: "Sections",
  videos: "Videos",
  finals: "Finals",
  mids: "Midterms",
  assignments: "Assignments",
};

function fileIcon(mimeType) {
  if (!mimeType) return "📄";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("video")) return "🎬";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📊";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📗";
  if (mimeType.includes("folder")) return "📁";
  return "📄";
}

function formatSize(bytes) {
  if (!bytes) return "";
  const n = parseInt(bytes, 10);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function Materials() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeSubFolder, setActiveSubFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyCoursesMaterials();
        setCourses(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadFiles = useCallback(
    async (subFolderType) => {
      if (!selectedCourse) return;
      setFilesLoading(true);
      setFiles([]);
      try {
        const data = await getSubFolderFiles(selectedCourse.courseCode, subFolderType);
        setFiles(data.files || []);
      } catch {
        setFiles([]);
      } finally {
        setFilesLoading(false);
      }
    },
    [selectedCourse],
  );

  const openCourse = (course) => {
    setSelectedCourse(course);
    const firstSub = course.subFolders?.[0] || null;
    setActiveSubFolder(firstSub);
  };

  useEffect(() => {
    if (activeSubFolder) {
      loadFiles(activeSubFolder.type);
    }
  }, [activeSubFolder, loadFiles]);

  const handleBack = () => {
    setSelectedCourse(null);
    setActiveSubFolder(null);
    setFiles([]);
  };

  /* Loading */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-teal" />
        <p className="text-sm text-muted-foreground">Loading materials...</p>
      </div>
    );
  }

  /* Error */
  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  /* Course Detail */
  if (selectedCourse) {
    return (
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary transition"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <div>
              <h2 className="font-display text-2xl font-semibold">{selectedCourse.courseName}</h2>
              <span className="inline-block mt-0.5 rounded-full bg-brand-mint px-2.5 py-0.5 text-xs font-semibold text-foreground">
                {selectedCourse.courseCode}
              </span>
            </div>
          </div>
          {selectedCourse.driveWebViewLink && (
            <a
              href={selectedCourse.driveWebViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:underline"
            >
              Open in Drive <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Sub-folder tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(selectedCourse.subFolders || []).map((sf) => (
            <button
              key={sf.type}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                activeSubFolder?.type === sf.type
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border hover:bg-secondary"
              }`}
              onClick={() => setActiveSubFolder(sf)}
            >
              {SUB_FOLDER_ICONS[sf.type] || <FolderOpen className="h-4 w-4" />}
              {SUB_FOLDER_LABELS[sf.type] || sf.label}
            </button>
          ))}
        </div>

        {/* Files */}
        <div className="space-y-2">
          {filesLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
            </div>
          )}

          {!filesLoading && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="font-medium">No files yet in this section</p>
              <p className="text-sm text-muted-foreground mt-1">Files will be uploaded by administration soon</p>
            </div>
          )}

          {files.map((file) => (
            <a
              key={file.id}
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 hover:border-brand-teal/40 hover:shadow-sm transition"
            >
              <span className="text-2xl">{fileIcon(file.mimeType)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                  {file.createdTime && ` • ${new Date(file.createdTime).toLocaleDateString("en-US")}`}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  /* Courses Grid */
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-semibold mb-6">Materials Center</h1>

      {courses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="font-medium text-lg">No materials currently available</p>
          <p className="text-sm text-muted-foreground mt-1">No courses added yet by the administration</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div
            key={course.courseCode}
            className="group cursor-pointer rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition hover:shadow-md hover:border-brand-teal/40"
            onClick={() => openCourse(course)}
            role="button"
            tabIndex={0}
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-mint">
              <BookOpen className="h-5 w-5 text-foreground/70" />
            </div>
            <h3 className="mt-4 font-semibold">{course.courseName}</h3>
            <p className="text-sm text-muted-foreground">{course.courseCode}</p>
            {course.creditHours && (
              <p className="text-xs text-muted-foreground mt-1">{course.creditHours} hours</p>
            )}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="rounded-full bg-brand-mint/60 px-2.5 py-0.5 text-xs font-medium">
                {(course.subFolders || []).length} sections
              </span>
              <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition">→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Materials;
