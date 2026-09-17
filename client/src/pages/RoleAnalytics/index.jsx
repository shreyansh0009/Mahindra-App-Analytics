import {
  UsersIcon, PercentIcon, ClockIcon, SignInIcon, TrendUpIcon, PulseIcon, DownloadSimpleIcon,
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
import { Button } from '@/components/ui/button';
import { formatNumber, formatDuration, formatDate, formatPercent } from '../../utils/formatters';
import { useUsageFilters } from '../../hooks/useUsageFilters';
import { useRoleSummary, useRoleAnalytics, useUserClassification, useRoleUserTable } from '../../hooks/useRole';
import { exportUsers } from '../../api/roleApi';

const CATEGORY_COLORS = {
  'Frequent User': 'var(--chart-1)',
  'Occasional User': 'var(--chart-2)',
  'Low Usage': 'var(--chart-4)',
  'No Login': 'var(--chart-5)',
};

// One row per role. "Unassigned" counts users the app has not sent a role for.
const roleColumns = [
  { title: 'Role', dataIndex: 'name', render: (v) => <span className="font-medium text-card-foreground">{v}</span> },
  { title: 'Total Users', dataIndex: 'totalUsers', sorter: (a, b) => a.totalUsers - b.totalUsers },
  { title: 'Active Users', dataIndex: 'activeUsers', sorter: (a, b) => a.activeUsers - b.activeUsers },
  { title: 'Avg Time Spent', dataIndex: 'avgTimeSpent', render: formatDuration },
  { title: 'Avg Login Days', dataIndex: 'avgLoginDays' },
  { title: 'Total Logins', dataIndex: 'totalLogins', sorter: (a, b) => a.totalLogins - b.totalLogins },
  { title: 'Frequent', dataIndex: 'frequent' },
  { title: 'Occasional', dataIndex: 'occasional' },
  { title: 'Low', dataIndex: 'low' },
  { title: 'No Login', dataIndex: 'none' },
];

const userColumns = [
  { title: 'User', dataIndex: 'name', render: (v) => <span className="font-medium text-card-foreground">{v}</span> },
  { title: 'Email', dataIndex: 'email' },
  { title: 'Mobile', dataIndex: 'mobile' },
  { title: 'Role', dataIndex: 'designation' },
  { title: 'DOJ', dataIndex: 'doj', render: formatDate },
  { title: 'Star ID', dataIndex: 'starId' },
  { title: 'Login Days', dataIndex: 'loginDays', sorter: (a, b) => a.loginDays - b.loginDays },
  { title: 'Total Logins', dataIndex: 'totalLogins', sorter: (a, b) => a.totalLogins - b.totalLogins },
  { title: 'Avg Time', dataIndex: 'avgTimeSpent', render: formatDuration },
  { title: 'Category', dataIndex: 'category' },
  { title: 'Last Login', dataIndex: 'lastLogin', render: formatDate },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (v) => (
      <span className={v === 'Active' ? 'text-[#2f9e44] font-medium' : 'text-muted-foreground'}>{v}</span>
    ),
  },
];

const RoleAnalytics = () => {
  const state = useUsageFilters();
  const { data: summaryResp, isLoading: loadingSummary } = useRoleSummary(state.queryParams);
  const { data: rolesResp, isLoading: loadingRoles } = useRoleAnalytics(state.queryParams);
  const { data: classResp, isLoading: loadingClass } = useUserClassification(state.queryParams);
  const { data: tableResp, isLoading: loadingTable } = useRoleUserTable(state.queryParams);

  const a = summaryResp?.data || {};
  const r = rolesResp?.data || {};
  const c = classResp?.data || {};
  const charts = c.charts || {};
  const roleCharts = r.charts || {};

  const cards = [
    { title: 'Total Users', value: formatNumber(a.totalUsers), icon: <UsersIcon />, color: 'var(--chart-1)' },
    { title: '% of Users', value: formatPercent(a.percentageOfUsers), icon: <PercentIcon />, color: 'var(--chart-2)' },
    { title: 'Avg Time Spent', value: formatDuration(a.avgTimeSpent), icon: <ClockIcon />, color: 'var(--chart-3)' },
    { title: 'Total Logins', value: formatNumber(a.totalLogins), icon: <SignInIcon />, color: 'var(--chart-4)' },
    { title: 'Avg Logins', value: a.avgLogins ?? '—', icon: <TrendUpIcon />, color: 'var(--chart-5)' },
    { title: 'Active Users', value: formatNumber(a.activeUsers), icon: <PulseIcon />, color: 'var(--chart-1)' },
  ];

  const handleExport = async () => {
    const blob = await exportUsers(state.queryParams);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'users-export.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Role Analytics"
        subtitle="User engagement by the role the app reports on identify."
        actions={false}
      />
      <UsageFilters
        state={state}
        source="role"
        show={['designation', 'userCategory', 'platform', 'search']}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => <StatCard key={card.title} {...card} loading={loadingSummary} />)}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(c.cards || []).map((card) => (
          <StatCard
            key={card.key}
            title={card.label}
            value={formatNumber(card.count)}
            color={CATEGORY_COLORS[card.label]}
            loading={loadingClass}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Users by Role">
          {roleCharts.totalUsers?.length ? (
            <BarChart
              data={roleCharts.totalUsers}
              series={[{ key: 'value', label: 'Users' }]}
              xKey="name"
              layout="vertical"
              height={300}
            />
          ) : <EmptyState />}
        </SectionCard>
        <SectionCard title="User Classification Distribution">
          {charts.pie?.length ? <PieChart data={charts.pie} nameKey="name" valueKey="value" height={300} /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="Active Users Trend by Category">
        {charts.trend?.length ? (
          <LineChart
            data={charts.trend}
            series={[
              { key: 'frequent', label: 'Frequent' },
              { key: 'occasional', label: 'Occasional' },
              { key: 'low', label: 'Low Usage' },
              { key: 'none', label: 'No Login' },
            ]}
            xKey="date"
            height={300}
          />
        ) : <EmptyState />}
      </SectionCard>

      <SectionCard title="Role Breakdown" contentClassName="pt-0">
        <DataTable
          columns={roleColumns}
          dataSource={r.rows || []}
          loading={loadingRoles}
          rowKey="name"
          meta={rolesResp?.meta}
          onPageChange={state.setPage}
        />
      </SectionCard>

      <SectionCard
        title="User Directory"
        contentClassName="pt-0"
        action={(
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <DownloadSimpleIcon /> Export Excel
          </Button>
        )}
      >
        <DataTable
          columns={userColumns}
          dataSource={tableResp?.data || []}
          loading={loadingTable}
          rowKey="userId"
          meta={tableResp?.meta}
          onPageChange={state.setPage}
        />
      </SectionCard>
    </div>
  );
};

export default RoleAnalytics;
