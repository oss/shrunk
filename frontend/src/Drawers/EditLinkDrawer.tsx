import dayjs from 'dayjs';
import {
  CalendarIcon,
  CircleAlertIcon,
  SaveIcon,
  TrashIcon,
  XIcon,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { deleteLink, isValidAlias, reverLinkExpirationDate } from '@/Api/Links';
import { serverValidateLongUrl } from '@/Api/Validators';
import useDebounce from '@/Lib/Hooks/useDebounce';

import { EditLinkValues, Link } from '@/Interfaces/Link';
import { Button } from '@/Components/ui/button';
import { Calendar } from '@/Components/ui/calendar';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/Components/ui/popover';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/Components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/Components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/Components/ui/alert-dialog';

export interface Props {
  visible: boolean;
  userPrivileges: Set<string>;
  netid: string;
  linkInfo: Link;
  onOk: (values: EditLinkValues) => void;
  onCancel: () => void;
}

type LongUrlValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export const EditLinkDrawer: React.FC<Props> = (props) => {
  const navigate = useNavigate();

  const mayEditOwner =
    (props.netid === props.linkInfo.owner._id ||
      props.userPrivileges.has('admin')) &&
    props.linkInfo.owner.type !== 'org';

  const isTrackingPixelLink = props.linkInfo.is_tracking_pixel_link;

  const existingExpiry = props.linkInfo.expiration_time
    ? dayjs(props.linkInfo.expiration_time)
    : null;

  const [title, setTitle] = useState(props.linkInfo.title || '');
  const [longUrl, setLongUrl] = useState(props.linkInfo.long_url || '');
  const [alias, setAlias] = useState(props.linkInfo.alias || '');
  const [ownerInput, setOwnerInput] = useState(props.linkInfo.owner._id || '');
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    existingExpiry ? existingExpiry.toDate() : undefined,
  );
  const [expirationTime, setExpirationTime] = useState(
    existingExpiry ? existingExpiry.format('HH:mm') : '',
  );
  const [longUrlValidation, setLongUrlValidation] =
    useState<LongUrlValidationStatus>('idle');
  const [longUrlValidationMessage, setLongUrlValidationMessage] = useState('');
  const longUrlValidationVersionRef = useRef(0);
  const debouncedLongUrl = useDebounce(longUrl.trim(), 400);
  const [showOwnerConfirm, setShowOwnerConfirm] = useState(false);

  const currDate = new Date();
  const isExpired =
    props.linkInfo.expiration_time !== null &&
    new Date(props.linkInfo.expiration_time) < new Date(currDate.toISOString());
  const isDeleted = props.linkInfo.deleted;

  const [isRestorable, setIsRestorable] = useState(false);
  useEffect(() => {
    isValidAlias(props.linkInfo.alias).then((value: boolean) => {
      setIsRestorable(value);
    });
  }, [props.linkInfo.alias]);

  useEffect(() => {
    const validationVersion = longUrlValidationVersionRef.current + 1;
    longUrlValidationVersionRef.current = validationVersion;

    if (!props.visible || isTrackingPixelLink || !debouncedLongUrl) {
      setLongUrlValidation('idle');
      setLongUrlValidationMessage('');
      return;
    }

    if (debouncedLongUrl === (props.linkInfo.long_url || '').trim()) {
      setLongUrlValidation('valid');
      setLongUrlValidationMessage('');
      return;
    }

    try {
      const parsedUrl = new URL(debouncedLongUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      setLongUrlValidation('invalid');
      setLongUrlValidationMessage('Enter a valid URL');
      return;
    }

    setLongUrlValidation('validating');
    setLongUrlValidationMessage('');
    serverValidateLongUrl(debouncedLongUrl)
      .then(() => {
        if (longUrlValidationVersionRef.current !== validationVersion) return;
        setLongUrlValidation('valid');
      })
      .catch((error: unknown) => {
        if (longUrlValidationVersionRef.current !== validationVersion) return;
        setLongUrlValidation('invalid');
        setLongUrlValidationMessage(
          error instanceof Error && error.message
            ? error.message
            : 'Invalid URL',
        );
      });
  }, [
    debouncedLongUrl,
    isTrackingPixelLink,
    props.linkInfo.long_url,
    props.visible,
  ]);

  const handleDelete = async () => {
    try {
      await deleteLink(props.linkInfo._id);
      toast.success('Link deleted successfully');
      navigate('/app/dash');
    } catch {
      toast.error('Failed to delete link');
    }
  };

  const handleRevert = async () => {
    try {
      await reverLinkExpirationDate(props.linkInfo._id);
      toast.success('Link restored successfully');
    } catch {
      toast.error('Failed to restore link');
    }
  };

  const handleSubmit = async () => {
    if (!alias.trim()) {
      toast.error('Please input an alias.');
      return;
    }
    if (alias.trim().length < 5) {
      toast.error('Aliases may be no shorter than 5 characters.');
      return;
    }

    let expirationValue: dayjs.Dayjs | null = null;
    if (expirationDate) {
      expirationValue = dayjs(
        `${dayjs(expirationDate).format('YYYY-MM-DD')}T${expirationTime || '00:00'}`,
      );
    }

    const values: EditLinkValues = {
      title,
      long_url: isTrackingPixelLink ? props.linkInfo.long_url : longUrl,
      expiration_time: expirationValue,
      owner: {
        _id: ownerInput,
        type: 'netid',
      },
      alias,
    };

    if (!isTrackingPixelLink && !values.long_url) {
      toast.error('Please input a long URL.');
      return;
    }

    if (!isTrackingPixelLink) {
      try {
        await serverValidateLongUrl(values.long_url);
      } catch {
        toast.error('Invalid URL');
        return;
      }
    }

    props.onOk(values);
  };

  const onSave = () => {
    if (ownerInput !== props.linkInfo.owner._id) {
      setShowOwnerConfirm(true);
    } else {
      handleSubmit();
    }
  };

  const originalOwnerLabel =
    props.linkInfo.owner.type === 'org'
      ? props.linkInfo.owner.org_name
      : props.linkInfo.owner._id;

  return (
    <TooltipProvider>
      <Sheet
        open={props.visible}
        onOpenChange={(open) => {
          if (!open) {
            props.onCancel();
          }
        }}
      >
        <SheetContent
          className="w-full sm:max-w-[720px]"
          showCloseButton={false}
        >
          <SheetHeader className="flex-row items-start justify-between gap-3 space-y-0 text-left">
            <div className="flex min-w-0 items-center gap-2">
              <SheetClose className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-secondary">
                <XIcon className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
              <SheetTitle className="min-w-0">Edit link</SheetTitle>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {isExpired && !isRestorable && (
                <Button onClick={handleRevert}>Restore</Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isDeleted || isExpired}
                  >
                    <TrashIcon />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you sure you want to delete this link?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Yes
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                onClick={onSave}
                disabled={
                  !isTrackingPixelLink &&
                  (longUrlValidation === 'validating' ||
                    longUrlValidation === 'invalid')
                }
              >
                <SaveIcon />
                Save
              </Button>
            </div>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-alias">Alias</Label>
                <Input
                  id="edit-alias"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  disabled={
                    isTrackingPixelLink ||
                    (!props.userPrivileges.has('admin') &&
                      !props.userPrivileges.has('power_user'))
                  }
                />
              </div>
            </div>

            {!isTrackingPixelLink && (
              <div className="space-y-2">
                <Label htmlFor="edit-url">Long URL</Label>
                <Input
                  id="edit-url"
                  value={longUrl}
                  aria-invalid={longUrlValidation === 'invalid'}
                  aria-describedby="edit-url-validation"
                  className={
                    longUrlValidation === 'invalid'
                      ? 'border-destructive focus-visible:ring-destructive'
                      : undefined
                  }
                  onChange={(e) => {
                    longUrlValidationVersionRef.current += 1;
                    setLongUrl(e.target.value);
                    setLongUrlValidation(
                      e.target.value.trim() ? 'validating' : 'idle',
                    );
                    setLongUrlValidationMessage('');
                  }}
                />
                <div id="edit-url-validation" aria-live="polite">
                  {longUrlValidation === 'validating' && (
                    <p className="text-sm text-muted-foreground">
                      Checking URL...
                    </p>
                  )}
                  {longUrlValidation === 'invalid' && (
                    <p className="text-sm text-destructive">
                      {longUrlValidationMessage}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-owner">Owner</Label>
                {mayEditOwner ? (
                  <Input
                    id="edit-owner"
                    placeholder="NetID"
                    value={ownerInput}
                    onChange={(e) => setOwnerInput(e.target.value)}
                  />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="edit-owner"
                        placeholder="NetID"
                        value={originalOwnerLabel}
                        disabled
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      This link is owned by an organization, please go to the
                      organization&rsquo;s dashboard to edit it.
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {!isTrackingPixelLink && (
                <div className="space-y-2">
                  <Label htmlFor="edit-expiration">Expiration time</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="edit-expiration"
                          type="button"
                          variant="outline"
                          className="h-9 flex-1 justify-start px-3 text-left text-sm font-normal"
                        >
                          <CalendarIcon className="size-4 shrink-0" />
                          <span
                            className={
                              expirationDate ? '' : 'text-muted-foreground'
                            }
                          >
                            {expirationDate
                              ? dayjs(expirationDate).format('YYYY-MM-DD')
                              : 'Pick a date'}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={expirationDate}
                          onSelect={setExpirationDate}
                          defaultMonth={expirationDate}
                          disabled={(date: Date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      aria-label="Expiration time"
                      type="time"
                      value={expirationTime}
                      onChange={(e) => setExpirationTime(e.target.value)}
                      disabled={!expirationDate}
                      className="h-9 w-28 px-3 text-sm"
                    />
                    {expirationDate && (
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label="Clear expiration"
                        className="h-9 w-9 shrink-0 px-0"
                        onClick={() => {
                          setExpirationDate(undefined);
                          setExpirationTime('');
                        }}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <AlertDialog
            open={showOwnerConfirm}
            onOpenChange={setShowOwnerConfirm}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Link owner modification</AlertDialogTitle>
                <AlertDialogDescription>
                  <CircleAlertIcon className="mr-2 inline h-4 w-4" />
                  You are about to modify the link owner. Do you wish to
                  proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowOwnerConfirm(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowOwnerConfirm(false);
                    handleSubmit();
                  }}
                >
                  Yes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
};
