import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { XIcon, UserFocusIcon } from '@phosphor-icons/react';
import PlatformBadge from './PlatformBadge';
import { useFilters } from '../../context/FiltersContext';
import { useUser } from '../../hooks/useUsers';

const initials = (name, id) =>
  (name || id || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Shown at the top of scoped pages when a single user is selected in the sidebar.
// Makes the "one user" state obvious and gives a one-click way back to all users.
const ScopedUserBanner = () => {
  const { selectedUserId, setSelectedUserId } = useFilters();
  const { data: resp } = useUser(selectedUserId);
  if (!selectedUserId) return null;
  const user = resp?.data;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
      <UserFocusIcon size={16} className="shrink-0 text-primary" />
      <Avatar size="sm" className="shrink-0">
        <AvatarFallback>{initials(user?.name, selectedUserId)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-foreground">
          Viewing {user?.name || selectedUserId}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {user?.email || 'All metrics on this page are scoped to this user'}
        </div>
      </div>
      {user?.platform && <PlatformBadge platform={user.platform} />}
      <Button variant="outline" size="sm" onClick={() => setSelectedUserId(null)}>
        <XIcon data-icon="inline-start" /> All Users
      </Button>
    </div>
  );
};

export default ScopedUserBanner;
