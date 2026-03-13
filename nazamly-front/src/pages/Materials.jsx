import { useState, useEffect, useCallback } from "react";
import "../styles/Materials.css";
import {
  getMyCoursesMaterials,
  getSubFolderFiles,
} from "../services/materialsService";
import { IconBook } from "../Icons/DashboardIcons";

/* ── Sub-folder icons (emoji-based) ── */
const SUB_FOLDER_ICONS = {
  lectures: "📚",
  sections: "📝",
  videos: "🎥",
  finals: "📋",
  mids: "📄",
  assignments: "📎",
  other: "📁",
};

/* ── File type icon based on mimeType ── */
function fileIcon(mimeType) {
  if (!mimeType) return "📄";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("video")) return "🎬";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "📊";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "📗";
  if (mimeType.includes("folder")) return "📁";
  return "📄";
}

/* ── Format file size ── */
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

  /* Course detail view state */
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeSubFolder, setActiveSubFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);

  /* Load courses */
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

  /* Load files when switching sub-folder */
  const loadFiles = useCallback(
    async (subFolderType) => {
      if (!selectedCourse) return;
      setFilesLoading(true);
      setFiles([]);
      try {
        const data = await getSubFolderFiles(
          selectedCourse.courseCode,
          subFolderType,
        );
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

  /* ═══════════════════════════════
     LOADING / ERROR / EMPTY
  ═══════════════════════════════ */
  if (loading) {
    return (
      <div className="dash-home mat-center">
        <div className="mat-spinner" />
        <p className="mat-loading-text">Loading materials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-home mat-center">
        <p className="mat-error">{error}</p>
      </div>
    );
  }

  /* ═══════════════════════════════
     COURSE DETAIL VIEW
  ═══════════════════════════════ */
  if (selectedCourse) {
    return (
      <div className="dash-home">
        {/* Header */}
        <div className="mat-detail-header">
          <button className="mat-back-btn" onClick={handleBack}>
            ← Back
          </button>
          <div className="mat-detail-title-wrap">
            <h2 className="page-title">{selectedCourse.courseName}</h2>
            <span className="mat-course-code-badge">
              {selectedCourse.courseCode}
            </span>
          </div>
          {selectedCourse.driveWebViewLink && (
            <a
              href={selectedCourse.driveWebViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mat-drive-link"
            >
              Open in Drive ↗
            </a>
          )}
        </div>

        {/* Sub-folder tabs */}
        <div className="mat-subfolder-tabs">
          {(selectedCourse.subFolders || []).map((sf) => (
            <button
              key={sf.type}
              className={`mat-subfolder-tab ${activeSubFolder?.type === sf.type ? "active" : ""}`}
              onClick={() => setActiveSubFolder(sf)}
            >
              <span className="mat-tab-icon">
                {SUB_FOLDER_ICONS[sf.type] || "📁"}
              </span>
              <span>{sf.label}</span>
            </button>
          ))}
        </div>

        {/* Files list */}
        <div className="mat-files-grid">
          {filesLoading && (
            <div className="mat-center" style={{ gridColumn: "1 / -1" }}>
              <div className="mat-spinner" />
            </div>
          )}

          {!filesLoading && files.length === 0 && (
            <div className="mat-empty" style={{ gridColumn: "1 / -1" }}>
              <span className="mat-empty-icon">📂</span>
              <p>No files yet in this section</p>
              <p className="mat-empty-sub">
                Files will be uploaded by administration soon
              </p>
            </div>
          )}

          {files.map((file) => (
            <a
              key={file.id}
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mat-file-card"
            >
              <span className="mat-file-icon">{fileIcon(file.mimeType)}</span>
              <div className="mat-file-info">
                <span className="mat-file-name">{file.name}</span>
                <span className="mat-file-meta">
                  {formatSize(file.size)}
                  {file.createdTime &&
                    ` • ${new Date(file.createdTime).toLocaleDateString("en-US")}`}
                </span>
              </div>
              <span className="mat-file-open">↗</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════
     COURSES GRID VIEW
  ═══════════════════════════════ */
  return (
    <div className="dash-home">
      {courses.length === 0 && (
        <div className="mat-empty-wrap">
          <div className="mat-empty">
            <span className="mat-empty-icon">📚</span>
            <p>No materials currently available</p>
            <p className="mat-empty-sub">
              No courses added yet by the administration
            </p>
          </div>
        </div>
      )}

      <div className="mat-courses-grid">
        {courses.map((course) => (
          <div
            key={course.courseCode}
            className="mat-course-card"
            onClick={() => openCourse(course)}
            role="button"
            tabIndex={0}
          >
            <div className="mat-course-card-icon">
              <IconBook />
            </div>
            <div className="mat-course-card-body">
              <h3 className="mat-course-card-name">{course.courseName}</h3>
              <span className="mat-course-card-code">{course.courseCode}</span>
              {course.creditHours && (
                <span className="mat-course-card-hours">
                  {course.creditHours} hours
                </span>
              )}
            </div>
            <div className="mat-course-card-footer">
              <span className="mat-course-card-status ready">
                {(course.subFolders || []).length} sections
              </span>
              <span className="mat-course-card-arrow">→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Materials;
