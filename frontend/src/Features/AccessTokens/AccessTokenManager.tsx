import { useEffect, useId, useState } from 'react';
import { CirclePlusIcon, PlusCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getValidAccessTokenPermissions } from '@/Features/AccessTokens/Api';
import AccessTokenCard from '@/Features/AccessTokens/AccessTokenCard';
import { Alert, AlertDescription, AlertTitle } from '@/Shared/ui/alert';
import { Button } from '@/Shared/ui/button';
import { Checkbox } from '@/Shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Shared/ui/dialog';
import { Input } from '@/Shared/ui/input';
import { Label } from '@/Shared/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/Shared/ui/sheet';
import { Textarea } from '@/Shared/ui/textarea';
import { AccessTokenData } from '@/Features/AccessTokens/Types';

interface TokenInput {
  title: string;
  description: string;
  permissions: string[];
}

interface Props {
  heading: string;
  tokenLabel: string;
  queryKey: unknown[];
  loadTokens: () => Promise<AccessTokenData[]>;
  generateToken: (input: TokenInput) => Promise<string>;
}

export default function AccessTokenManager({
  heading,
  tokenLabel,
  queryKey,
  loadTokens,
  generateToken,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const queryClient = useQueryClient();
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);

  const tokensQuery = useQuery({ queryKey, queryFn: loadTokens });
  const permissionsQuery = useQuery({
    queryKey: ['access-token-permissions'],
    queryFn: getValidAccessTokenPermissions,
  });

  useEffect(() => {
    if (tokensQuery.isError || permissionsQuery.isError) {
      toast.error(`Failed to load ${tokenLabel.toLowerCase()}s`);
    }
  }, [tokensQuery.isError, permissionsQuery.isError, tokenLabel]);

  const generateMutation = useMutation({
    mutationFn: generateToken,
    onSuccess: (token) => {
      setNewToken(token);
      setTitle('');
      setDescription('');
      setPermissions([]);
      setGeneratorOpen(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () =>
      toast.error(`Failed to generate ${tokenLabel.toLowerCase()}`),
  });

  const onGenerate = () => {
    if (!title.trim()) {
      toast.error('You must give this a title');
      return;
    }
    if (!description.trim()) {
      toast.error('What are you using this project for?');
      return;
    }

    generateMutation.mutate({ title, description, permissions });
  };

  const copyToken = async () => {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
      toast.success(`${tokenLabel} copied to clipboard`);
      setNewToken(null);
    } catch {
      toast.error(`Failed to copy ${tokenLabel.toLowerCase()}`);
    }
  };

  const tokens = tokensQuery.data ?? [];
  const validPermissions = permissionsQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="app-page-heading">{heading}</h1>
        <Button
          aria-label={`Generate ${tokenLabel.toLowerCase()}`}
          onClick={() => setGeneratorOpen(true)}
        >
          <CirclePlusIcon />
          Generate
        </Button>
      </div>

      <div className="space-y-3">
        {tokens.map((token) => (
          <AccessTokenCard key={token.id} accessTokenData={token} />
        ))}
        {tokens.length === 0 && (
          <p className="text-sm text-muted-foreground">No access tokens.</p>
        )}
      </div>

      <Sheet open={generatorOpen} onOpenChange={setGeneratorOpen}>
        <SheetContent className="w-full sm:max-w-[720px]">
          <SheetHeader>
            <SheetTitle>{tokenLabel}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <Alert>
              <AlertTitle>Secure your data.</AlertTitle>
              <AlertDescription>
                Keep this token private. It is stored securely and cannot be
                retrieved through this website after it is created.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor={titleId}>Title</Label>
              <Input
                id={titleId}
                placeholder="What is the name of your project?"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={descriptionId}>Description</Label>
              <Textarea
                id={descriptionId}
                placeholder="What are you using this token for?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Permissions</legend>
              <div className="grid gap-3">
                {validPermissions.map((permission) => (
                  <label
                    key={permission}
                    className="flex items-center gap-2 text-sm leading-none font-medium"
                  >
                    <Checkbox
                      aria-label={permission}
                      checked={permissions.includes(permission)}
                      onCheckedChange={(checked) =>
                        setPermissions((current) =>
                          checked
                            ? [...current, permission]
                            : current.filter((item) => item !== permission),
                        )
                      }
                    />
                    {permission}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button onClick={onGenerate} className="w-full">
              <PlusCircleIcon />
              Generate
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={newToken !== null}
        onOpenChange={(open) => !open && setNewToken(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tokenLabel} Generated</DialogTitle>
            <DialogDescription>
              Copy and store it securely. It cannot be retrieved again through
              this website.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={copyToken}>Copy to Clipboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
