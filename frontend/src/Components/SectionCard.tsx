import { ReactNode } from 'react';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/Components/ui/card';
import { cn } from '@/Lib/Utils';

type SectionCardProps = {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  className,
}: SectionCardProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
    </Card>
  );
}
