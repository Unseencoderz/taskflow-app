import { useDraggable, useDroppable, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { format, isBefore } from "date-fns";
import { Calendar, Plus } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { PriorityBadge } from "@/components/Badges";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "Todo" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

function TaskCard({ task }: { task: Task }) {
  const users = useStore((s) => s.users);
  const assignee = users.find((u) => u.id === task.assigneeId);
  const overdue =
    task.status !== "done" && task.dueDate && isBefore(new Date(task.dueDate), new Date());
  const doneSubs = task.subtasks.filter((s) => s.done).length;
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: task.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={cn(
        "group cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <Link to="/tasks/$id" params={{ id: task.id }} onClick={(e) => e.stopPropagation()}>
        <h4 className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</h4>
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        {task.subtasks.length > 0 && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {doneSubs}/{task.subtasks.length}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        {task.dueDate ? (
          <span
            className={cn(
              "flex items-center gap-1 text-[11px] text-muted-foreground",
              overdue && "text-destructive",
            )}
          >
            <Calendar className="h-3 w-3" />
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        ) : (
          <span />
        )}
        {assignee && <Avatar name={assignee.name} color={assignee.avatarColor} size="xs" />}
      </div>
    </div>
  );
}

function Column({
  status,
  title,
  tasks,
  onAdd,
}: {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onAdd: (status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-card/40 p-3 transition-colors lg:w-auto lg:flex-1",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              status === "todo" && "bg-muted-foreground",
              status === "in_progress" && "bg-info",
              status === "done" && "bg-success",
            )}
          />
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto pr-1">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
      <button
        onClick={() => onAdd(status)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border p-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    </div>
  );
}

export function KanbanBoard({
  tasks,
  onAdd,
}: {
  tasks: Task[];
  onAdd: (status: TaskStatus) => void;
}) {
  const setStatus = useStore((s) => s.setTaskStatus);
  const { user } = useAuth();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || !user) return;
    const newStatus = over.id as TaskStatus;
    if (!COLUMNS.find((c) => c.id === newStatus)) return;
    setStatus(active.id as string, newStatus, user.id).catch((err) =>
      toast.error(err instanceof Error ? err.message : "Status update failed"),
    );
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            status={col.id}
            title={col.title}
            tasks={tasks.filter((t) => t.status === col.id)}
            onAdd={onAdd}
          />
        ))}
      </div>
    </DndContext>
  );
}
