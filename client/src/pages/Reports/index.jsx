import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersThreeIcon, LightningIcon, PulseIcon, ClockIcon } from '@phosphor-icons/react';
import StatCard from '../../components/cards/StatCard';
import SectionCard from '../../components/common/SectionCard';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import DonutStat from '../../components/charts/DonutStat';
import EmptyState from '../../components/common/EmptyState';
import { formatNumber, formatDuration } from '../../utils/formatters';
import { useDailyReport, useWeeklyReport, useMonthlyReport } from '../../hooks/useAnalytics';
import { useFilters } from '../../context/FiltersContext';

const screenCols = [
  { title: 'Screen', dataIndex: 'screenName', render: (v) => <span className="font-medium text-card-foreground">{v}</span> },
  { title: 'Visits', dataIndex: 'visits', render: formatNumber, sorter: (a, b) => a.visits - b.visits },
  { title: 'Avg Time', dataIndex: 'avgDuration', render: formatDuration },
];

const Reports = () => {
  const [period, setPeriod] = useState('daily');
  // These endpoints take a single anchor date rather than a range, so the
  // selected range's end date picks which day/week/month is reported on.
  const { dateParams } = useFilters();
  const anchor = dateParams.endDate;
  const daily = useDailyReport({ date: anchor });
  const weekly = useWeeklyReport({ week: anchor });
  const monthly = useMonthlyReport({ month: anchor });

  const active = period === 'daily' ? daily : period === 'weekly' ? weekly : monthly;
  const r = active.data?.data || {};

  const kpis = [
    { title: 'New Users', value: formatNumber(r.newUsers), icon: <UsersThreeIcon />, color: 'var(--chart-1)' },
    { title: 'Active Users', value: formatNumber(r.activeUsers), icon: <PulseIcon />, color: 'var(--chart-2)' },
    { title: 'Sessions', value: formatNumber(r.totalSessions), icon: <LightningIcon />, color: 'var(--chart-5)' },
    { title: 'Avg. Session', value: formatDuration(r.avgSessionDuration), icon: <ClockIcon />, color: 'var(--chart-4)' },
  ];

  const platform = Object.entries(r.platformBreakdown || {}).map(([name, value]) => ({ name, value }));
  const events = (r.eventDistribution || []).map((e) => ({ name: e._id, value: e.count }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Reports" subtitle="Compiled analytics reports by period." actions={false} />

      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => <StatCard key={k.title} {...k} loading={active.isLoading} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Platform Breakdown">
          {platform.length ? <DonutStat data={platform} centerLabel="Sessions" /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Event Distribution">
          {events.length ? <DonutStat data={events} centerLabel="Events" /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="Top Screens" contentClassName="pt-0">
        <DataTable columns={screenCols} dataSource={r.topScreens || []} loading={active.isLoading} rowKey="screenName" />
      </SectionCard>
    </div>
  );
};

export default Reports;
