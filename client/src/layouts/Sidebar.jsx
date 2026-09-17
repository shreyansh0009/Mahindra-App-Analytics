import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Activity,
  FileBarChart,
  Users,
  RotateCcw,
  Timer,
  Monitor,
  Zap,
  // Icons for the hidden synthetic-data nav items (see NAV_GROUPS below):
  // LayoutGrid, Boxes, GitBranch
  UserCog,
  Building2,
  Sparkles,
  Search,
  Bell,
  CircleHelp,
  Settings,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ChartSpline,
  LogOut,
  Store,
} from 'lucide-react';
import UserSwitcher from '../components/common/UserSwitcher';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import { cn } from '@/lib/utils';

const NAV_GROUPS = [
  {
    label: 'Dashboard',
    items: [
      { key: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Overview' },
      { key: ROUTES.REALTIME, icon: Activity, label: 'Real-time' },
      { key: ROUTES.REPORTS, icon: FileBarChart, label: 'Reports' },
    ],
  },
  {
    label: 'Users',
    items: [
      { key: ROUTES.USERS, icon: Users, label: 'Users' },
      { key: ROUTES.RETENTION, icon: RotateCcw, label: 'Retention' },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { key: ROUTES.SESSIONS, icon: Timer, label: 'Sessions' },
      { key: ROUTES.SCREENS, icon: Monitor, label: 'Screens' },
      { key: ROUTES.EVENTS, icon: Zap, label: 'Events' },
    ],
  },
  // ── HIDDEN: synthetic data ──────────────────────────────────────────────────
  // These three pages are still seeded-random rather than app data — the module,
  // screen and workflow dimensions they slice by do not exist on any collection.
  // Role Usage was in this group until it was rewired to a real aggregation over
  // users.designation; it now sits under Roles & Features. Restore the rest once
  // usageService reads them from the events/sessions collections.
  // {
  //   label: 'Usage Analytics',
  //   items: [
  //     { key: ROUTES.SCREEN_USAGE, icon: LayoutGrid, label: 'Screen Usage' },
  //     { key: ROUTES.MODULE_USAGE, icon: Boxes, label: 'Module Usage' },
  //     { key: ROUTES.WORKFLOW_BREAK, icon: GitBranch, label: 'Workflow Break' },
  //   ],
  // },
  {
    label: 'Roles & Features',
    items: [
      { key: ROUTES.ROLE_ANALYTICS, icon: UserCog, label: 'Role Analytics' },
      { key: ROUTES.DEALER_ANALYTICS, icon: Store, label: 'Dealer & Geography' },
      { key: ROUTES.ROLE_USAGE, icon: Building2, label: 'Role Usage' },
      { key: ROUTES.FEATURE_USAGE, icon: Sparkles, label: 'Feature Usage' },
    ],
  },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isDark, toggle } = useTheme();
  const { logout } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <SidebarRoot collapsible="icon">
      <SidebarHeader className="gap-3 px-2 pt-3">
        <div className="flex items-center gap-2 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ChartSpline className="size-4" />
          </span>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">App Analytics</div>
          </div>
        </div>

        <Button
          variant="outline"
          className={cn(
            'h-9 w-full justify-start gap-2 rounded-xl text-xs font-normal text-muted-foreground shadow-none',
            'group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0',
          )}
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate group-data-[collapsible=icon]:hidden">Search analytics...</span>
        </Button>

        <UserSwitcher />
      </SidebarHeader>

      <SidebarContent className="px-1">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="font-medium tracking-wide text-sidebar-foreground/50 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.key;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        onClick={() => navigate(item.key)}
                        className={cn(
                          'relative rounded-xl transition-colors duration-200',
                          isActive && 'font-medium before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary',
                        )}
                      >
                        <item.icon className="size-4 shrink-0 transition-transform duration-200 group-hover/menu-button:scale-110" />
                        <span>{item.label}</span>
                        {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-1 px-2 pb-3">
        <SidebarSeparator className="mb-1" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Notifications" className="rounded-xl">
              <Bell className="size-4 shrink-0" />
              <span>Notifications</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Help Center" className="rounded-xl">
              <CircleHelp className="size-4 shrink-0" />
              <span>Help Center</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggle}
              className="rounded-xl"
            >
              {isDark ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />}
              <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" className="rounded-xl">
              <Settings className="size-4 shrink-0" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggleSidebar}
              className="rounded-xl"
            >
              {collapsed ? <PanelLeftOpen className="size-4 shrink-0" /> : <PanelLeftClose className="size-4 shrink-0" />}
              <span>Collapse</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Log out"
              onClick={handleLogout}
              className="rounded-xl text-destructive hover:text-destructive"
            >
              <LogOut className="size-4 shrink-0" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator className="my-1" />

        <div className="flex items-center gap-2 rounded-xl p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5">
          <Avatar size="sm" className="shrink-0">
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-xs font-medium text-sidebar-foreground">Admin</div>
            <Badge variant="secondary" className="mt-0.5 text-[10px]">Administrator</Badge>
          </div>
        </div>
      </SidebarFooter>
    </SidebarRoot>
  );
};

export default Sidebar;
