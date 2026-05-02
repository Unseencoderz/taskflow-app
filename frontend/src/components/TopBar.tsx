import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Inbox, UserRound } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export function TopBar({ title }: { title: string }) {
  const { user } = useAuth();
  const notifications = useStore((s) => s.notifications);
  const markAllRead = useStore((s) => s.markAllNotificationsRead);
  const markRead = useStore((s) => s.markNotificationRead);
  const loadNotifications = useStore((s) => s.loadNotifications);
  const unread = notifications.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) loadNotifications().catch(() => undefined);
  }, [loadNotifications, open]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-6">
      <SidebarTrigger className="-ml-1" />
      <div className="h-5 w-px bg-border" />
      <h1 className="truncate text-sm font-semibold sm:text-base">{title}</h1>
      <div className="flex-1" />
      <div className="flex shrink-0 items-center gap-1.5">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative shrink-0 rounded-full ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              >
                <Avatar name={user.name} color={user.avatarColor} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-0.5">
                  <span className="truncate text-sm font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <UserRound className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unread}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Notifications</SheetTitle>
              {unread > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead}>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="mt-4 space-y-1 overflow-y-auto px-1">
            {notifications.length === 0 ? (
              <EmptyState
                icon={<Inbox className="h-6 w-6" />}
                title="You're all caught up"
                description="New notifications will appear here."
              />
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    if (n.link) {
                      setOpen(false);
                      window.location.href = n.link;
                    }
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent",
                    !n.read && "bg-accent/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.read ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{n.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
