import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

const DIFFICULTY_LABELS = { 1: "Easy", 2: "Medium", 3: "Hard" };
const DIFFICULTY_COLORS = {
  1: "bg-green-50 text-green-600 border-green-200",
  2: "bg-yellow-50 text-yellow-600 border-yellow-200",
  3: "bg-red-50 text-red-600 border-red-200",
};

const STATUS_ICONS = { 
  solved: "✅", 
  attempted: "🔄", 
  unsolved: "○" 
};

export function ProblemCard({ 
  problem, 
  onClick,
  className 
}) {
  const isSolved = problem.solvedStatus === "solved";

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all cursor-pointer",
        isSolved && "bg-green-50/30 border-green-200",
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="text-lg shrink-0" 
                title={problem.solvedStatus}
                aria-label={problem.solvedStatus}
              >
                {STATUS_ICONS[problem.solvedStatus] || STATUS_ICONS.unsolved}
              </span>
              <h3 className="font-semibold text-base flex-1">{problem.title}</h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-sm">
              {problem.topic && (
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                  {problem.topic}
                </Badge>
              )}

              {problem.difficulty != null && (
                <Badge 
                  variant="outline" 
                  className={cn("font-medium", DIFFICULTY_COLORS[problem.difficulty])}
                >
                  {DIFFICULTY_LABELS[problem.difficulty]}
                </Badge>
              )}

              {problem.acCount != null && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  {problem.acCount}
                </span>
              )}

              {problem.estimatedMinutes && (
                <span className="text-muted-foreground flex items-center gap-1">
                  ⏱ {problem.estimatedMinutes} min
                </span>
              )}
            </div>

            {problem.supportedLanguages && problem.supportedLanguages.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {problem.supportedLanguages.map(lang => (
                  <span 
                    key={lang} 
                    className="px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-700 rounded border border-slate-200"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            )}

            {problem.tags && problem.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {problem.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="px-2 py-0.5 text-xs bg-purple-50 text-purple-600 rounded border border-purple-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {problem.descriptionMd && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {problem.descriptionMd.replace(/[#*`]/g, '').substring(0, 150)}
                {problem.descriptionMd.length > 150 && '...'}
              </p>
            )}
          </div>

          <span className="text-muted-foreground text-xl shrink-0">→</span>
        </div>
      </CardContent>
    </Card>
  );
}
