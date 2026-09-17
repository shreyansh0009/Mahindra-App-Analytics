import { Badge } from '@/components/ui/badge';
import { PulseIcon, StackIcon, UserFocusIcon, CalendarCheckIcon } from '@phosphor-icons/react';
import StatCard from '../../components/cards/StatCard';
import SectionCard from '../../components/common/SectionCard';
import PageHeader from '../../components/common/PageHeader';
import ScopedUserBanner from '../../components/common/ScopedUserBanner';
import DataTable from '../../components/tables/DataTable';
import AreaChart from '../../components/charts/AreaChart';
import RankBarList from '../../components/common/RankBarList';
import EmptyState from '../../components/common/EmptyState';
import { formatNumber } from '../../utils/formatters';
import { useFilters } from '../../context/FiltersContext';
import { useEventSummary, useEventTrend, useEventStats, useTopEvents } from '../../hooks/useEvents';

const columns = [
  { title: 'Event', dataIndex: 'event', render: (v) => <span className="font-mono text-xs text-card-foreground">{v}</span> },
  { title: 'Type', dataIndex: 'eventType', render: (v) => <Badge variant="outline">{v}</Badge> },
  { title: 'Count', dataIndex: 'count', render: formatNumber, sorter: (a, b) => a.count - b.count },
  { title: 'Unique Users', dataIndex: 'users', render: formatNumber, sorter: (a, b) => a.users - b.users },
  { title: 'Avg / User', dataIndex: 'perUser' },
];

const Events = () => {
  const { queryParams } = useFilters();
  const { data: summaryResp, isLoading: loadingStats } = useEventSummary(queryParams);
  const { data: trendResp } = useEventTrend(queryParams);
  const { data: statsResp, isLoading } = useEventStats(queryParams);
  const { data: topResp } = useTopEvents({ ...queryParams, limit: 6 });

  const sum = summaryResp?.data || {};
  const trend = (trendResp?.data || []).map((d) => ({ date: d.date, Events: d.events }));
  const stats = statsResp?.data || [];
  const top = (topResp?.data || []).map((d) => ({ event: d._id, count: d.count }));

  const kpis = [
    { title: 'Total Events', value: formatNumber(sum.total), icon: <PulseIcon />, color: 'var(--chart-1)' },
    { title: 'Unique Events', value: formatNumber(sum.unique), icon: <StackIcon />, color: 'var(--chart-2)' },
    { title: 'Events / User', value: sum.perUser ?? '—', icon: <UserFocusIcon />, color: 'var(--chart-5)' },
    { title: "Today's Events", value: formatNumber(sum.today), icon: <CalendarCheckIcon />, color: 'var(--chart-4)' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Events" subtitle="Every tracked interaction across your app." />
      <ScopedUserBanner />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => <StatCard key={k.title} {...k} loading={loadingStats} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <SectionCard title="Event Frequency">
          {trend.length ? <AreaChart data={trend} series={[{ key: 'Events', label: 'Events' }]} height={280} /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Top Events">
          {top.length ? <RankBarList items={top} labelKey="event" valueKey="count" color="var(--chart-2)" /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="All Events" contentClassName="pt-0">
        <DataTable columns={columns} dataSource={stats} loading={isLoading} rowKey="event" />
      </SectionCard>
    </div>
  );
};

export default Events;
