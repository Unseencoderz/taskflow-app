export type Role = "admin" | "member";
/** Project-scoped membership role (API + UI). */
export type ProjectMemberRole = "admin" | "editor" | "viewer" | "member";
export type ProjectVisibility = "private" | "team" | "public";
export type TaskStatus = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";
export type ProjectStatus = "active" | "completed" | "archived";

/** Payload for POST /api/projects (create + optional invites). */
export type CreateProjectInput = {
  name: string;
  description: string;
  status: ProjectStatus;
  dueDate: string | null;
  category: string | null;
  visibility: ProjectVisibility;
  invites: { email: string; role: ProjectMemberRole }[];
};

export interface User {
  id: string;
  name: string;
  email: string;
  /** App role from profile, or project membership role when loaded in project context. */
  role: Role | ProjectMemberRole;
  avatarColor: string;
  avatarUrl?: string | null;
  joinedAt: string;
  projectCount?: number;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  actorId: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  subtasks: Subtask[];
  comments: Comment[];
  activity: ActivityEntry[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  category?: string | null;
  visibility?: ProjectVisibility | null;
  dueDate: string | null;
  memberIds: string[];
  createdAt: string;
  taskCount?: number;
  memberCount?: number;
  projectRole?: ProjectMemberRole | null;
}

export interface DashboardStats {
  totalProjects: number;
  openTasks: number;
  completedThisWeek: number;
  overdueTasks: number;
}

export interface Notification {
  id: string;
  type: "task_assigned" | "task_overdue" | "project_updated" | "comment";
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
}
