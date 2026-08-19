import dayjs from 'dayjs';
import { CalendarIcon, SendHorizontalIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createLink } from '@/Api/Links';
import useDebounce from '@/Lib/Hooks/useDebounce';
import {
  serverValidateDuplicateAlias,
  serverValidateLongUrl,
  serverValidateReservedAlias,
} from '@/Api/Validators';
import { useFeatureFlags } from '@/Contexts/FeatureFlags';
import { FeatureFlags } from '@/Interfaces/App';
import { Organization } from '@/Interfaces/Organizations';
import { Button } from '@/Components/ui/button';
import { ButtonGroup } from '@/Components/ui/button-group';
import { Calendar } from '@/Components/ui/calendar';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/Components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/Components/ui/sheet';

interface Props {
  title: string;
  visible: boolean;
  onCancel: () => void;
  userPrivileges: Set<string>;
  onFinish: () => Promise<void>;
  userOrgs: Organization[];
  org_id?: string;
}

type LongUrlValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

const createDrawerInactiveSegmentClass =
  'border border-border bg-muted text-foreground shadow-none hover:bg-accent hover:text-foreground';
const createDrawerActiveSegmentClass =
  'border border-primary bg-primary text-primary-foreground shadow-none hover:bg-primary/90 hover:text-primary-foreground';
const createDrawerSegmentButtonClass =
  'h-9 min-w-fit px-3 text-sm font-semibold';

