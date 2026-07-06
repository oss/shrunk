import { useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { CirclePlusIcon, PlusCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateAccessToken,
  getAccessTokens,
  getValidAccessTokenPermissions,
} from '@/api/organization';
import AccessTokenCard from '@/components/access-token-card';
import { AccessTokenData } from '@/interfaces/access-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type RouteParams = {
  id: string;
};

type IOrganizationToken = RouteComponentProps<RouteParams>;

function OrganizationToken(props: IOrganizationToken) {
  const [accessTokens, setAccessTokens] = useState<AccessTokenData[]>([]);
  const [validPermissions, setValidPermissions] = useState<string[]>([]);
  const [isGeneratorDrawerOpen, setIsGeneratorDrawerOpen] =
    useState<boolean>(false);
  const [newAccessToken, setNewAccessToken] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    const fetchOrganization = async () => {
      const accessTokensData = (await getAccessTokens(
        props.match.params.id,
      )) as AccessTokenData[];
      setAccessTokens(accessTokensData);
    };

    const fetchValidPermissions = async () => {
      const data = await getValidAccessTokenPermissions();
      setValidPermissions(data);
    };

    fetchValidPermissions();
    fetchOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const token = await generateAccessToken(
        title,
        description,
        selectedPermissions,
        props.match.params.id,
      );
      setNewAccessToken(token);
      setTitle('');
      setDescription('');
      setSelectedPermissions([]);
      setIsGeneratorDrawerOpen(false);
    } catch {
      toast.error(
        'There was an error generating your access token. Please try again.',
      );
    }
  };

  const refreshAccessTokens = async () => {
    const accessTokensData = (await getAccessTokens(
      props.match.params.id,
    )) as AccessTokenData[];
    setAccessTokens(accessTokensData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="app-page-heading">Access Tokens</h1>
        <Button onClick={() => setIsGeneratorDrawerOpen(true)}>
          <CirclePlusIcon />
          Generate
        </Button>
      </div>

      <div className="space-y-3">
        {accessTokens.map((token) => (
          <AccessTokenCard key={token.token} accessTokenData={token} />
        ))}
        {accessTokens.length === 0 && (
          <p className="text-sm text-muted-foreground">No access tokens.</p>
        )}
      </div>

      <Sheet
        open={isGeneratorDrawerOpen}
        onOpenChange={setIsGeneratorDrawerOpen}
      >
        <SheetContent className="w-full sm:max-w-[720px]">
          <SheetHeader>
            <SheetTitle>Access Token</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <Alert>
              <AlertTitle>Secure your data.</AlertTitle>
              <AlertDescription>
                Keeping your access token private is your responsibility. We
                salt and use Argon2, a quantum-safe and award-winning key
                derivation function, to encrypt your access token and store it
                in our database.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="org-token-title">Title</Label>
              <Input
                id="org-token-title"
                placeholder="What is the name of your project?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-token-description">Description</Label>
              <Textarea
                id="org-token-description"
                placeholder="What are you using this token for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid gap-3">
                {validPermissions.map((permission) => (
                  <label
                    key={permission}
                    className="flex items-center gap-2 text-sm leading-none font-medium"
                  >
                    <Checkbox
                      checked={selectedPermissions.includes(permission)}
                      onCheckedChange={(checked) => {
                        setSelectedPermissions((prev) =>
                          checked
                            ? [...prev, permission]
                            : prev.filter((p) => p !== permission),
                        );
                      }}
                    />
                    {permission}
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={onGenerate} className="w-full">
              <PlusCircleIcon />
              Generate
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={newAccessToken !== null}
        onOpenChange={(open) => {
          if (!open) setNewAccessToken(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Token Generated</DialogTitle>
            <DialogDescription>
              Your access token has been generated. Please copy it and store it
              securely. It is impossible to retrieve it again through this
              website.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(newAccessToken as string);
                refreshAccessTokens();
                toast.success('Access token copied to clipboard');
                setNewAccessToken(null);
              }}
            >
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withRouter(OrganizationToken);
