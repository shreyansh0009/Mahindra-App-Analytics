import {
  UserIcon, UserPlusIcon, ClockIcon, UsersThreeIcon, PulseIcon, LightningIcon,
  DeviceMobileIcon, TimerIcon,
} from '@phosphor-icons/react';
import StatCard from '../../components/cards/StatCard';
import SectionCard from '../../components/common/SectionCard';
import PageHeader from '../../components/common/PageHeader';
import ScopedUserBanner from '../../components/common/ScopedUserBanner';
import RankBarList from '../../components/common/RankBarList';
import FunnelChart from '../../components/charts/FunnelChart';
import DonutStat from '../../components/charts/DonutStat';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import MiniSparkline from '../../components/charts/MiniSparkline';
import EmptyState from '../../components/common/EmptyState';
import { formatNumber, formatDuration, fromNow } from '../../utils/formatters';
import { useFilters } from '../../context/FiltersContext';
import {
  useDashboardSummary, useDashboardGraphs, useDevices, useAppVersions,
  useFunnel, useRetentionCurve, useSessionOverview, useRealtime,
} from '../../hooks/useDashboard';
import { useTopScreens } from '../../hooks/useScreens';
import { useTopEvents } from '../../hooks/useEvents';

const spark = (series) => (series || []).map((d) => ({ value: d.count }));

