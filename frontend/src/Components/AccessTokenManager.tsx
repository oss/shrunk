import { useEffect, useId, useState } from 'react';
import { CirclePlusIcon, PlusCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import { getValidAccessTokenPermissions } from '@/Api/Organization';
import { getErrorMessage } from '@/Api/Client';
import AccessTokenCard from '@/Components/AccessTokenCard';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/Components/ui/sheet';
import { Textarea } from '@/Components/ui/textarea';
import { AccessTokenData } from '@/Interfaces/AccessToken';

interface TokenInput {
  title: string;
  description: string;
  permissions: string[];
}

interface Props {
  heading: string;
  tokenLabel: string;
  loadTokens: () => Promise<AccessTokenData[]>;
  generateToken: (input: TokenInput) => Promise<string>;
}

export default function AccessTokenManager({
  heading,
  tokenLabel,
  loadTokens,
  generateToken,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const [tokens, setTokens] = useState<AccessTokenData[]>([]);
  const [validPermissions, setValidPermissions] = useState<string[]>([]);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([loadTokens(), getValidAccessTokenPermissions()])
      .then(([loadedTokens, loadedPermissions]) => {
        setTokens(loadedTokens);
        setValidPermissions(loadedPermissions);
      })
      .catch((error) =>
        toast.error(
          getErrorMessage(
            error,
            `Failed to load ${tokenLabel.toLowerCase()}s.`,
          ),
        ),
      );
  }, [loadTokens, tokenLabel]);

  const onGenerate = async () => {
    if (!title.trim()) {
      toast.error('You must give this a title');
      return;
    }
    if (!description.trim()) {
      toast.error('What are you using this project for?');
      return;
    }

    try {
      const token = await generateToken({ title, description, permissions });
      setNewToken(token);
      setTitle('');
      setDescription('');
      setPermissions([]);
      setGeneratorOpen(false);
      setTokens(await loadTokens());
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          `Failed to generate ${tokenLabel.toLowerCase()}.`,
        ),
      );
    }
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
