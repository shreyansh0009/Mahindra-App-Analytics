import { Empty, EmptyHeader, EmptyMedia, EmptyDescription } from '@/components/ui/empty';
import { TrayIcon } from '@phosphor-icons/react';

const EmptyState = ({ description = 'No data available' }) => (
  <Empty className="py-10">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <TrayIcon />
      </EmptyMedia>
      <EmptyDescription>{description}</EmptyDescription>
    </EmptyHeader>
  </Empty>
);

export default EmptyState;
