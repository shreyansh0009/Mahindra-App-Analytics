import { useState } from 'react';
import {
  UsersIcon, PercentIcon, ClockIcon, StorefrontIcon, MapPinIcon, BuildingsIcon, DownloadSimpleIcon,
} from '@phosphor-icons/react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatCard from '../../components/cards/StatCard';
import UsageFilters from '../../components/common/UsageFilters';
import DataTable from '../../components/tables/DataTable';
import BarChart from '../../components/charts/BarChart';
import PieChart from '../../components/charts/PieChart';
import EmptyState from '../../components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatNumber, formatDuration, formatDate, formatPercent } from '../../utils/formatters';
import { useUsageFilters } from '../../hooks/useUsageFilters';
import { useDealerSummary, useDealerAnalytics, useGeography } from '../../hooks/useDealer';
import { useRoleUserTable } from '../../hooks/useRole';
import { exportUsers } from '../../api/roleApi';

// Shared between the dealer and geography breakdowns — both roll users up by one
// dealership dimension and report the same columns.
const breakdownColumns = (label, extra = []) => [
  { title: label, dataIndex: 'name', render: (v) => <span className="font-medium text-card-foreground">{v}</span> },
  ...extra,
  { title: 'Users', dataIndex: 'totalUsers', sorter: (a, b) => a.totalUsers - b.totalUsers },
  { title: '% of Users', dataIndex: 'percentageOfUsers', render: formatPercent },
  { title: 'Active', dataIndex: 'activeUsers', sorter: (a, b) => a.activeUsers - b.activeUsers },
  { title: 'Avg Time Spent', dataIndex: 'avgTimeSpent', render: formatDuration },
  { title: 'Avg Login Days', dataIndex: 'avgLoginDays' },
  { title: 'Frequent', dataIndex: 'frequent' },
  { title: 'Occasional', dataIndex: 'occasional' },
  { title: 'Low', dataIndex: 'low' },
  { title: 'No Login', dataIndex: 'none' },
];

const dealerColumns = breakdownColumns('Dealer', [
  { title: 'Type', dataIndex: 'category' },
  { title: 'State', dataIndex: 'state' },
  { title: 'City', dataIndex: 'city' },
]);

const userColumns = [
  { title: 'User', dataIndex: 'name', render: (v) => <span className="font-medium text-card-foreground">{v}</span> },
  { title: 'Email', dataIndex: 'email' },
  { title: 'Mobile', dataIndex: 'mobile' },
  { title: 'Role', dataIndex: 'designation' },
  { title: 'Dealer', dataIndex: 'dealer' },
  { title: 'State', dataIndex: 'state' },
  { title: 'City', dataIndex: 'city' },
  { title: 'DOJ', dataIndex: 'doj', render: formatDate },
  { title: 'Star ID', dataIndex: 'starId' },
  { title: 'Login Days', dataIndex: 'loginDays', sorter: (a, b) => a.loginDays - b.loginDays },
  { title: 'Category', dataIndex: 'category' },
];

const DealerAnalytics = () => {
  const state = useUsageFilters();
  const [dimension, setDimension] = useState('state');

  const { data: summaryResp, isLoading: loadingSummary } = useDealerSummary(state.queryParams);
  const { data: dealerResp, isLoading: loadingDealers } = useDealerAnalytics(state.queryParams);
  const { data: geoResp, isLoading: loadingGeo } = useGeography({ ...state.queryParams, dimension });
  // The directory and its export list the same population the charts count:
  // users attached to an actual dealership, not the whole org.
  const scopedParams = { ...state.queryParams, dealersOnly: 'true' };
  const { data: tableResp, isLoading: loadingTable } = useRoleUserTable(scopedParams);

  const s = summaryResp?.data || {};
  const d = dealerResp?.data || {};
  const g = geoResp?.data || {};

  const cards = [
    { title: 'Total Users', value: formatNumber(s.totalUsers), icon: <UsersIcon />, color: 'var(--chart-1)' },
    { title: '% of Users', value: formatPercent(s.percentageOfUsers), icon: <PercentIcon />, color: 'var(--chart-2)' },
    { title: 'Avg Time Spent', value: formatDuration(s.avgTimeSpent), icon: <ClockIcon />, color: 'var(--chart-3)' },
    { title: 'Dealerships', value: formatNumber(s.totalDealers), icon: <StorefrontIcon />, color: 'var(--chart-4)' },
    { title: 'States', value: formatNumber(s.totalStates), icon: <MapPinIcon />, color: 'var(--chart-5)' },
    { title: 'Cities', value: formatNumber(s.totalCities), icon: <BuildingsIcon />, color: 'var(--chart-1)' },
  ];

  const handleExport = async () => {
    const blob = await exportUsers(scopedParams);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dealer-users-export.xlsx';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Everything on this page is scoped to users attached to a DEALER account.
  // That is deliberate — franchise and distributor addresses must not be counted
  // as dealer geography — but it means the page shows a fraction of the org, so
  // it states the fraction rather than letting a few dealerships read as the
  // whole network.
  const excluded = (s.orgTotalUsers || 0) - (s.totalUsers || 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Dealer & Geography"
        subtitle="Users grouped by their dealership and that dealership's billing address."
        actions={false}
      />
      <UsageFilters
        state={state}
        source="dealer"
        show={['state', 'city', 'dealer', 'dealerCategory', 'designation', 'userCategory', 'search']}
      />

      {excluded > 0 && (
        <Alert>
          <AlertTitle>
            Showing {formatNumber(s.totalUsers)} of {formatNumber(s.orgTotalUsers)} users
            ({formatPercent(s.percentageOfUsers)})
          </AlertTitle>
          <AlertDescription>
            {formatNumber(excluded)} users are excluded: their profile reached us without
            dealership details, or their account is not a dealership.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => <StatCard key={card.title} {...card} loading={loadingSummary} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Users by Dealership">
          {d.charts?.totalUsers?.length ? (
            <BarChart
              data={d.charts.totalUsers}
              series={[{ key: 'value', label: 'Users' }]}
              xKey="name"
              layout="vertical"
              height={320}
            />
          ) : <EmptyState />}
        </SectionCard>
        <SectionCard title="Login Activity Split">
          {d.charts?.classification?.length ? (
            <PieChart data={d.charts.classification} nameKey="name" valueKey="value" height={320} />
          ) : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard
        title={`Users by ${dimension === 'city' ? 'City' : 'State'}`}
        action={(
          <ToggleGroup
            value={[dimension]}
            onValueChange={(v) => v?.[0] && setDimension(v[0])}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="state">State</ToggleGroupItem>
            <ToggleGroupItem value="city">City</ToggleGroupItem>
          </ToggleGroup>
        )}
        contentClassName="pt-0"
      >
        <DataTable
          columns={breakdownColumns(dimension === 'city' ? 'City' : 'State')}
          dataSource={g.rows || []}
          loading={loadingGeo}
          rowKey="name"
          meta={geoResp?.meta}
          onPageChange={state.setPage}
        />
      </SectionCard>

      <SectionCard title="Dealer Breakdown" contentClassName="pt-0">
        <DataTable
          columns={dealerColumns}
          dataSource={d.rows || []}
          loading={loadingDealers}
          rowKey="name"
          meta={dealerResp?.meta}
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

export default DealerAnalytics;
