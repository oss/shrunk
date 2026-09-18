import {
  Copy,
  EditIcon,
  EyeIcon,
  QrCodeIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { OrganizationLink } from '@/Features/Organizations/Types';
import { getLinkFromAlias } from '@/Shared/Lib/Utils';
import { Button } from '@/Shared/ui/button';
import { Checkbox } from '@/Shared/ui/checkbox';
import { TableCell, TableRow } from '@/Shared/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Shared/ui/tooltip';

interface Props {
  link: OrganizationLink;
  orgId: string;
  isAdmin?: boolean;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onTransfer: () => void;
  onDelete: () => void;
}

function IconLink({
  label,
  href,
  tooltip,
  children,
}: {
  label: string;
  href: string;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" asChild>
          <a aria-label={label} href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export default function OrganizationLinkRow({
  link,
  orgId,
  isAdmin,
  selected,
  onSelect,
  onTransfer,
  onDelete,
}: Props) {
  const iconClass = 'text-black dark:text-white';
  return (
    <TableRow>
      <TableCell>
        <Checkbox
          aria-label={`Select ${link.title}`}
          checked={selected}
          onCheckedChange={(value) => onSelect(value === true)}
        />
      </TableCell>
      <TableCell className="font-semibold">{link.title}</TableCell>
      <TableCell>{link.alias}</TableCell>
      <TableCell>{link.owner.org_name}</TableCell>
      <TableCell className="capitalize">{link.role}</TableCell>
      <TableCell>{link.deleted ? 'Yes' : 'No'}</TableCell>
      <TableCell>
        <div className="flex justify-end gap-0">
          <IconLink
            label={`View ${link.title}`}
            href={`/app/links/${link._id}`}
            tooltip="View link details"
          >
            <EyeIcon className={iconClass} />
          </IconLink>
          {!link.deleted && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Copy ${link.title}`}
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        getLinkFromAlias(
                          link.alias,
                          link.is_tracking_pixel_link,
                        ),
                      );
                      toast.success('Link copied to clipboard');
                    }}
                  >
                    <Copy className={iconClass} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                  Copy link
                </TooltipContent>
              </Tooltip>
              <IconLink
                label={`Open QR code for ${link.title}`}
                href={`/app/links/${link._id}?mode=qrcode`}
                tooltip="Access QR code"
              >
                <QrCodeIcon className={iconClass} />
              </IconLink>
            </>
          )}
          {link.canEdit && (
            <>
              <IconLink
                label={`Edit ${link.title}`}
                href={`/app/links/${link._id}?mode=edit`}
                tooltip="Edit link"
              >
                <EditIcon className={iconClass} />
              </IconLink>
              <IconLink
                label={`Share ${link.title}`}
                href={`/app/links/${link._id}?mode=collaborate`}
                tooltip="Share link permissions"
              >
                <UsersIcon className={iconClass} />
              </IconLink>
            </>
          )}
          {link.owner._id === orgId && !link.deleted && isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Transfer ${link.title}`}
                  onClick={onTransfer}
                >
                  <UserPlusIcon className={iconClass} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                Transfer ownership
              </TooltipContent>
            </Tooltip>
          )}
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${link.title}`}
                    disabled={link.owner._id !== orgId || link.deleted}
                    onClick={onDelete}
                  >
                    <Trash2Icon />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                {link.deleted
                  ? 'Link is deleted'
                  : link.owner._id !== orgId
                    ? 'Only the owning organization can delete this link'
                    : 'Delete link'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
