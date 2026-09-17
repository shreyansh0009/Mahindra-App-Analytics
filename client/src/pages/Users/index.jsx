import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  UsersThreeIcon, UserPlusIcon, ArrowsClockwiseIcon, UserMinusIcon, PulseIcon,
} from '@phosphor-icons/react';
import StatCard from '../../components/cards/StatCard';
import SectionCard from '../../components/common/SectionCard';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import SearchInput from '../../components/common/SearchInput';
import FilterField from '../../components/common/FilterField';
import PlatformBadge from '../../components/common/PlatformBadge';
import AreaChart from '../../components/charts/AreaChart';
import BarChart from '../../components/charts/BarChart';
import DonutStat from '../../components/charts/DonutStat';
import EmptyState from '../../components/common/EmptyState';
import { formatNumber, formatDuration, fromNow, formatDateTime } from '../../utils/formatters';
import { useFilters } from '../../context/FiltersContext';
import { useUsers, useUserStats, useDemographics } from '../../hooks/useUsers';

const initials = (name, id) => (name || id || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const columns = (navigate) => [
  {
    title: 'User',
    dataIndex: 'name',
    render: (name, r) => (
      <button
        className="flex items-center gap-2 text-left"
        onClick={(e) => { e.stopPropagation(); navigate(`/users/${r.userId}`); }}
      >
        <Avatar size="sm"><AvatarFallback>{initials(name, r.userId)}</AvatarFallback></Avatar>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-card-foreground">{name || r.userId}</div>
          <div className="truncate text-xs text-muted-foreground">{r.email || r.userId}</div>
        </div>
      </button>
    ),
  },
  { title: 'Platform', dataIndex: 'platform', render: (p) => <PlatformBadge platform={p} /> },
  { title: 'Sessions', dataIndex: 'totalSessions', render: formatNumber, sorter: (a, b) => a.totalSessions - b.totalSessions },
  { title: 'Events', dataIndex: 'totalEvents', render: formatNumber, sorter: (a, b) => a.totalEvents - b.totalEvents },
  { title: 'Time Spent', dataIndex: 'totalTimeSpent', render: formatDuration },
  { title: 'Status', dataIndex: 'isActive', render: (v) => <Badge variant={v ? 'default' : 'secondary'}>{v ? 'active' : 'inactive'}</Badge> },
  { title: 'Last Active', dataIndex: 'lastActiveAt', render: (d) => <span className="text-muted-foreground" title={formatDateTime(d)}>{fromNow(d)}</span> },
];

const STAT_META = [
  { key: 'total', title: 'Total Users', icon: <UsersThreeIcon />, color: 'var(--chart-1)' },
  { key: 'newUsers', title: 'New Users', icon: <UserPlusIcon />, color: 'var(--chart-2)' },
  { key: 'returning', title: 'Returning Users', icon: <ArrowsClockwiseIcon />, color: 'var(--chart-5)' },
  { key: 'inactive', title: 'Inactive Users', icon: <UserMinusIcon />, color: 'var(--chart-4)' },
  { key: 'active', title: 'Active Users', icon: <PulseIcon />, color: 'var(--chart-2)' },
];

const Users = () => {
  const navigate = useNavigate();
  const { dateParams } = useFilters();
  const [params, setParams] = useState({ page: 1, limit: 10 });

  const { data: statsResp, isLoading: loadingStats } = useUserStats(dateParams);
  const { data: demoResp } = useDemographics(dateParams);
  const { data: usersResp, isLoading } = useUsers({ ...params, ...dateParams });

  const stats = statsResp?.data || {};
  const demo = demoResp?.data || {};
  const users = usersResp?.data || [];
  const meta = usersResp?.meta;

  const growth = (demo.growth || []).map((d) => ({ date: d.date, Users: d.users }));
  const ageGroups = (demo.ageGroup || []).map((d) => ({ name: d.name, Users: d.value }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Users" subtitle="Understand who your users are and how they grow." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {STAT_META.map((m) => (
          <StatCard key={m.key} title={m.title} icon={m.icon} color={m.color} loading={loadingStats} value={formatNumber(stats[m.key])} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="Registration Growth" className="xl:col-span-2">
          {growth.length ? <AreaChart data={growth} series={[{ key: 'Users', label: 'New Users' }]} height={240} /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Gender Distribution">
          {(demo.gender || []).length ? <DonutStat data={demo.gender} centerLabel="Users" /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Age Groups">
          {ageGroups.length ? <BarChart data={ageGroups} series={[{ key: 'Users', label: 'Users' }]} xKey="name" layout="horizontal" height={200} /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard
        title="All Users"
        action={(
          <div className="flex flex-wrap items-end gap-3">
            <FilterField name="search" description="Matches a user's name or email address.">
              <SearchInput placeholder="Name or email…" className="w-full sm:w-56" onSearch={(v) => setParams((p) => ({ ...p, search: v, page: 1 }))} />
            </FilterField>
            <FilterField name="platform">
              <NativeSelect className="w-36" onChange={(e) => setParams((p) => ({ ...p, platform: e.target.value || undefined, page: 1 }))}>
                <NativeSelectOption value="">All Platforms</NativeSelectOption>
                <NativeSelectOption value="ios">iOS</NativeSelectOption>
                <NativeSelectOption value="android">Android</NativeSelectOption>
                <NativeSelectOption value="web">Web</NativeSelectOption>
              </NativeSelect>
            </FilterField>
          </div>
        )}
        contentClassName="pt-0"
      >
        <DataTable
          columns={columns(navigate)}
          dataSource={users}
          loading={isLoading}
          rowKey="userId"
          meta={meta}
          onPageChange={({ page, limit }) => setParams((p) => ({ ...p, page, limit }))}
          onRow={(r) => ({ onClick: () => navigate(`/users/${r.userId}`) })}
        />
      </SectionCard>
    </div>
  );
};

export default Users;
