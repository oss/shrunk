import { ArrowRightLeftIcon, Trash2Icon, UsersIcon, XIcon } from 'lucide-react';
import { motion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BulkAction {
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

interface MultiLinkSelectPopupProps {
  selectedCount: number;
  onClear: () => void;
  onShare: BulkAction;
  onDelete: BulkAction;
  onTransfer: BulkAction;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  toggleVisibleSelection: (checked: boolean) => void;
  visibleCheckedCount: number;
  totalLinks: number | undefined;
}

export default function MultiLinkSelectPopup({
  selectedCount,
  onClear,
  onShare,
  onDelete,
  onTransfer,
  allVisibleSelected,
  someVisibleSelected,
  toggleVisibleSelection,
  visibleCheckedCount,
  totalLinks,
}: MultiLinkSelectPopupProps) {
  if (selectedCount === 0) return null;

  const tooltipText = (
    fallback: string,
    disabled?: boolean,
    disabledReason?: string,
  ) => (disabled ? disabledReason : fallback);

  return (
    <TooltipProvider>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg"
      >
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Checkbox
                  aria-label="Select all visible links"
                  checked={
                    allVisibleSelected
                      ? true
                      : someVisibleSelected
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={(value) => {
                    toggleVisibleSelection(value === true);
                  }}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
              {someVisibleSelected
                ? 'Select all visible links'
                : 'Deselect all visible links'}
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="text-sm font-semibold whitespace-nowrap">
          {visibleCheckedCount} of {totalLinks} selected on this page
        </span>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Share selected links"
                  disabled={onShare.disabled}
                  onClick={onShare.onClick}
                >
                  <UsersIcon />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent
              className={
                onShare.disabled
                  ? ''
                  : 'bg-black text-white dark:bg-white dark:text-black'
              }
            >
              {tooltipText(
                'Share selected links',
                onShare.disabled,
                onShare.disabledReason,
              )}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Transfer selected links"
                  disabled={onTransfer.disabled}
                  onClick={onTransfer.onClick}
                >
                  <ArrowRightLeftIcon />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent
              className={
                onTransfer.disabled
                  ? ''
                  : 'bg-black text-white dark:bg-white dark:text-black'
              }
            >
              {tooltipText(
                'Transfer selected links',
                onTransfer.disabled,
                onTransfer.disabledReason,
              )}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete selected links"
                  disabled={onDelete.disabled}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={onDelete.onClick}
                >
                  <Trash2Icon />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent
              className={
                onDelete.disabled
                  ? ''
                  : 'bg-black text-white dark:bg-white dark:text-black'
              }
            >
              {tooltipText(
                'Delete selected links',
                onDelete.disabled,
                onDelete.disabledReason,
              )}
            </TooltipContent>
          </Tooltip>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Clear selected links"
            onClick={onClear}
          >
            <XIcon />
          </Button>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
