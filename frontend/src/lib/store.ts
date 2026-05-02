import { create } from "zustand";
import { apiRequest, jsonBody } from "./api";
import {
  adaptProject,
  adaptNotification,
  adaptTask,
  adaptUser,
  projectCreateToApi,
  projectToApi,
  taskToApi,
} from "./adapters";
import type {
  CreateProjectInput,
  DashboardStats,
  User,
  Project,
  Task,
  Notification,
  Subtask,
  Role,
  ProjectMemberRole,
  TaskStatus,
  ProjectStatus,
} from "./types";

interface AppState {
  users: User[];
  projects: Project[];
  tasks: Task[];
  notifications: Notification[];
  dashboardStats: DashboardStats | null;
  loading: boolean;
  error: string | null;

  setCurrentUser: (user: User | null) => void;
  loadWorkspace: () => Promise<void>;
  loadDashboardStats: () => Promise<void>;
  loadProjects: () => Promise<Project[]>;
  loadProjectDetail: (projectId: string) => Promise<void>;
  loadTasks: () => Promise<Task[]>;
  loadTaskDetail: (taskId: string) => Promise<Task | null>;
  loadNotifications: () => Promise<void>;

  updateUser: (userId: string, patch: Partial<User>) => Promise<User | null>;

  addProject: (input: CreateProjectInput) => Promise<{
    project: Project;
    invitesSummary?: { added_members: number; pending_invites: number };
  }>;
  updateProject: (projectId: string, patch: Partial<Project>) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  addProjectMember: (projectId: string, userId: string) => Promise<void>;
  inviteProjectMember: (projectId: string, email: string) => Promise<{ message: string; inviteLink?: string }>;
  updateProjectMemberRole: (projectId: string, userId: string, role: ProjectMemberRole) => Promise<void>;
  removeProjectMember: (projectId: string, userId: string) => Promise<void>;

  addTask: (t: Omit<Task, "id" | "createdAt" | "subtasks" | "comments" | "activity"> & {
    subtasks?: Subtask[];
  }, actorId?: string) => Promise<Task>;
  updateTask: (taskId: string, patch: Partial<Task>, actorId?: string) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  setTaskStatus: (taskId: string, status: TaskStatus, actorId?: string) => Promise<void>;

  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  removeSubtask: (taskId: string, subtaskId: string) => Promise<void>;

  addComment: (taskId: string, authorId: string, text: string) => Promise<void>;

  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
}

function mergeById<T extends { id: string }>(items: T[], incoming: T[]) {
  const map = new Map(items.map((item) => [item.id, item]));
  for (const item of incoming) {
    map.set(item.id, { ...map.get(item.id), ...item });
  }
  return Array.from(map.values());
}

function replaceTask(tasks: Task[], task: Task) {
  return tasks.some((item) => item.id === task.id)
    ? tasks.map((item) => (item.id === task.id ? task : item))
    : [task, ...tasks];
}

