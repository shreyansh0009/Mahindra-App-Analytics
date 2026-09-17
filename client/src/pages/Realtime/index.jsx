import { Badge } from '@/components/ui/badge';
import { RadioIcon, MapPinIcon, PulseIcon, DeviceMobileIcon } from '@phosphor-icons/react';
import SectionCard from '../../components/common/SectionCard';
import PageHeader from '../../components/common/PageHeader';
import RankBarList from '../../components/common/RankBarList';
import EmptyState from '../../components/common/EmptyState';
import { fromNow } from '../../utils/formatters';
import { useRealtime } from '../../hooks/useDashboard';

const BigStat = ({ label, value, icon }) => (
  <div className="flex items-center gap-3">
    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
    <div>
      <div className="text-2xl font-semibold tabular-nums text-card-foreground">{value ?? 0}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  </div>
);

const Realtime = () => {
  const { data: resp, isFetching } = useRealtime();
  const rt = resp?.data || {};
  const feed = rt.feed || [];
  const topPages = rt.topPages || [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Real-time" subtitle="What's happening in your app right now." actions={false}>
        <span />
      </PageHeader>
      <div className="-mt-2">
        <Badge variant="secondary" className="gap-1.5">
          <RadioIcon size={13} className={isFetching ? 'animate-pulse text-[#2f9e44]' : 'text-[#2f9e44]'} />
          Live · updates every 5s
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Users Online">
          <div className="flex flex-col gap-1">
            <span className="text-5xl font-semibold tabular-nums text-card-foreground">{rt.onlineUsers ?? 0}</span>
            <span className="text-xs text-muted-foreground">Active in the last 5 minutes</span>
          </div>
        </SectionCard>
        <SectionCard title="Active Sessions">
          <BigStat label="Sessions in progress" value={rt.activeSessions} icon={<DeviceMobileIcon size={18} />} />
        </SectionCard>
        <SectionCard title="Events (5 min)">
          <BigStat label="Events in last 5 minutes" value={rt.recentEvents} icon={<PulseIcon size={18} />} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Live Activity Feed">
          {feed.length ? (
            <div className="flex flex-col divide-y divide-border">
              {feed.map((f, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="size-2 shrink-0 rounded-full bg-[#2f9e44]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-card-foreground">
                      {f.name} <span className="font-normal text-muted-foreground">triggered</span> {f.eventName}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPinIcon size={11} /> {f.city}{f.screenName ? ` · ${f.screenName}` : ''}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{fromNow(f.timestamp)}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState description="No events in the last 5 minutes." />}
        </SectionCard>

        <SectionCard title="Top Pages Right Now">
          {topPages.length ? (
            <RankBarList items={topPages} labelKey="page" valueKey="users" color="var(--chart-2)" valueFormat={(v) => `${v}`} />
          ) : <EmptyState />}
        </SectionCard>
      </div>
    </div>
  );
};

export default Realtime;
