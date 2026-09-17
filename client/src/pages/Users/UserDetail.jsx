import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeftIcon, ClockIcon } from '@phosphor-icons/react';
import PlatformBadge from '../../components/common/PlatformBadge';
import DataTable from '../../components/tables/DataTable';
import EmptyState from '../../components/common/EmptyState';
import Timeline from '../../components/common/Timeline';
import DescriptionList from '../../components/common/DescriptionList';
import { useUser, useUserTimeline, useUserSessions } from '../../hooks/useUsers';
import { formatDateTime, formatDuration, fromNow, formatNumber } from '../../utils/formatters';
import { EVENT_TYPE_COLORS } from '../../constants/eventTypes';

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const { data: userResp, isLoading: loadingUser } = useUser(userId);
  const { data: timelineResp } = useUserTimeline(userId, { limit: 50 });
  const { data: sessionsResp, isLoading: loadingSessions } = useUserSessions(userId, { limit: 10 });

  const user = userResp?.data;
  const timeline = timelineResp?.data || [];
  const sessions = sessionsResp?.data || [];
  const sessionsMeta = sessionsResp?.meta;

  const sessionColumns = [
    { title: 'Session ID', dataIndex: 'sessionId', render: (v) => <code className="text-[11px] text-muted-foreground">{v.slice(-12)}</code> },
    { title: 'Start', dataIndex: 'startTime', render: formatDateTime },
    { title: 'Duration', dataIndex: 'duration', render: formatDuration },
    { title: 'Events', dataIndex: 'eventCount' },
    { title: 'Platform', dataIndex: 'platform', render: (p) => <PlatformBadge platform={p} /> },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (v) => <Badge variant={v ? 'default' : 'secondary'}>{v ? 'Active' : 'Ended'}</Badge>,
    },
  ];

  if (loadingUser) {
    return (
      <div className="flex justify-center pt-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user) return <EmptyState description="User not found" />;

  const stats = [
    { label: 'Sessions',     value: formatNumber(user.totalSessions) },
    { label: 'Events',       value: formatNumber(user.totalEvents) },
    { label: 'Screen Views', value: formatNumber(user.totalScreenViews) },
    { label: 'Time Spent',   value: formatDuration(user.totalTimeSpent) },
  ];

  return (
    <div>
      <Button variant="outline" size="sm" className="mb-4" onClick={() => navigate('/users')}>
        <ArrowLeftIcon /> Back to Users
      </Button>

      <h1 className="mb-4 text-lg font-semibold text-foreground">{user.name || user.userId}</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent>
            <DescriptionList
              items={[
                { label: 'User ID', value: <code className="text-[11px]">{user.userId}</code> },
                { label: 'Name', value: user.name || '—' },
                { label: 'Email', value: user.email || '—' },
                { label: 'Platform', value: <PlatformBadge platform={user.platform} /> },
                { label: 'First Seen', value: formatDateTime(user.firstSeenAt) },
                { label: 'Last Active', value: fromNow(user.lastActiveAt) },
              ]}
            />
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="mt-0.5 text-lg font-semibold text-foreground">{s.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="max-h-[500px] overflow-hidden">
          <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
          <CardContent className="max-h-[420px] overflow-y-auto">
            {timeline.length > 0 ? (
              <Timeline
                items={timeline.map((e) => ({
                  color: EVENT_TYPE_COLORS[e.eventType],
                  children: (
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground">{e.eventName}</span>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <ClockIcon size={12} />
                          {formatDateTime(e.timestamp)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge style={{ backgroundColor: `${EVENT_TYPE_COLORS[e.eventType]}22`, color: EVENT_TYPE_COLORS[e.eventType] }}>
                          {e.eventType}
                        </Badge>
                        {e.screenName && <span className="text-xs text-muted-foreground">• {e.screenName}</span>}
                      </div>
                    </div>
                  ),
                }))}
              />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Session History</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={sessionColumns}
            dataSource={sessions}
            loading={loadingSessions}
            meta={sessionsMeta}
            rowKey="sessionId"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDetail;
