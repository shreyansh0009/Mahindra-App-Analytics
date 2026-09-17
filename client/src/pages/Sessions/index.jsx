import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  ClockIcon, ArrowUpIcon, ArrowDownIcon, ArrowUUpLeftIcon, RepeatIcon,
} from '@phosphor-icons/react';
import StatCard from '../../components/cards/StatCard';
import SectionCard from '../../components/common/SectionCard';
import PageHeader from '../../components/common/PageHeader';
import ScopedUserBanner from '../../components/common/ScopedUserBanner';
import DataTable from '../../components/tables/DataTable';
import PlatformBadge from '../../components/common/PlatformBadge';
import AreaChart from '../../components/charts/AreaChart';
import BarChart from '../../components/charts/BarChart';
import EmptyState from '../../components/common/EmptyState';
import { formatDuration, formatDateTime } from '../../utils/formatters';
import { useFilters } from '../../context/FiltersContext';
import { useSessions, useSessionStats, useSessionTrend, useSessionHourly } from '../../hooks/useSessions';

const columns = [
  { title: 'Session ID', dataIndex: 'sessionId', render: (v) => <span className="font-mono text-xs text-primary">{v.slice(0, 16)}</span> },
  { title: 'User', dataIndex: 'userId', render: (v) => <span className="font-mono text-xs">{v.slice(0, 14)}</span> },
  { title: 'Start', dataIndex: 'startTime', render: (v) => formatDateTime(v) },
  { title: 'Duration', dataIndex: 'duration', render: formatDuration, sorter: (a, b) => a.duration - b.duration },
  { title: 'Device', dataIndex: 'deviceModel' },
  { title: 'Platform', dataIndex: 'platform', render: (p) => <PlatformBadge platform={p} /> },
  { title: 'Screens', dataIndex: 'screensVisited', render: (v) => v?.length ?? 0 },
  { title: 'Status', dataIndex: 'isActive', render: (v) => <Badge variant={v ? 'default' : 'secondary'}>{v ? 'active' : 'ended'}</Badge> },
];

const Sessions = () => {
  const { queryParams } = useFilters();
  const [params, setParams] = useState({ page: 1, limit: 10 });

  const { data: statsResp, isLoading: loadingStats } = useSessionStats(queryParams);
  const { data: trendResp } = useSessionTrend(queryParams);
  const { data: hourlyResp } = useSessionHourly(queryParams);
  const { data: sessResp, isLoading } = useSessions({ ...params, ...queryParams });

  const st = statsResp?.data || {};
  const trend = (trendResp?.data || []).map((d) => ({ date: d.date, Seconds: Math.round(d.avgDuration / 1000) }));
  const hourly = (hourlyResp?.data || []).map((d) => ({ name: d.hour, Sessions: d.sessions }));
  const sessions = sessResp?.data || [];
  const meta = sessResp?.meta;

  const stats = [
    { title: 'Avg. Session', value: formatDuration(st.avgDuration), icon: <ClockIcon />, color: 'var(--chart-1)' },
    { title: 'Longest Session', value: formatDuration(st.longest), icon: <ArrowUpIcon />, color: 'var(--chart-2)' },
    { title: 'Shortest Session', value: formatDuration(st.shortest), icon: <ArrowDownIcon />, color: 'var(--chart-5)' },
    { title: 'Bounce Rate', value: st.bounceRate != null ? `${st.bounceRate}%` : '—', icon: <ArrowUUpLeftIcon />, color: 'var(--chart-4)' },
    { title: 'Sessions / User', value: st.sessionsPerUser ?? '—', icon: <RepeatIcon />, color: 'var(--chart-2)' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Sessions" subtitle="Session frequency, duration, and engagement depth." />
      <ScopedUserBanner />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => <StatCard key={s.title} {...s} loading={loadingStats} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Avg. Session Duration Trend">
          {trend.length ? <AreaChart data={trend} series={[{ key: 'Seconds', label: 'Avg Duration (s)' }]} height={240} /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Hourly Session Distribution">
          {hourly.length ? <BarChart data={hourly} series={[{ key: 'Sessions', label: 'Sessions' }]} xKey="name" layout="horizontal" colors={['var(--chart-2)']} height={240} /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="Recent Sessions" contentClassName="pt-0">
        <DataTable
          columns={columns}
          dataSource={sessions}
          loading={isLoading}
          rowKey="sessionId"
          meta={meta}
          onPageChange={({ page, limit }) => setParams((p) => ({ ...p, page, limit }))}
        />
      </SectionCard>
    </div>
  );
};

export default Sessions;
