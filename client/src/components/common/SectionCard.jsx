import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// Standard content panel used across pages: title + optional right-slot action
// and an optional footer "view all" link. Keeps every section visually consistent.
const SectionCard = ({ title, action, children, footer, onFooterClick, className, contentClassName }) => (
  <Card className={cn('h-full gap-0 shadow-xs', className)}>
    <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border pb-3">
      <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      {action}
    </CardHeader>
    <CardContent className={cn('pt-4', contentClassName)}>{children}</CardContent>
    {footer && (
      <CardFooter className="border-t border-border pt-3">
        <Button variant="ghost" size="sm" className="w-full justify-center text-xs" onClick={onFooterClick}>
          {footer}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </CardFooter>
    )}
  </Card>
);

export default SectionCard;
