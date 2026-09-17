import { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from '@/components/ui/command';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CaretUpDownIcon, UsersIcon, CheckIcon } from '@phosphor-icons/react';
import { useUsers } from '../../hooks/useUsers';
import { useFilters } from '../../context/FiltersContext';
import { cn } from '@/lib/utils';

const initials = (name, userId) => {
  const source = name || userId || '?';
  return source
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const UserSwitcher = () => {
  const [open, setOpen] = useState(false);
  const { selectedUserId, setSelectedUserId } = useFilters();

  const { data: usersResp, isLoading } = useUsers({ limit: 100, sortBy: 'lastActiveAt', order: 'desc' });
  const users = usersResp?.data || [];
  const selectedUser = users.find((u) => u.userId === selectedUserId);

  const handleSelect = (userId) => {
    setSelectedUserId(userId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md p-2 text-left ring-sidebar-ring outline-hidden hover:bg-sidebar-accent focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5"
          >
            <Avatar size="sm" className="shrink-0">
              <AvatarFallback>
                {selectedUser ? initials(selectedUser.name, selectedUser.userId) : <UsersIcon size={14} />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-xs font-medium text-sidebar-foreground">
                {selectedUser ? (selectedUser.name || selectedUser.userId) : 'All Users'}
              </div>
              <div className="truncate text-[11px] text-sidebar-foreground/60">
                {selectedUser ? selectedUser.email || selectedUser.userId : 'Global overview'}
              </div>
            </div>
            <CaretUpDownIcon className="size-3.5 shrink-0 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
          </button>
        }
      />
      <PopoverContent className="w-72 p-0" align="start" side="right" sideOffset={8}>
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>{isLoading ? 'Loading users...' : 'No users found.'}</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__all__" onSelect={() => handleSelect(null)}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  <UsersIcon size={13} />
                </span>
                <span className="flex-1 truncate">All Users</span>
                {!selectedUserId && <CheckIcon className="ml-auto size-3.5" />}
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.userId}
                  value={`${user.name || ''} ${user.email || ''} ${user.userId}`}
                  onSelect={() => handleSelect(user.userId)}
                >
                  <Avatar size="sm" className="shrink-0">
                    <AvatarFallback>{initials(user.name, user.userId)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{user.name || user.userId}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{user.email || user.userId}</div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn('shrink-0 text-[10px]', !user.isActive && 'opacity-50')}
                  >
                    {user.platform}
                  </Badge>
                  {selectedUserId === user.userId && <CheckIcon className="ml-1 size-3.5 shrink-0" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default UserSwitcher;
