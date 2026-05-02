import type {
  ActivityEntry,
  Comment,
  CreateProjectInput,
  Priority,
  Project,
  ProjectMemberRole,
  ProjectStatus,
  ProjectVisibility,
  Notification,
  Role,
  Subtask,
  Task,
  TaskStatus,
  User,
} from "./types";

const palette = [
  "oklch(0.7 0.2 290)",
  "oklch(0.7 0.18 155)",
  "oklch(0.78 0.16 75)",
  "oklch(0.7 0.16 230)",
  "oklch(0.65 0.23 22)",
  "oklch(0.72 0.17 35)",
];

function colorFromId(id: string) {
  const total = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[total % palette.length];
}

function activityText(action: string, meta?: Record<string, unknown> | null) {
  if (action === "created") return "created this task";
  if (action === "status_changed") return `changed status to ${String(meta?.to ?? "updated")}`;
  if (action === "assignee_changed") return "reassigned this task";
  return action.replace(/_/g, " ");
}

export function adaptUser(raw: any): User {
  return {
    id: raw.id,
    name: raw.full_name || raw.name || raw.email || "Unknown",
    email: raw.email || "",
    role: (raw.project_role || raw.role || "member") as Role | ProjectMemberRole,
    avatarUrl: raw.avatar_url ?? null,
    avatarColor: colorFromId(raw.id || raw.email || "user"),
    joinedAt: raw.created_at || raw.joined_at || new Date().toISOString(),
    projectCount: raw.project_count ?? raw.projectCount,
  };
}

export function adaptProject(raw: any): Project {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || "",
    status: (raw.status || "active") as ProjectStatus,
    category: raw.category ?? null,
    visibility: (raw.visibility || "team") as ProjectVisibility,
    dueDate: raw.due_date ?? null,
    memberIds: raw.member_ids || raw.memberIds || [],
    createdAt: raw.created_at || new Date().toISOString(),
    taskCount: raw.task_count ?? raw.taskCount,
    memberCount: raw.member_count ?? raw.memberCount,
    projectRole: (raw.project_role ?? raw.projectRole ?? null) as ProjectMemberRole | null,
  };
}

export function adaptSubtask(raw: any): Subtask {
  return {
    id: raw.id,
    title: raw.title,
    done: Boolean(raw.done),
  };
}

export function adaptComment(raw: any): Comment {
  return {
    id: raw.id,
    authorId: raw.author_id,
    text: raw.body || "",
    createdAt: raw.created_at || new Date().toISOString(),
  };
}

export function adaptActivity(raw: any): ActivityEntry {
  return {
    id: raw.id,
    actorId: raw.actor_id,
    text: raw.text || activityText(raw.action, raw.meta),
    createdAt: raw.created_at || new Date().toISOString(),
  };
}

export function adaptTask(raw: any): Task {
  return {
    id: raw.id,
    projectId: raw.project_id,
    title: raw.title,
    description: raw.description || "",
    status: (raw.status || "todo") as TaskStatus,
    priority: (raw.priority || "medium") as Priority,
    assigneeId: raw.assignee_id ?? null,
    dueDate: raw.due_date ?? null,
    createdAt: raw.created_at || new Date().toISOString(),
    subtasks: (raw.subtasks || []).map(adaptSubtask),
    comments: (raw.comments || []).map(adaptComment),
    activity: (raw.activity || []).map(adaptActivity),
  };
}

export function adaptNotification(raw: any): Notification {
  return {
    id: raw.id,
    type: raw.type,
    message: raw.message,
    createdAt: raw.created_at || new Date().toISOString(),
    read: Boolean(raw.read),
    link: raw.link || undefined,
  };
}

export function projectToApi(project: Partial<Project>) {
  return {
    ...(project.name !== undefined ? { name: project.name } : {}),
    ...(project.description !== undefined ? { description: project.description } : {}),
    ...(project.status !== undefined ? { status: project.status } : {}),
    ...(project.dueDate !== undefined ? { due_date: project.dueDate } : {}),
    ...(project.category !== undefined ? { category: project.category } : {}),
    ...(project.visibility !== undefined ? { visibility: project.visibility } : {}),
  };
}

export function projectCreateToApi(input: CreateProjectInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    due_date: input.dueDate || null,
    category: input.category?.trim() || null,
    visibility: input.visibility,
    invites: (input.invites || [])
      .filter((row) => row.email.trim().length > 0)
      .map((row) => ({
        email: row.email.toLowerCase().trim(),
        role: row.role,
      })),
  };
}

export function taskToApi(task: Partial<Task>) {
  return {
    ...(task.projectId !== undefined ? { project_id: task.projectId } : {}),
    ...(task.title !== undefined ? { title: task.title } : {}),
    ...(task.description !== undefined ? { description: task.description } : {}),
    ...(task.status !== undefined ? { status: task.status } : {}),
    ...(task.priority !== undefined ? { priority: task.priority } : {}),
    ...(task.assigneeId !== undefined ? { assignee_id: task.assigneeId } : {}),
    ...(task.dueDate !== undefined ? { due_date: task.dueDate } : {}),
  };
}
