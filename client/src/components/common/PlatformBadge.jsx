import { Badge } from '@/components/ui/badge';
import { AppleLogoIcon, AndroidLogoIcon, GlobeIcon } from '@phosphor-icons/react';

const config = {
  ios:     { icon: AppleLogoIcon,   label: 'iOS' },
  android: { icon: AndroidLogoIcon, label: 'Android' },
  web:     { icon: GlobeIcon,       label: 'Web' },
};

const PlatformBadge = ({ platform }) => {
  const c = config[platform];
  const Icon = c?.icon;

  return (
    <Badge variant="secondary" className="gap-1">
      {Icon && <Icon data-icon="inline-start" />}
      {c?.label || platform || 'Unknown'}
    </Badge>
  );
};

export default PlatformBadge;
