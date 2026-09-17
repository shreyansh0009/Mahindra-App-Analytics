import {
  MonitorIcon, UsersThreeIcon, ClockIcon, SignOutIcon, ArrowUUpLeftIcon, RepeatIcon,
} from '@phosphor-icons/react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatCard from '../../components/cards/StatCard';
import UsageFilters from '../../components/common/UsageFilters';
import DataTable from '../../components/tables/DataTable';
import BarChart from '../../components/charts/BarChart';
import AreaChart from '../../components/charts/AreaChart';
import RankBarList from '../../components/common/RankBarList';
import MiniSparkline from '../../components/charts/MiniSparkline';
import EmptyState from '../../components/common/EmptyState';
import { formatNumber, formatDuration, formatPercent } from '../../utils/formatters';
import { useUsageFilters } from '../../hooks/useUsageFilters';
import { useScreenUsage } from '../../hooks/useUsage';

const trendCol = (arr) => (arr?.length
  ? <div className="h-8 w-24"><MiniSparkline data={arr.map((v) => ({ value: v }))} height={32} /></div>
  : '—');

const columns = [
  { title: 'Screen', dataIndex: 'screenName', render: (v) => <span className="font-medium text-card-foreground">{v}</span> },
  { title: 'Views', dataIndex: 'views', render: formatNumber, sorter: (a, b) => a.views - b.views },
  { title: 'Unique Users', dataIndex: 'uniqueUsers', render: formatNumber, sorter: (a, b) => a.uniqueUsers - b.uniqueUsers },
  { title: 'Avg Time', dataIndex: 'avgTime', render: formatDuration, sorter: (a, b) => a.avgTime - b.avgTime },
  { title: 'Exit %', dataIndex: 'exitRate', render: (v) => formatPercent(v), sorter: (a, b) => a.exitRate - b.exitRate },
  { title: 'Bounce %', dataIndex: 'bounceRate', render: (v) => formatPercent(v), sorter: (a, b) => a.bounceRate - b.bounceRate },
  { title: 'Trend', dataIndex: 'trend', render: trendCol },
];

const ScreenUsage = () => {
  const state = useUsageFilters();
  const { data: resp, isLoading } = useScreenUsage(state.queryParams);
  const d = resp?.data || {};
  const s = d.summary || {};
  const c = d.charts || {};

  const stats = [
    { title: 'Total Screen Visits', value: formatNumber(s.totalViews), icon: <MonitorIcon />, color: 'var(--chart-1)' },
    { title: 'Unique Visitors', value: formatNumber(s.uniqueVisitors), icon: <UsersThreeIcon />, color: 'var(--chart-2)' },
    { title: 'Avg Time Spent', value: formatDuration(s.avgTime), icon: <ClockIcon />, color: 'var(--chart-4)' },
    { title: 'Exit Rate', value: formatPercent(s.exitRate), icon: <SignOutIcon />, color: 'var(--chart-5)' },
    { title: 'Bounce Rate', value: formatPercent(s.bounceRate), icon: <ArrowUUpLeftIcon />, color: 'var(--chart-3)' },
    { title: 'Revisit Count', value: formatNumber(s.revisitCount), icon: <RepeatIcon />, color: 'var(--chart-1)' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Screen-wise Usage" subtitle="How each screen performs — visits, time spent, exits and bounces." actions={false} />
      <UsageFilters state={state} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((st) => <StatCard key={st.title} {...st} loading={isLoading} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <SectionCard title="Top Screens">
          {c.topScreens?.length ? <BarChart data={c.topScreens} series={[{ key: 'value', label: 'Views' }]} xKey="name" layout="vertical" height={320} /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Time Spent per Screen">
          {c.timeSpent?.length ? <RankBarList items={c.timeSpent} labelKey="name" valueKey="value" color="var(--chart-2)" valueFormat={formatDuration} /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="Screen Visits Trend">
        {c.visitsTrend?.length ? <AreaChart data={c.visitsTrend} series={[{ key: 'views', label: 'Views' }]} xKey="date" height={260} /> : <EmptyState />}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Most Used Screens">
          {c.topScreens?.length ? <RankBarList items={c.topScreens.slice(0, 5)} labelKey="name" valueKey="value" color="var(--chart-1)" /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Least Used Screens">
          {c.leastScreens?.length ? <RankBarList items={c.leastScreens} labelKey="name" valueKey="value" color="var(--chart-5)" /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="All Screens" contentClassName="pt-0">
        <DataTable
          columns={columns}
          dataSource={d.rows || []}
          loading={isLoading}
          rowKey="screenName"
          meta={resp?.meta}
          onPageChange={state.setPage}
        />
      </SectionCard>
    </div>
  );
};

export default ScreenUsage;
