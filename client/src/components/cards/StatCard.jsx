import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendUpIcon, TrendDownIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import MiniSparkline from '../charts/MiniSparkline';

// Reference-style KPI card: title, big value, comparison %, and a mini sparkline.
const StatCard = ({
  title,
  value,
  trend,
  icon,
  spark,
  subtitle = 'vs previous period',
  color = 'var(--chart-1)',
  loading,
}) => {
  const positive = trend >= 0;
  const TrendIcon = positive ? TrendUpIcon : TrendDownIcon;

  return (
    <Card className="h-full gap-0 overflow-hidden shadow-xs transition-shadow hover:shadow-md" size="sm">
      <CardContent className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <span className="truncate text-xs font-medium text-muted-foreground">{title}</span>
              {icon && (
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
                >
                  {icon}
                </div>
              )}
            </div>

            <div className="text-2xl font-semibold tracking-tight text-card-foreground">{value}</div>

            {trend != null && (
              <div className="flex items-center gap-1.5 text-xs">
                <span
                  className={cn('flex items-center gap-0.5 font-medium', positive ? 'text-[#2f9e44]' : 'text-[#e03131]')}
                >
                  <TrendIcon size={13} weight="bold" />
                  {Math.abs(trend)}%
                </span>
                <span className="truncate text-muted-foreground">{subtitle}</span>
              </div>
            )}

            {spark && (
              <div className="-mx-1 -mb-1">
                <MiniSparkline data={spark} color={color} height={36} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
