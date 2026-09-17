import { MonitorIcon, StarIcon, MoonIcon, ClockIcon } from '@phosphor-icons/react';
import StatCard from '../../components/cards/StatCard';
import SectionCard from '../../components/common/SectionCard';
import PageHeader from '../../components/common/PageHeader';
import ScopedUserBanner from '../../components/common/ScopedUserBanner';
import DataTable from '../../components/tables/DataTable';
import BarChart from '../../components/charts/BarChart';
import RankBarList from '../../components/common/RankBarList';
import EmptyState from '../../components/common/EmptyState';
import { formatNumber, formatDuration } from '../../utils/formatters';
import { useFilters } from '../../context/FiltersContext';
import { useScreenAnalytics } from '../../hooks/useScreens';

const columns = [
  { title: 'Screen', dataIndex: 'screenName', render: (v) => <span className="font-medium text-card-foreground">{v}</span> },
  { title: 'Views', dataIndex: 'totalVisits', render: formatNumber, sorter: (a, b) => a.totalVisits - b.totalVisits },
  { title: 'Unique Users', dataIndex: 'uniqueUsers', render: formatNumber, sorter: (a, b) => a.uniqueUsers - b.uniqueUsers },
  { title: 'Avg Time', dataIndex: 'avgDuration', render: formatDuration },
  { title: 'Total Time', dataIndex: 'totalDuration', render: formatDuration, sorter: (a, b) => a.totalDuration - b.totalDuration },
];

const Screens = () => {
  const { queryParams } = useFilters();
  const { data: resp, isLoading } = useScreenAnalytics(queryParams);
  const screens = resp?.data || [];

  const sorted = [...screens].sort((a, b) => b.totalVisits - a.totalVisits);
  const stats = [
    { title: 'Total Screens', value: formatNumber(screens.length), icon: <MonitorIcon />, color: 'var(--chart-1)' },
    { title: 'Most Visited', value: sorted[0]?.screenName || '—', icon: <StarIcon />, color: 'var(--chart-2)' },
    { title: 'Least Visited', value: sorted[sorted.length - 1]?.screenName || '—', icon: <MoonIcon />, color: 'var(--chart-5)' },
    {
      title: 'Avg. Time on Screen',
      value: formatDuration(screens.length ? screens.reduce((a, s) => a + s.avgDuration, 0) / screens.length : 0),
      icon: <ClockIcon />, color: 'var(--chart-4)',
    },
  ];

  const barData = sorted.slice(0, 8).map((s) => ({ name: s.screenName, Views: s.totalVisits }));
  const topByTime = sorted.map((s) => ({ screen: s.screenName, time: s.totalDuration })).sort((a, b) => b.time - a.time).slice(0, 6);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Screens" subtitle="Which screens users see and how long they stay." />
      <ScopedUserBanner />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => <StatCard key={s.title} {...s} loading={isLoading} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <SectionCard title="Screen Views">
          {barData.length ? <BarChart data={barData} series={[{ key: 'Views', label: 'Views' }]} xKey="name" layout="vertical" height={300} /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Top Screens by Time">
          {topByTime.length ? <RankBarList items={topByTime} labelKey="screen" valueKey="time" color="var(--chart-2)" valueFormat={formatDuration} /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="All Screens" contentClassName="pt-0">
        <DataTable columns={columns} dataSource={sorted} loading={isLoading} rowKey="screenName" />
      </SectionCard>
    </div>
  );
};

export default Screens;