export const useStore = create<AppState>((set, get) => ({
  users: [],
  projects: [],
  tasks: [],
  notifications: [],
  dashboardStats: null,
  loading: false,
  error: null,

  setCurrentUser: (user) => {
    if (!user) return;
    set((state) => ({ users: mergeById(state.users, [user]) }));
  },

  loadWorkspace: async () => {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().loadProjects(),
        get().loadTasks(),
        get().loadDashboardStats(),
      ]);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load workspace" });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  loadDashboardStats: async () => {
    const stats = await apiRequest<DashboardStats>("/api/dashboard/stats");
    set({ dashboardStats: stats });
  },

  loadProjects: async () => {
    const data = await apiRequest<{ projects: unknown[] }>("/api/projects");
    const projects = data.projects.map(adaptProject);
    set({ projects });
    return projects;
  },

  loadProjectDetail: async (projectId) => {
    const [projectData, membersData, tasksData] = await Promise.all([
      apiRequest<{ project: unknown }>(`/api/projects/${projectId}`),
      apiRequest<{ members: any[] }>(`/api/projects/${projectId}/members`),
      apiRequest<{ tasks: unknown[] }>(`/api/projects/${projectId}/tasks`),
    ]);

    const members = membersData.members.map((member) => adaptUser({
      ...member.profile,
      project_role: member.role,
      joined_at: member.joined_at,
    }));
    const memberIds = members.map((member) => member.id);
    const project = adaptProject({ ...(projectData.project as object), member_ids: memberIds });
    const tasks = tasksData.tasks.map(adaptTask);

    set((state) => ({
      users: mergeById(state.users, members),
      projects: mergeById(state.projects, [project]),
      tasks: [
        ...state.tasks.filter((task) => task.projectId !== projectId),
        ...tasks,
      ],
    }));
  },

  loadTasks: async () => {
    const data = await apiRequest<{ groups: { project: { id: string; name: string }; tasks: unknown[] }[] }>(
      "/api/tasks?assignee=me",
    );
    const tasks = data.groups.flatMap((group) => group.tasks.map(adaptTask));
    set((state) => ({
      tasks: mergeById(state.tasks.filter((task) => !tasks.some((incoming) => incoming.id === task.id)), tasks),
      projects: mergeById(
        state.projects,
        data.groups.map((group) =>
          adaptProject({
            id: group.project.id,
            name: group.project.name,
            description: "",
            status: "active",
            member_ids: [],
          }),
        ),
      ),
    }));
    return tasks;
  },

  loadTaskDetail: async (taskId) => {
    const data = await apiRequest<{
      task: any;
      subtasks: unknown[];
      comments: any[];
      activity: any[];
    }>(`/api/tasks/${taskId}`);

    const task = adaptTask({
      ...data.task,
      subtasks: data.subtasks,
      comments: data.comments,
      activity: data.activity,
    });
    const users = [
      data.task.assignee,
      ...data.comments.map((comment) => comment.author),
      ...data.activity.map((entry) => entry.actor),
    ]
      .filter(Boolean)
      .map(adaptUser);
    const existingProject = get().projects.find((item) => item.id === data.task.project?.id);
    const project = data.task.project
      ? adaptProject({
          ...existingProject,
          ...data.task.project,
          description: existingProject?.description || "",
          status: existingProject?.status || "active",
          member_ids: existingProject?.memberIds || [],
          project_role: existingProject?.projectRole || null,
        })
      : null;

    set((state) => ({
      users: mergeById(state.users, users),
      projects: project ? mergeById(state.projects, [project]) : state.projects,
      tasks: replaceTask(state.tasks, task),
    }));

    return task;
  },

  loadNotifications: async () => {
    const data = await apiRequest<{ notifications: unknown[] }>("/api/notifications");
    set({ notifications: data.notifications.map(adaptNotification) });
  },

  updateUser: async (userId, patch) => {
    const data = await apiRequest<{ profile: unknown }>("/api/profile", {
      method: "PATCH",
      body: jsonBody({
        ...(patch.name !== undefined ? { full_name: patch.name } : {}),
        ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl } : {}),
      }),
    });
    const existing = get().users.find((user) => user.id === userId);
    const user = adaptUser({ ...existing, ...data.profile, email: existing?.email });
    set((state) => ({ users: mergeById(state.users, [user]) }));
    return user;
  },

  addProject: async (projectInput) => {
    const data = await apiRequest<{
      project: unknown;
      invites_summary?: { added_members: number; pending_invites: number };
    }>("/api/projects", {
      method: "POST",
      body: jsonBody(projectCreateToApi(projectInput)),
    });
    let project = adaptProject(data.project);

    await get().loadProjectDetail(project.id);
    project = get().projects.find((item) => item.id === project.id) || project;
    return {
      project,
      invitesSummary: data.invites_summary,
    };
  },

  updateProject: async (projectId, patch) => {
    const data = await apiRequest<{ project: unknown }>(`/api/projects/${projectId}`, {
      method: "PATCH",
      body: jsonBody(projectToApi(patch)),
    });
    const current = get().projects.find((project) => project.id === projectId);
    const project = adaptProject({ ...current, ...data.project, member_ids: current?.memberIds });
    set((state) => ({ projects: mergeById(state.projects, [project]) }));
    return project;
  },

  deleteProject: async (projectId) => {
    await apiRequest<void>(`/api/projects/${projectId}`, { method: "DELETE" });
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== projectId),
      tasks: state.tasks.filter((task) => task.projectId !== projectId),
    }));
  },

  addProjectMember: async (projectId, userId) => {
    const user = get().users.find((item) => item.id === userId);
    if (!user?.email) throw new Error("User email is required to add a member");
    await apiRequest(`/api/projects/${projectId}/members`, {
      method: "POST",
      body: jsonBody({ email: user.email, role: user.role === "admin" ? "admin" : "member" }),
    });
    await get().loadProjectDetail(projectId);
  },

  inviteProjectMember: async (projectId, email) => {
    const data = await apiRequest<{ message: string; inviteLink?: string }>(`/api/projects/${projectId}/invite`, {
      method: "POST",
      body: jsonBody({ email }),
    });
    await get().loadProjectDetail(projectId);
    return data;
  },

  updateProjectMemberRole: async (projectId, userId, role) => {
    await apiRequest(`/api/projects/${projectId}/members/${userId}/role`, {
      method: "PATCH",
      body: jsonBody({ role }),
    });
    await get().loadProjectDetail(projectId);
  },

  removeProjectMember: async (projectId, userId) => {
    await apiRequest<void>(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" });
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? { ...project, memberIds: project.memberIds.filter((id) => id !== userId) }
          : project,
      ),
    }));
  },

  addTask: async (taskInput) => {
    const data = await apiRequest<{ task: unknown }>("/api/tasks", {
      method: "POST",
      body: jsonBody(taskToApi(taskInput)),
    });
    let task = adaptTask(data.task);

    for (const subtask of taskInput.subtasks || []) {
      await apiRequest(`/api/tasks/${task.id}/subtasks`, {
        method: "POST",
        body: jsonBody({ title: subtask.title }),
      });
    }

    task = (await get().loadTaskDetail(task.id)) || task;
    return task;
  },

  updateTask: async (taskId, patch) => {
    const data = await apiRequest<{ task: unknown }>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: jsonBody(taskToApi(patch)),
    });
    const current = get().tasks.find((task) => task.id === taskId);
    const task = adaptTask({
      ...current,
      ...data.task,
      subtasks: current?.subtasks || [],
      comments: current?.comments || [],
      activity: current?.activity || [],
    });
    set((state) => ({ tasks: replaceTask(state.tasks, task) }));
    return task;
  },

  deleteTask: async (taskId) => {
    await apiRequest<void>(`/api/tasks/${taskId}`, { method: "DELETE" });
    set((state) => ({ tasks: state.tasks.filter((task) => task.id !== taskId) }));
  },

  setTaskStatus: async (taskId, status) => {
    await get().updateTask(taskId, { status });
  },

  addSubtask: async (taskId, title) => {
    await apiRequest(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      body: jsonBody({ title }),
    });
    await get().loadTaskDetail(taskId);
  },

  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((item) => item.id === taskId);
    const subtask = task?.subtasks.find((item) => item.id === subtaskId);
    if (!subtask) return;
    await apiRequest(`/api/tasks/subtasks/${subtaskId}`, {
      method: "PATCH",
      body: jsonBody({ done: !subtask.done }),
    });
    await get().loadTaskDetail(taskId);
  },

  removeSubtask: async (taskId, subtaskId) => {
    await apiRequest<void>(`/api/tasks/subtasks/${subtaskId}`, { method: "DELETE" });
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? { ...task, subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId) }
          : task,
      ),
    }));
  },

  addComment: async (taskId, _authorId, text) => {
    await apiRequest(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      body: jsonBody({ body: text }),
    });
    await get().loadTaskDetail(taskId);
  },

  markNotificationRead: (notifId) => {
    apiRequest(`/api/notifications/${notifId}/read`, { method: "PATCH" }).catch(() => undefined);
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notifId ? { ...notification, read: true } : notification,
      ),
    }));
  },
  markAllNotificationsRead: () => {
    apiRequest("/api/notifications/read-all", { method: "PATCH" }).catch(() => undefined);
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
    }));
  },
}));

export const selectProjectMembers = (state: AppState, projectId: string): User[] => {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) return [];
  return project.memberIds
    .map((id) => state.users.find((u) => u.id === id))
    .filter((u): u is User => Boolean(u));
};

export const selectProjectTasks = (state: AppState, projectId: string): Task[] =>
  state.tasks.filter((t) => t.projectId === projectId);

export const selectTaskProgress = (
  state: AppState,
  projectId: string,
): { done: number; total: number } => {
  const tasks = selectProjectTasks(state, projectId);
  return { done: tasks.filter((t) => t.status === "done").length, total: tasks.length };
};

export type ProjectStatusType = ProjectStatus;
