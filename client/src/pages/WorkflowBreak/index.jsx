import {
  SignInIcon, CheckCircleIcon, WarningCircleIcon, ClockIcon,
} from '@phosphor-icons/react';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatCard from '../../components/cards/StatCard';
import UsageFilters from '../../components/common/UsageFilters';
import FilterField from '../../components/common/FilterField';
import DataTable from '../../components/tables/DataTable';
import FunnelChart from '../../components/charts/FunnelChart';
import LineChart from '../../components/charts/LineChart';
import EmptyState from '../../components/common/EmptyState';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup,
} from '@/components/ui/select';
import { formatNumber, formatDuration, formatPercent } from '../../utils/formatters';
import { useUsageFilters } from '../../hooks/useUsageFilters';
import { useWorkflowBreak } from '../../hooks/useUsage';

const columns = [
  { title: 'Workflow', dataIndex: 'workflow', render: (v) => <span className="font-medium text-card-foreground">{v}</span> },
  { title: 'Started', dataIndex: 'started', render: formatNumber, sorter: (a, b) => a.started - b.started },
  { title: 'Completed', dataIndex: 'completed', render: formatNumber, sorter: (a, b) => a.completed - b.completed },
  { title: 'Broken', dataIndex: 'broken', render: (v) => <span className="text-[#e03131]">{formatNumber(v)}</span>, sorter: (a, b) => a.broken - b.broken },
  { title: 'Completion %', dataIndex: 'completionRate', render: (v) => formatPercent(v), sorter: (a, b) => a.completionRate - b.completionRate },
  { title: 'Avg Duration', dataIndex: 'avgDuration', render: formatDuration, sorter: (a, b) => a.avgDuration - b.avgDuration },
];

const WorkflowBreak = () => {
  const state = useUsageFilters();
  const { data: resp, isLoading } = useWorkflowBreak(state.queryParams);
  const d = resp?.data || {};
  const s = d.summary || {};

  const stats = [
    { title: 'Started', value: formatNumber(s.started), icon: <SignInIcon />, color: 'var(--chart-1)' },
    { title: 'Completed', value: formatNumber(s.completed), icon: <CheckCircleIcon />, color: 'var(--chart-2)' },
    { title: 'Drop-off', value: `${formatNumber(s.dropOff)} · ${formatPercent(s.dropOffRate)}`, icon: <WarningCircleIcon />, color: 'var(--chart-5)' },
    { title: 'Completion Rate', value: formatPercent(s.completionRate), icon: <CheckCircleIcon />, color: 'var(--chart-4)' },
    { title: 'Avg Completion Time', value: formatDuration(s.avgCompletionTime), icon: <ClockIcon />, color: 'var(--chart-3)' },
  ];

  const workflowPicker = (
    <FilterField name="workflow">
      <Select value={state.filters.workflow ?? d.selectedWorkflow ?? ''} onValueChange={(v) => state.setFilter('workflow', v)}>
        <SelectTrigger size="sm" className="h-8 min-w-[180px]">
          <SelectValue placeholder="Select a workflow" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {(d.workflows || []).map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FilterField>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Workflow Break Usage" subtitle="Where users abandon multi-step workflows." actions={false} />
      <UsageFilters state={state} show={['role']} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((st) => <StatCard key={st.title} {...st} loading={isLoading} />)}
      </div>

      <SectionCard title="Workflow Funnel" action={workflowPicker}>
        {d.funnel?.length ? <FunnelChart steps={d.funnel} /> : <EmptyState />}
      </SectionCard>

      <SectionCard title="Drop-off & Completion Trend">
        {d.trend?.length ? (
          <LineChart
            data={d.trend}
            series={[{ key: 'dropOff', label: 'Drop-off' }, { key: 'completion', label: 'Completion %' }]}
            xKey="date"
            height={280}
          />
        ) : <EmptyState />}
      </SectionCard>

      <SectionCard title="All Workflows" contentClassName="pt-0">
        <DataTable
          columns={columns}
          dataSource={d.rows || []}
          loading={isLoading}
          rowKey="workflow"
          meta={resp?.meta}
          onPageChange={state.setPage}
        />
      </SectionCard>
    </div>
  );
};

export default WorkflowBreak;
