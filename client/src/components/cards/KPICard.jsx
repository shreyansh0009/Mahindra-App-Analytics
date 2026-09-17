import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendUpIcon, TrendDownIcon } from '@phosphor-icons/react';

const KPICard = ({ title, value, icon, trend, loading, color = 'var(--chart-1)' }) => {
  const trendPositive = trend >= 0;
  const TrendIcon = trendPositive ? TrendUpIcon : TrendDownIcon;

  return (
    <Card className="h-full shadow-xs" size="sm">
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 truncate text-xs font-medium text-muted-foreground">{title}</div>
              <div className="text-2xl font-semibold text-card-foreground">{value}</div>
              {trend != null && (
                <div
                  className="mt-2 flex items-center gap-1 text-xs font-medium"
                  style={{ color: trendPositive ? '#2f9e44' : '#e03131' }}
                >
                  <TrendIcon size={14} />
                  <span>{Math.abs(trend)}% vs last period</span>
                </div>
              )}
            </div>
            {icon && (
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
              >
                {icon}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KPICard;
