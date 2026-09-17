import {
  UserCircleIcon, CalendarCheckIcon, CalendarDotsIcon, TimerIcon, ClockIcon, StackIcon,
} from '@phosphor-icons/react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatCard from '../../components/cards/StatCard';
import UsageFilters from '../../components/common/UsageFilters';
import DataTable from '../../components/tables/DataTable';
import BarChart from '../../components/charts/BarChart';
import PieChart from '../../components/charts/PieChart';
import LineChart from '../../components/charts/LineChart';
import EmptyState from '../../components/common/EmptyState';
import { formatNumber, formatDuration } from '../../utils/formatters';
import { useUsageFilters } from '../../hooks/useUsageFilters';
import { useRoleUsage } from '../../hooks/useUsage';

// "Unassigned" is users the app has not sent a role for yet.
const columns = [
  { title: 'Role', dataIndex: 'role', render: (v) => <span className="font-medium text-card-foreground">{v}</span> },
  { title: 'Sessions', dataIndex: 'sessions', render: formatNumber, sorter: (a, b) => a.sessions - b.sessions },
  { title: 'Avg Session', dataIndex: 'avgSession', render: formatDuration, sorter: (a, b) => a.avgSession - b.avgSession },
  { title: 'Daily', dataIndex: 'daily', render: formatNumber, sorter: (a, b) => a.daily - b.daily },
  { title: 'Weekly', dataIndex: 'weekly', render: formatNumber, sorter: (a, b) => a.weekly - b.weekly },
  { title: 'Monthly', dataIndex: 'monthly', render: formatNumber, sorter: (a, b) => a.monthly - b.monthly },
  { title: 'Avg Time', dataIndex: 'avgTime', render: formatDuration, sorter: (a, b) => a.avgTime - b.avgTime },
];

const RoleUsage = () => {
  const state = useUsageFilters();
  const { data: resp, isLoading } = useRoleUsage(state.queryParams);
  const d = resp?.data || {};
  const s = d.summary || {};
  const c = d.charts || {};

  const stats = [
    { title: 'Daily Active', value: formatNumber(s.dau), icon: <CalendarCheckIcon />, color: 'var(--chart-1)' },
    { title: 'Weekly Active', value: formatNumber(s.wau), icon: <CalendarDotsIcon />, color: 'var(--chart-2)' },
    { title: 'Monthly Active', value: formatNumber(s.mau), icon: <UserCircleIcon />, color: 'var(--chart-4)' },
    { title: 'Sessions', value: formatNumber(s.sessions), icon: <StackIcon />, color: 'var(--chart-3)' },
    { title: 'Avg Session', value: formatDuration(s.avgSession), icon: <TimerIcon />, color: 'var(--chart-5)' },
    { title: 'Avg Time', value: formatDuration(s.avgTime), icon: <ClockIcon />, color: 'var(--chart-1)' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="User Role-wise Usage" subtitle="Active users and sessions grouped by the role the app reports." actions={false} />
      <UsageFilters state={state} source="role" show={['designation', 'platform', 'search']} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((st) => <StatCard key={st.title} {...st} loading={isLoading} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Daily Active Users by Role">
          {c.dau?.length ? <BarChart data={c.dau} series={[{ key: 'value', label: 'DAU' }]} xKey="name" layout="vertical" height={300} /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Role Distribution (Monthly)">
          {c.distribution?.length ? <PieChart data={c.distribution} nameKey="name" valueKey="value" height={300} /> : <EmptyState />}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Weekly Active by Role">
          {c.wau?.length ? <BarChart data={c.wau} series={[{ key: 'value', label: 'WAU' }]} xKey="name" layout="vertical" height={300} colors={['var(--chart-2)']} /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Monthly Active by Role">
          {c.mau?.length ? <BarChart data={c.mau} series={[{ key: 'value', label: 'MAU' }]} xKey="name" layout="vertical" height={300} colors={['var(--chart-4)']} /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="Active Users Trend by Role">
        {c.trend?.length ? <LineChart data={c.trend} series={c.trendSeries || []} xKey="date" height={300} /> : <EmptyState />}
      </SectionCard>

      <SectionCard title="Role Breakdown" contentClassName="pt-0">
        <DataTable
          columns={columns}
          dataSource={d.rows || []}
          loading={isLoading}
          rowKey="role"
          meta={resp?.meta}
          onPageChange={state.setPage}
        />
      </SectionCard>
    </div>
  );
};

export default RoleUsage;
