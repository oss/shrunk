import dayjs from 'dayjs';
import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { deleteToken } from '@/Features/AccessTokens/Api';
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
} from '@/Shared/ui/alert-dialog';
import { Badge } from '@/Shared/ui/badge';
import { Button } from '@/Shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/Shared/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/Shared/ui/tooltip';
import { AccessTokenData } from '@/Features/AccessTokens/Types';

export default function AccessTokenCard({
  accessTokenData,
}: {
  accessTokenData: AccessTokenData;
}) {
  const [isDeleted, setIsDeleted] = useState(accessTokenData.deleted);

  const deleteMutation = useMutation({
    mutationFn: () => deleteToken(accessTokenData.id),
    onSuccess: () => setIsDeleted(true),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>{accessTokenData.title}</CardTitle>
          <CardDescription>{accessTokenData.description}</CardDescription>
        </div>
        <TooltipProvider>
          <Tooltip>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Delete token"
                    disabled={isDeleted}
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2Icon />
                  </Button>
                </TooltipTrigger>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete access token?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Any integrations using this
                    token will stop working.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteMutation.mutate()}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <dt className="font-medium text-muted-foreground">Permissions</dt>
            <dd className="flex flex-wrap gap-2">
              {accessTokenData.permissions.map((permission: string) => (
                <Badge key={permission} variant="secondary">
                  {permission}
                </Badge>
              ))}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="font-medium text-muted-foreground">Creator</dt>
            <dd>{accessTokenData.created_by}</dd>
          </div>
          <div className="space-y-1">
            <dt className="font-medium text-muted-foreground">Date Created</dt>
            <dd>
              {dayjs(accessTokenData.created_date).format(
                'MMM D, YYYY - h:mm A',
              )}
            </dd>
          </div>
        </dl>
        {deleteMutation.isError ? (
          <p className="text-sm text-muted-foreground">
            Failed to delete token.
          </p>
        ) : null}
        {deleteMutation.isSuccess ? (
          <p className="text-sm text-muted-foreground">
            Token deleted successfully.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
