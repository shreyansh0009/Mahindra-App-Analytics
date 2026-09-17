import {
  SquaresFourIcon, UsersThreeIcon, ClockIcon, CheckCircleIcon,
} from '@phosphor-icons/react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatCard from '../../components/cards/StatCard';
import UsageFilters from '../../components/common/UsageFilters';
import DataTable from '../../components/tables/DataTable';
import BarChart from '../../components/charts/BarChart';
import LineChart from '../../components/charts/LineChart';
import PieChart from '../../components/charts/PieChart';
import MiniSparkline from '../../components/charts/MiniSparkline';
import EmptyState from '../../components/common/EmptyState';
import { formatNumber, formatDuration, formatPercent } from '../../utils/formatters';
import { useUsageFilters } from '../../hooks/useUsageFilters';
import { useModuleUsage } from '../../hooks/useUsage';

const trendCol = (arr) => (arr?.length
  ? <div className="h-8 w-24"><MiniSparkline data={arr.map((v) => ({ value: v }))} height={32} color="var(--chart-2)" /></div>
  : '—');

const columns = [
  { title: 'Module', dataIndex: 'module', render: (v) => <span className="font-medium text-card-foreground">{v}</span> },
  { title: 'Users', dataIndex: 'users', render: formatNumber, sorter: (a, b) => a.users - b.users },
  { title: 'Sessions', dataIndex: 'sessions', render: formatNumber, sorter: (a, b) => a.sessions - b.sessions },
  { title: 'Avg Time', dataIndex: 'avgTime', render: formatDuration, sorter: (a, b) => a.avgTime - b.avgTime },
  { title: 'Completion %', dataIndex: 'completionRate', render: (v) => formatPercent(v), sorter: (a, b) => a.completionRate - b.completionRate },
  { title: 'Trend', dataIndex: 'trend', render: trendCol },
];

const ModuleUsage = () => {
  const state = useUsageFilters();
  const { data: resp, isLoading } = useModuleUsage(state.queryParams);
  const d = resp?.data || {};
  const s = d.summary || {};
  const c = d.charts || {};

  const stats = [
    { title: 'Total Module Usage', value: formatNumber(s.totalUsage), icon: <SquaresFourIcon />, color: 'var(--chart-1)' },
    { title: 'Unique Users', value: formatNumber(s.totalUsers), icon: <UsersThreeIcon />, color: 'var(--chart-2)' },
    { title: 'Avg Time', value: formatDuration(s.avgTime), icon: <ClockIcon />, color: 'var(--chart-4)' },
    { title: 'Avg Completion', value: formatPercent(s.avgCompletion), icon: <CheckCircleIcon />, color: 'var(--chart-5)' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Module-wise Usage" subtitle="Which functional areas of the app get used, and how completely." actions={false} />
      <UsageFilters state={state} show={['role', 'appVersion', 'platform', 'search']} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((st) => <StatCard key={st.title} {...st} loading={isLoading} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <SectionCard title="Most Used Modules">
          {c.mostUsed?.length ? <BarChart data={c.mostUsed} series={[{ key: 'value', label: 'Usage' }]} xKey="name" layout="vertical" height={340} /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Module Distribution">
          {c.distribution?.length ? <PieChart data={c.distribution} nameKey="name" valueKey="value" height={340} /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="Module Usage Trend">
        {c.usageTrend?.length ? <LineChart data={c.usageTrend} series={c.trendSeries || []} xKey="date" height={280} /> : <EmptyState />}
      </SectionCard>

      <SectionCard title="All Modules" contentClassName="pt-0">
        <DataTable
          columns={columns}
          dataSource={d.rows || []}
          loading={isLoading}
          rowKey="module"
          meta={resp?.meta}
          onPageChange={state.setPage}
        />
      </SectionCard>
    </div>
  );
};

export default ModuleUsage;