const Dashboard = () => {
  const { queryParams } = useFilters();

  const { data: summaryResp, isLoading: loadingSummary } = useDashboardSummary(queryParams);
  const { data: graphsResp } = useDashboardGraphs(queryParams);
  const { data: devicesResp } = useDevices(queryParams);
  const { data: versionsResp } = useAppVersions(queryParams);
  const { data: funnelResp } = useFunnel(queryParams);
  const { data: retentionResp } = useRetentionCurve(queryParams);
  const { data: overviewResp } = useSessionOverview(queryParams);
  const { data: topScreensResp } = useTopScreens({ ...queryParams, limit: 5 });
  const { data: topEventsResp } = useTopEvents({ ...queryParams, limit: 5 });
  const { data: realtimeResp } = useRealtime();

  const s = summaryResp?.data || {};
  const graphs = graphsResp?.data || {};
  const so = overviewResp?.data || {};
  const rt = realtimeResp?.data || {};

  const scoped = s.scopedUser;
  const activityLabel = graphs.scopedByUser ? 'Screen Views' : 'Active Users';
  const activity = (graphs.dauTrend || []).map((d, i) => ({
    date: d._id,
    [activityLabel]: d.count,
    Sessions: graphs.sessionTrend?.[i]?.count ?? 0,
  }));
  const sessionsBar = (graphs.sessionTrend || []).map((d) => ({ date: d._id, Sessions: d.count }));
  const topScreens = (topScreensResp?.data || []).map((d) => ({ screen: d.screenName, views: d.visits }));
  const topEvents = (topEventsResp?.data || []).map((d) => ({ event: d._id, count: d.count }));
  const devices = devicesResp?.data?.platforms || [];
  const versions = versionsResp?.data || [];
  const funnel = funnelResp?.data || [];
  const retention = retentionResp?.data || [];

  const kpis = scoped
    ? [
        { title: 'Sessions (period)', value: formatNumber(s.totalSessions), icon: <LightningIcon />, color: 'var(--chart-5)', spark: spark(graphs.sessionTrend) },
        { title: 'Events (period)', value: formatNumber(s.totalEvents), icon: <PulseIcon />, color: 'var(--chart-1)', spark: spark(graphs.eventTrend) },
        { title: 'Screen Views (period)', value: formatNumber(s.totalScreenViews), icon: <DeviceMobileIcon />, color: 'var(--chart-2)', spark: spark(graphs.dauTrend) },
        { title: 'Avg. Session', value: formatDuration(s.avgSessionDuration), icon: <ClockIcon />, color: 'var(--chart-4)' },
        { title: 'Lifetime Sessions', value: formatNumber(scoped.totalSessions), icon: <LightningIcon />, color: 'var(--chart-5)' },
        { title: 'Lifetime Events', value: formatNumber(scoped.totalEvents), icon: <PulseIcon />, color: 'var(--chart-1)' },
        { title: 'Lifetime Time Spent', value: formatDuration(scoped.totalTimeSpent), icon: <TimerIcon />, color: 'var(--chart-4)' },
        { title: 'Last Active', value: fromNow(scoped.lastActiveAt), icon: <UserIcon />, color: 'var(--chart-2)' },
      ]
    : [
        { title: 'Total Users', value: formatNumber(s.totalUsers), icon: <UserIcon />, color: 'var(--chart-1)', spark: spark(graphs.dauTrend) },
        { title: 'New Users', value: formatNumber(s.newUsers), icon: <UserPlusIcon />, color: 'var(--chart-2)' },
        { title: 'Sessions', value: formatNumber(s.totalSessions), icon: <LightningIcon />, color: 'var(--chart-5)', spark: spark(graphs.sessionTrend) },
        { title: 'Avg. Session', value: formatDuration(s.avgSessionDuration), icon: <ClockIcon />, color: 'var(--chart-4)' },
        { title: 'Active Users (DAU)', value: formatNumber(s.dau), icon: <UsersThreeIcon />, color: 'var(--chart-2)' },
        { title: 'Events', value: formatNumber(s.totalEvents), icon: <PulseIcon />, color: 'var(--chart-1)', spark: spark(graphs.eventTrend) },
      ];

  const sessionOverviewRows = [
    { label: 'Avg. Session Duration', value: formatDuration(so.avgDuration) },
    { label: 'Sessions per User', value: so.sessionsPerUser ?? '—' },
    { label: 'Bounce Rate', value: so.bounceRate != null ? `${so.bounceRate}%` : '—' },
    { label: 'Avg. Screens / Session', value: so.avgScreens ?? '—' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Overview"
        emoji="👋"
        subtitle="Track your app performance and user behavior in real-time."
      />
      <ScopedUserBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <StatCard key={k.title} {...k} loading={loadingSummary} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <SectionCard title={scoped ? 'Activity' : 'User Activity'} className="xl:col-span-2">
          {activity.length ? (
            <LineChart
              data={activity}
              series={[{ key: activityLabel, label: activityLabel }, { key: 'Sessions', label: 'Sessions' }]}
              height={280}
            />
          ) : <EmptyState />}
        </SectionCard>

        <SectionCard title="Top Screens">
          {topScreens.length ? (
            <RankBarList items={topScreens} labelKey="screen" valueKey="views" color="var(--chart-1)" />
          ) : <EmptyState />}
        </SectionCard>

        <SectionCard title="Top Events">
          {topEvents.length ? (
            <RankBarList items={topEvents} labelKey="event" valueKey="count" color="var(--chart-2)" />
          ) : <EmptyState />}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="Sessions">
          {sessionsBar.length ? (
            <BarChart data={sessionsBar} series={[{ key: 'Sessions', label: 'Sessions' }]} xKey="date" layout="horizontal" colors={['var(--chart-2)']} height={220} />
          ) : <EmptyState />}
        </SectionCard>

        <SectionCard title="Session Overview">
          <div className="flex flex-col divide-y divide-border">
            {sessionOverviewRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className="text-sm font-medium tabular-nums text-card-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Devices">
          {devices.length ? <DonutStat data={devices} centerLabel="Sessions" /> : <EmptyState />}
        </SectionCard>

        <SectionCard title="App Versions">
          {versions.length ? (
            <div className="flex flex-col gap-3">
              {versions.map((v) => (
                <div key={v.version} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-card-foreground">{v.version || 'Unknown'}</span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="tabular-nums">{formatNumber(v.users)}</span>
                      <span className="w-10 text-right tabular-nums">{v.pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${v.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState />}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="User Retention">
          {retention.length ? (
            <LineChart data={retention} series={[{ key: 'value', label: 'Retention %' }]} xKey="day" height={220} />
          ) : <EmptyState />}
        </SectionCard>

        <SectionCard title="User Journey" className="xl:col-span-2">
          {funnel.length ? <FunnelChart steps={funnel} /> : <EmptyState />}
        </SectionCard>

        <SectionCard title="Real-time Users">
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-3xl font-semibold tabular-nums text-card-foreground">{rt.onlineUsers ?? 0}</div>
              <div className="text-xs text-muted-foreground">Users active in last 5 minutes</div>
            </div>
            {(rt.topPages || []).length > 0 && (
              <MiniSparkline data={(rt.topPages || []).map((p) => ({ value: p.users }))} dataKey="value" color="var(--chart-2)" height={40} />
            )}
            <div className="flex flex-col gap-1.5">
              {(rt.topPages || []).map((p) => (
                <div key={p.page} className="flex items-center justify-between text-xs">
                  <span className="truncate text-card-foreground">{p.page}</span>
                  <span className="tabular-nums text-muted-foreground">{p.users}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default Dashboard;
