import dayjs from 'dayjs';
import { CopyIcon, EditIcon, EyeIcon } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

import { Link } from '@/interfaces/link';
import { getRedirectFromAlias } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

export default function LinkCard({ linkInfo }: { linkInfo: Link }) {
  const onCopyOriginalLink = () => {
    navigator.clipboard.writeText(linkInfo.long_url);
  };

  const ownerLabel =
    linkInfo.owner.type === 'netid' ? (
      linkInfo.owner._id
    ) : (
      <RouterLink to={`/app/orgs/${linkInfo.owner._id}`}>
        {linkInfo.owner.org_name}
      </RouterLink>
    );

  const descriptionRows = [
    { label: 'Owner', value: ownerLabel },
    { label: 'Unique Visits', value: linkInfo.unique_visits },
    { label: 'Total Visits', value: linkInfo.visits },
    {
      label: 'Date Created',
      value: dayjs(linkInfo.created_time).format('MMM D, YYYY - h:mm A'),
    },
    {
      label: 'Date Expires',
      value:
        linkInfo.expiration_time === null
          ? 'N/A'
          : dayjs(linkInfo.expiration_time).format('MMM D, YYYY - h:mm A'),
    },
  ];

  return (
    <Card className="shrink-0 overflow-hidden rounded-md border-border bg-card shadow-none">
      <CardHeader className="flex-row items-center justify-between px-5 py-5">
        <CardTitle className="text-foreground">{linkInfo.title}</CardTitle>
        <TooltipProvider>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <a
                    href={`/app/links/${linkInfo._id}?mode=edit`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <EditIcon className="text-black dark:text-white" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                Edit link
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <a
                    href={`/app/links/${linkInfo._id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <EyeIcon className="text-black dark:text-white" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                View link
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </CardHeader>
      <Separator />
      <CardContent className="px-7 py-7">
        <div className="xl:hidden">
          <dl className="grid gap-4 sm:grid-cols-2">
            {descriptionRows.map((row) => (
              <div key={row.label} className="flex gap-3">
                <dt className="shrink-0 text-base font-semibold text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="min-w-0 text-base text-foreground">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="hidden xl:block">
          <dl className="grid grid-cols-[1.3fr_1fr_1fr_1.35fr_1.1fr] gap-8">
            {descriptionRows.map((row) => (
              <div key={row.label} className="flex min-w-0 gap-3">
                <dt className="shrink-0 text-sm font-semibold text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="min-w-0 text-sm text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-col items-stretch gap-4 px-7 py-7 lg:flex-row lg:items-center lg:justify-between">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="max-w-full justify-start border-dashed border-border bg-transparent px-4 text-sm shadow-none hover:bg-accent dark:bg-[#262626]"
                onClick={() => {
                  navigator.clipboard.writeText(
                    getRedirectFromAlias(
                      linkInfo.alias,
                      linkInfo.is_tracking_pixel_link,
                    ),
                  );
                }}
              >
                <CopyIcon className="text-black dark:text-white" />
                <span className="truncate">
                  {getRedirectFromAlias(
                    linkInfo.alias,
                    linkInfo.is_tracking_pixel_link,
                  )}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
              Copy to clipboard
            </TooltipContent>
          </Tooltip>
          {!linkInfo.is_tracking_pixel_link && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="max-w-full justify-start border-dashed border-border bg-transparent px-4 text-sm shadow-none hover:bg-accent lg:ml-auto dark:bg-[#262626]"
                  onClick={onCopyOriginalLink}
                >
                  <CopyIcon />
                  <span className="truncate">{linkInfo.long_url}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                Copy to clipboard
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
