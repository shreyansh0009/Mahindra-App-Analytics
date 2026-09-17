import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersIcon, UserCircleIcon, PercentIcon, RepeatIcon } from '@phosphor-icons/react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatCard from '../../components/cards/StatCard';
import UsageFilters from '../../components/common/UsageFilters';
import DataTable from '../../components/tables/DataTable';
import BarChart from '../../components/charts/BarChart';
import PieChart from '../../components/charts/PieChart';
import LineChart from '../../components/charts/LineChart';
import EmptyState from '../../components/common/EmptyState';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { useUsageFilters } from '../../hooks/useUsageFilters';
import { useFeatureUsage } from '../../hooks/useFeatureUsage';

const columns = [
  { title: 'Feature', dataIndex: 'feature', render: (v) => <span className="font-medium text-card-foreground">{v}</span> },
  { title: 'Total Users', dataIndex: 'totalUsers', sorter: (a, b) => a.totalUsers - b.totalUsers },
  { title: 'Unique Users', dataIndex: 'uniqueUsers', sorter: (a, b) => a.uniqueUsers - b.uniqueUsers },
  { title: 'Usage %', dataIndex: 'usagePct', render: formatPercent, sorter: (a, b) => a.usagePct - b.usagePct },
  { title: 'Avg Uses', dataIndex: 'avgUses', sorter: (a, b) => a.avgUses - b.avgUses },
];

const FeatureUsage = () => {
  const [role, setRole] = useState('salesman'); // 'salesman' | 'manager'
  const state = useUsageFilters();
  const { data: resp, isLoading } = useFeatureUsage({ ...state.queryParams, role });

  const d = resp?.data || {};
  const s = d.summary || {};
  const c = d.charts || {};

  const cards = [
    { title: 'Total Users', value: formatNumber(s.totalUsers), icon: <UsersIcon />, color: 'var(--chart-1)' },
    { title: 'Unique Users', value: formatNumber(s.uniqueUsers), icon: <UserCircleIcon />, color: 'var(--chart-2)' },
    { title: 'Avg Usage %', value: formatPercent(s.avgUsagePct), icon: <PercentIcon />, color: 'var(--chart-4)' },
    { title: 'Avg Uses', value: formatNumber(s.avgUses), icon: <RepeatIcon />, color: 'var(--chart-5)' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Feature Usage Analytics"
        subtitle="How many users actually use key application features."
        actions={false}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={role} onValueChange={setRole}>
          <TabsList>
            <TabsTrigger value="salesman">Salesman</TabsTrigger>
            <TabsTrigger value="manager">Sales Manager / Coordinator</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <UsageFilters
        state={state}
        source="role"
        show={['designation', 'platform', 'search']}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c2) => <StatCard key={c2.title} {...c2} loading={isLoading} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Usage by Feature">
          {c.bar?.length ? <BarChart data={c.bar} series={[{ key: 'value', label: 'Unique Users' }]} xKey="name" layout="vertical" height={300} /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Usage % Distribution">
          {c.pie?.length ? <PieChart data={c.pie} nameKey="name" valueKey="value" height={300} /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="Feature Usage Trend">
        {c.trend?.length ? <LineChart data={c.trend} series={c.trendSeries || []} xKey="date" height={300} /> : <EmptyState />}
      </SectionCard>

      <SectionCard title="Feature Breakdown" contentClassName="pt-0">
        <DataTable
          columns={columns}
          dataSource={d.rows || []}
          loading={isLoading}
          rowKey="feature"
          meta={resp?.meta}
          onPageChange={state.setPage}
        />
      </SectionCard>
    </div>
  );
};

export default FeatureUsage;
