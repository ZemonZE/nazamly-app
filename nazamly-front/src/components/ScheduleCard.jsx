import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { IconTrash } from "../Icons/DashboardIcons";
import { cn } from "@/lib/utils";

const TYPE_LABELS = { 
  ن: "Lecture", 
  ت: "Section", 
  ع: "Lab" 
};

const TYPE_COLORS = {
  ن: "bg-blue-50 text-blue-600 border-blue-200",
  ت: "bg-sky-50 text-sky-600 border-sky-200",
  ع: "bg-amber-50 text-amber-600 border-amber-200",
};

export function ScheduleCard({ 
  schedule, 
  onDelete,
  className 
}) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base">{schedule.subject}</h3>
              <Badge 
                variant="outline" 
                className={cn("text-xs font-bold", TYPE_COLORS[schedule.type])}
              >
                {schedule.type}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">
                  {schedule.slot.start} - {schedule.slot.end}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Day:</span>
                <span className="font-medium">{schedule.day}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Group:</span>
                <span className="font-medium">{schedule.group || "—"}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Place:</span>
                <span className="font-medium">{schedule.place || "—"}</span>
              </div>
            </div>
          </div>

          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(schedule.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            >
              <IconTrash width={16} height={16} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
