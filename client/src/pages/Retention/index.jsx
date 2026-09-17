import { CalendarCheckIcon, CalendarXIcon, RepeatIcon, UsersThreeIcon } from '@phosphor-icons/react';
import StatCard from '../../components/cards/StatCard';
import SectionCard from '../../components/common/SectionCard';
import PageHeader from '../../components/common/PageHeader';
import LineChart from '../../components/charts/LineChart';
import FunnelChart from '../../components/charts/FunnelChart';
import EmptyState from '../../components/common/EmptyState';
import { formatNumber } from '../../utils/formatters';
import { useRetention } from '../../hooks/useAnalytics';
import { useRetentionCurve, useFunnel } from '../../hooks/useDashboard';
import { useUserStats } from '../../hooks/useUsers';
import { useFilters } from '../../context/FiltersContext';

const RET_DAYS = [1, 3, 7, 14, 30];

const Retention = () => {
  const { dateParams, queryParams } = useFilters();
  const { data: curveResp, isLoading } = useRetentionCurve(queryParams);
  const { data: cohortResp } = useRetention({ days: 30 });
  const { data: funnelResp } = useFunnel(queryParams);
  const { data: statsResp } = useUserStats(dateParams);

  const curve = curveResp?.data || [];
  const cohorts = cohortResp?.data || [];
  const funnel = funnelResp?.data || [];
  const stats = statsResp?.data || {};

  const byDay = Object.fromEntries(curve.map((c) => [c.day, c.value]));
  const kpis = [
    { title: 'Day-1 Retention', value: byDay['Day 1'] != null ? `${byDay['Day 1']}%` : '—', icon: <CalendarCheckIcon />, color: 'var(--chart-1)' },
    { title: 'Day-7 Retention', value: byDay['Day 7'] != null ? `${byDay['Day 7']}%` : '—', icon: <RepeatIcon />, color: 'var(--chart-2)' },
    { title: 'Day-30 Retention', value: byDay['Day 30'] != null ? `${byDay['Day 30']}%` : '—', icon: <CalendarXIcon />, color: 'var(--chart-5)' },
    { title: 'Returning Users', value: formatNumber(stats.returning), icon: <UsersThreeIcon />, color: 'var(--chart-4)' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Retention" subtitle="How well your app brings users back over time." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => <StatCard key={k.title} {...k} loading={isLoading} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Retention Curve">
          {curve.length ? <LineChart data={curve} series={[{ key: 'value', label: 'Retention %' }]} xKey="day" height={240} /> : <EmptyState />}
        </SectionCard>
        <SectionCard title="Conversion Funnel">
          {funnel.length ? <FunnelChart steps={funnel} /> : <EmptyState />}
        </SectionCard>
      </div>

      <SectionCard title="Cohort Retention Heatmap" contentClassName="overflow-x-auto">
        {cohorts.length ? (
          <table className="w-full min-w-[560px] border-separate border-spacing-1 text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="px-2 py-1 text-left font-medium">Cohort</th>
                <th className="px-2 py-1 text-right font-medium">Users</th>
                {RET_DAYS.map((d) => <th key={d} className="px-2 py-1 text-center font-medium">Day {d}</th>)}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.date}>
                  <td className="px-2 py-1 font-medium text-card-foreground">{c.date}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{formatNumber(c.cohortSize)}</td>
                  {RET_DAYS.map((d) => {
                    const v = c.retention[`day${d}`] ?? 0;
                    return (
                      <td
                        key={d}
                        className="rounded px-2 py-1.5 text-center font-medium tabular-nums"
                        style={{
                          backgroundColor: `color-mix(in oklab, var(--chart-1) ${Math.round(v)}%, transparent)`,
                          color: v > 55 ? 'var(--primary-foreground)' : 'var(--card-foreground)',
                        }}
                      >
                        {v}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState />}
      </SectionCard>
    </div>
  );
};

export default Retention;