export default function CreateLinkDrawer(props: Props): React.JSX.Element {
  const featureFlags: FeatureFlags = useFeatureFlags();
  const [loading, setLoading] = useState<boolean>(false);
  const [linkCreationMode, setLinkCreationMode] = useState<'url' | 'pixel'>(
    'url',
  );

  const [linkTitle, setLinkTitle] = useState('');
  const [longUrl, setLongUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [domain, setDomain] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    undefined,
  );
  const [expirationTime, setExpirationTime] = useState('');
  const [trackingExtension, setTrackingExtension] = useState('.png');
  const [longUrlValidation, setLongUrlValidation] =
    useState<LongUrlValidationStatus>('idle');
  const [longUrlValidationMessage, setLongUrlValidationMessage] = useState('');
  const longUrlValidationVersionRef = useRef(0);
  const debouncedLongUrl = useDebounce(longUrl.trim(), 400);

  const mayUseCustomAliases =
    props.userPrivileges.has('power_user') || props.userPrivileges.has('admin');

  const uniqueDomains: string[] = [];
  if (props.userOrgs.length !== 0) {
    props.userOrgs.forEach((org) => {
      if (org.domains !== undefined) {
        org.domains.forEach((domainName: string) => {
          if (!uniqueDomains.includes(domainName)) {
            uniqueDomains.push(domainName);
          }
        });
      }
    });
  }

  const isCreatingTrackingPixel = linkCreationMode === 'pixel';
  const isCreateButtonDisabled =
    loading ||
    (!isCreatingTrackingPixel &&
      (longUrlValidation === 'validating' || longUrlValidation === 'invalid'));

  const resetForm = () => {
    longUrlValidationVersionRef.current += 1;
    setLinkTitle('');
    setLongUrl('');
    setAlias('');
    setDomain('');
    setExpirationDate(undefined);
    setExpirationTime('');
    setTrackingExtension('.png');
    setLinkCreationMode('url');
    setLongUrlValidation('idle');
    setLongUrlValidationMessage('');
  };

  useEffect(() => {
    const trimmedLongUrl = debouncedLongUrl;
    const validationVersion = longUrlValidationVersionRef.current + 1;
    longUrlValidationVersionRef.current = validationVersion;

    if (isCreatingTrackingPixel || !trimmedLongUrl) {
      setLongUrlValidation('idle');
      setLongUrlValidationMessage('');
      return;
    }

    try {
      const parsedUrl = new URL(trimmedLongUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('URL must start with http:// or https://');
      }
    } catch {
      setLongUrlValidation('invalid');
      setLongUrlValidationMessage('Enter a valid URL');
      return;
    }

    setLongUrlValidation('validating');
    setLongUrlValidationMessage('');

    serverValidateLongUrl(trimmedLongUrl)
      .then(() => {
        if (longUrlValidationVersionRef.current !== validationVersion) return;
        setLongUrlValidation('valid');
        setLongUrlValidationMessage('');
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
  }, [debouncedLongUrl, isCreatingTrackingPixel]);

  const onSubmitClick = async (): Promise<void> => {
    resetForm();
    await props.onFinish();
    setLoading(false);
  };

  const onCreateLink = async (): Promise<void> => {
    if (!isCreatingTrackingPixel && !longUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    const resolvedAlias = alias.trim() || undefined;
    if (resolvedAlias) {
      try {
        await serverValidateReservedAlias(resolvedAlias);
      } catch {
        toast.error('This alias cannot be used');
        return;
      }
      try {
        await serverValidateDuplicateAlias(resolvedAlias);
      } catch {
        toast.error('This alias is already taken');
        return;
      }
    }

    if (resolvedAlias) {
      try {
        await serverValidateDuplicateAlias(resolvedAlias);
      } catch {
        toast.error('This alias is already taken');
        return;
      }
    }

    if (!isCreatingTrackingPixel) {
      try {
        await serverValidateLongUrl(longUrl);
      } catch {
        toast.error('Invalid URL');
        return;
      }
    }

    setLoading(true);
    try {
      await createLink(
        isCreatingTrackingPixel,
        linkTitle || (isCreatingTrackingPixel ? '' : 'No title provided'),
        isCreatingTrackingPixel ? '' : longUrl,
        resolvedAlias,
        expirationDate
          ? dayjs(
              `${dayjs(expirationDate).format('YYYY-MM-DD')}T${expirationTime || '00:00'}`,
            )
          : undefined,
        isCreatingTrackingPixel
          ? (trackingExtension as '.png' | '.gif')
          : undefined,
        props.org_id,
      );
    } catch (e: any) {
      toast.error(e.message);
      setLoading(false);
      return;
    }

    onSubmitClick();
  };

  return (
    <Sheet
      open={props.visible}
      onOpenChange={(open) => !open && props.onCancel()}
    >
      <SheetContent className="w-full sm:max-w-[720px]" showCloseButton={false}>
        <SheetHeader className="flex-row items-start justify-between gap-3 space-y-0 text-left">
          <div className="flex min-w-0 items-center gap-2">
            <SheetClose className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-secondary">
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
            <SheetTitle className="min-w-0">{props.title}</SheetTitle>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button onClick={onCreateLink} disabled={isCreateButtonDisabled}>
              <SendHorizontalIcon />
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="link-title">Name</Label>
            <Input
              id="link-title"
              placeholder="My awesome link that will be advertised somewhere"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
            />
          </div>

          {!isCreatingTrackingPixel && (
            <div className="space-y-2">
              <Label htmlFor="link-url">Original URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.rutgers.edu"
                value={longUrl}
                aria-invalid={longUrlValidation === 'invalid'}
                aria-describedby="link-url-validation"
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
              <div id="link-url-validation" aria-live="polite">
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

          <p className="mb-2 text-xl font-semibold text-foreground">
            Advanced Options
          </p>

          {!isCreatingTrackingPixel && mayUseCustomAliases && (
            <div className="space-y-2">
              <label
                htmlFor="link-alias"
                className="text-sm leading-none font-medium"
              >
                New Shortened URL
              </label>
              <div className="flex items-center rounded-md border border-input bg-background text-sm">
                <span className="border-r border-input px-3 py-2 text-muted-foreground">
                  {window.location.host}/
                </span>
                <input
                  id="link-alias"
                  className="flex-1 bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground"
                  placeholder="If left blank, it will be randomized"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {!isCreatingTrackingPixel &&
              featureFlags.domains &&
              mayUseCustomAliases &&
              uniqueDomains.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="link-domain">Domain</Label>
                  <Select value={domain} onValueChange={setDomain}>
                    <SelectTrigger id="link-domain">
                      <SelectValue placeholder="Select a domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueDomains.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            {featureFlags.trackingPixel && (
              <div className="space-y-2">
                <Label htmlFor="link-type-url">Link Type</Label>
                <ButtonGroup className="w-full">
                  <Button
                    id="link-type-url"
                    type="button"
                    variant={linkCreationMode === 'url' ? 'default' : 'outline'}
                    onClick={() => setLinkCreationMode('url')}
                    className={`flex-1 ${createDrawerSegmentButtonClass} ${linkCreationMode === 'url' ? createDrawerActiveSegmentClass : createDrawerInactiveSegmentClass}`}
                  >
                    URL
                  </Button>
                  <Button
                    id="link-type-pixel"
                    type="button"
                    variant={
                      linkCreationMode === 'pixel' ? 'default' : 'outline'
                    }
                    onClick={() => setLinkCreationMode('pixel')}
                    className={`flex-1 ${createDrawerSegmentButtonClass} ${linkCreationMode === 'pixel' ? createDrawerActiveSegmentClass : createDrawerInactiveSegmentClass}`}
                  >
                    Tracking Pixel
                  </Button>
                </ButtonGroup>
              </div>
            )}

            {isCreatingTrackingPixel && (
              <div className="space-y-2">
                <Label htmlFor="tracking-png">Image Type</Label>
                <ButtonGroup className="w-full">
                  <Button
                    id="tracking-png"
                    type="button"
                    variant={
                      trackingExtension === '.png' ? 'default' : 'outline'
                    }
                    onClick={() => setTrackingExtension('.png')}
                    className="flex-1 border-0"
                  >
                    PNG
                  </Button>
                  <Button
                    id="tracking-gif"
                    type="button"
                    variant={
                      trackingExtension === '.gif' ? 'default' : 'outline'
                    }
                    onClick={() => setTrackingExtension('.gif')}
                    className="flex-1 border-0"
                  >
                    GIF
                  </Button>
                </ButtonGroup>
              </div>
            )}

            {!isCreatingTrackingPixel && (
              <div className="space-y-2">
                <Label htmlFor="link-expiration">Expiration time</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="link-expiration"
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
      </SheetContent>
    </Sheet>
  );
}
