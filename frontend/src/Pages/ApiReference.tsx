/**
 * Implements the [[ApiReference]] component
 */
import { AnchorHTMLAttributes, ReactNode } from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronRightIcon } from 'lucide-react';

import { CodeBlock } from '@/Components/CodeBlock';
import { cn } from '@/Lib/Utils';

type ApiReferenceItem = {
  key: string;
  label: string;
  children: ReactNode;
};

type TextProps = {
  children: ReactNode;
  className?: string;
  code?: boolean;
  type?: 'secondary';
};

type TitleProps = {
  children: ReactNode;
  className?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
};

type BaseProps = {
  children: ReactNode;
  className?: string;
};

type DescriptionListProps = BaseProps & {
  column?: number;
  bordered?: boolean;
};

type RowProps = BaseProps & {
  gutter?: number | [number, number];
  align?: string;
  wrap?: boolean;
};

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
};

function TypographyRoot({ children, className }: BaseProps) {
  return (
    <div className={cn('space-y-1.5 bg-background text-foreground', className)}>
      {children}
    </div>
  );
}

function TypographyTitle({ children, className, level = 1 }: TitleProps) {
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
  const titleClasses = {
    1: 'text-4xl font-bold tracking-normal text-foreground',
    2: 'text-[2.25rem] leading-tight font-bold tracking-normal text-foreground',
    3: 'text-[1.9rem] leading-tight font-bold tracking-normal text-foreground',
    4: 'text-[1.05rem] font-semibold tracking-normal text-foreground',
    5: 'text-base font-semibold tracking-normal text-foreground',
    6: 'text-sm font-semibold tracking-tight text-foreground',
  };

  return <Tag className={cn(titleClasses[level], className)}>{children}</Tag>;
}

function TypographyParagraph({ children, className, code }: TextProps) {
  if (code) {
    return (
      <CodeBlock
        className={cn(
          'w-fit rounded-sm border border-border bg-muted px-2 py-1 text-[0.95rem] text-foreground',
          className,
        )}
      >
        {children}
      </CodeBlock>
    );
  }

  return (
    <p className={cn('text-[1.02rem] leading-8 text-foreground', className)}>
      {children}
    </p>
  );
}

function TypographyText({ children, className, code, type }: TextProps) {
  if (code) {
    return (
      <code
        className={cn(
          'rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.92rem] text-foreground',
          className,
        )}
      >
        {children}
      </code>
    );
  }

  return (
    <span
      className={cn(type === 'secondary' && 'text-muted-foreground', className)}
    >
      {children}
    </span>
  );
}

function TypographyLink({ children, className, ...props }: LinkProps) {
  const rel = props.target === '_blank' ? 'noreferrer' : props.rel;

  return (
    <a
      className={cn(
        'text-primary underline decoration-primary underline-offset-2 hover:text-primary/80 dark:text-foreground dark:hover:text-foreground',
        className,
      )}
      {...props}
      rel={rel}
    >
      {children}
    </a>
  );
}

const Typography = Object.assign(TypographyRoot, {
  Title: TypographyTitle,
  Paragraph: TypographyParagraph,
  Text: TypographyText,
  Link: TypographyLink,
});

function Flex({ children }: BaseProps) {
  return (
    <CodeBlock className="rounded-sm border border-border bg-muted px-6 py-6 text-[0.95rem] leading-8 text-foreground">
      {children}
    </CodeBlock>
  );
}

function DescriptionList({ children, className }: DescriptionListProps) {
  return (
    <dl className={cn('divide-y divide-border', className)}>{children}</dl>
  );
}

function DescriptionItem({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 py-5 sm:grid-cols-[minmax(0,22rem)_1fr] sm:items-start">
      <dt>{label}</dt>
      <dd className="leading-7 text-foreground">{children}</dd>
    </div>
  );
}

const Descriptions = Object.assign(DescriptionList, {
  Item: DescriptionItem,
});

function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-border', className)} />;
}

function Row({ children }: RowProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-3">{children}</span>
  );
}

function Col({ children }: BaseProps) {
  return <span>{children}</span>;
}

function Collapse({
  items,
  className,
}: {
  items: ApiReferenceItem[];
  className?: string;
}) {
  return (
    <AccordionPrimitive.Root
      type="multiple"
      className={cn(
        'w-full overflow-hidden rounded-md border border-border',
        className,
      )}
    >
      {items.map((item) => (
        <AccordionPrimitive.Item
          key={item.key}
          value={item.key}
          className="border-b border-border last:border-b-0"
        >
          <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
              aria-label={item.label}
              className="group flex w-full items-center gap-3 px-5 py-4 text-left text-[1.05rem] font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
              <span>{item.label}</span>
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden border-t border-border text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="space-y-5 px-5 pt-10 pb-14">{item.children}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}

type BulkOperationReferenceProps = {
  apiUrl: string;
  action: 'share' | 'transfer' | 'delete';
};

function BulkOperationReference({
  apiUrl,
  action,
}: BulkOperationReferenceProps) {
  const details = {
    share: {
      title: 'Share Links in Bulk',
      description: 'Adds or removes a viewer or editor from multiple links',
      endpoint: 'acl_bulk',
      failureMessage: 'Unable to share one or more links.',
      permission: 'The signed-in user must be able to edit every link.',
      body: `{
  "link_ids": ["<link_id>", "<link_id>"],
  "entry": { "_id": "<netid_or_org_id>", "type": "netid" },
  "acl": "viewers",
  "action": "add"
}`,
    },
    transfer: {
      title: 'Transfer Links in Bulk',
      description: 'Transfers multiple links to one user or organization',
      endpoint: 'transfer_bulk',
      failureMessage: 'Unable to transfer one or more links.',
      permission: 'The signed-in user must own every link.',
      body: `{
  "link_ids": ["<link_id>", "<link_id>"],
  "owner": { "_id": "<netid_or_org_id>", "type": "netid" }
}`,
    },
    delete: {
      title: 'Delete Links in Bulk',
      description: 'Soft-deletes multiple links',
      endpoint: 'delete_bulk',
      failureMessage: 'Unable to delete one or more links.',
      permission: 'The signed-in user must own every link.',
      body: `{
  "link_ids": ["<link_id>", "<link_id>"]
}`,
    },
  }[action];

  return (
    <Typography>
      <Typography.Title level={4}>{details.title}</Typography.Title>
      <Typography.Title className="mt-4!" level={5}>
        {details.description}
      </Typography.Title>
      <Typography.Paragraph className="mt-4!">
        This endpoint requires an authenticated Shrunk web session. All links
        are validated in one transaction before the operation is committed. If
        any link is missing, deleted, or unauthorized, none of the selected
        links are changed.
      </Typography.Paragraph>
      <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
      <Typography className="mt-4!">
        <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
          {`curl ${apiUrl}/${details.endpoint} \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -b "session=$SHRUNK_SESSION_COOKIE" \\
  -d '${details.body}'`}
        </Flex>
      </Typography>
      <Typography.Paragraph className="mt-4!">
        Success response
      </Typography.Paragraph>
      <Typography.Paragraph code className="mt-3!">
        204 No Content
      </Typography.Paragraph>
      <Typography.Paragraph className="mt-4!">
        Validation or permission failure
      </Typography.Paragraph>
      <Typography className="mt-4!">
        <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
          {`HTTP 403
{
  "errors": ["${details.failureMessage}"],
  "failed_ids": ["<link_id>", ...]
}`}
        </Flex>
        <Typography.Title className="mt-4!" level={5}>
          Body Parameters
        </Typography.Title>
        <Descriptions column={1} bordered={false} className="mt-4!">
          <Descriptions.Item
            label={
              <Row gutter={8} align="middle" wrap={false}>
                <Col>
                  <Typography.Text code>link_ids</Typography.Text>
                </Col>
                <Col>
                  <Typography.Text type="secondary">string[]</Typography.Text>
                </Col>
                <Col>
                  <Typography.Text type="secondary">Required</Typography.Text>
                </Col>
              </Row>
            }
          >
            A non-empty array of unique link IDs. {details.permission}
          </Descriptions.Item>
        </Descriptions>
        {action === 'share' && (
          <>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={<Typography.Text code>entry</Typography.Text>}
              >
                Required collaborator object with{' '}
                <Typography.Text code>_id</Typography.Text> and{' '}
                <Typography.Text code>type</Typography.Text> set to{' '}
                <Typography.Text code>netid</Typography.Text> or{' '}
                <Typography.Text code>org</Typography.Text>.
              </Descriptions.Item>
              <Descriptions.Item
                label={<Typography.Text code>acl</Typography.Text>}
              >
                Required permission list:{' '}
                <Typography.Text code>viewers</Typography.Text> or{' '}
                <Typography.Text code>editors</Typography.Text>.
              </Descriptions.Item>
              <Descriptions.Item
                label={<Typography.Text code>action</Typography.Text>}
              >
                Required operation: <Typography.Text code>add</Typography.Text>{' '}
                or <Typography.Text code>remove</Typography.Text>.
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
        {action === 'transfer' && (
          <>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={<Typography.Text code>owner</Typography.Text>}
              >
                Required destination object with{' '}
                <Typography.Text code>_id</Typography.Text> and{' '}
                <Typography.Text code>type</Typography.Text> set to{' '}
                <Typography.Text code>netid</Typography.Text> or{' '}
                <Typography.Text code>org</Typography.Text>. Organization
                destinations must be available to the signed-in user.
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
        <Typography.Paragraph className="mt-4!">
          Malformed requests, including empty or duplicate{' '}
          <Typography.Text code>link_ids</Typography.Text>, return{' '}
          <Typography.Text code>400 Bad Request</Typography.Text>.
        </Typography.Paragraph>
      </Typography>
    </Typography>
  );
}

export default function ApiReference() {
  const apiUrl = `${window.location.origin}/api/v1`;
  const coreLinkApiUrl = `${window.location.origin}/api/core/link`;
  const items: ApiReferenceItem[] = [
    {
      key: '1',
      label: 'GET /users',
      children: (
        <Typography>
          <Typography.Title level={4}>List all Users</Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Returns all the Users registered on Shrunk
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">
            Requires a Super Token. Org-scoped tokens will receive a 403.
          </Typography.Paragraph>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl ${apiUrl}/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`{
    "users": [
      {
        "netid": str,
        "organizations": [str, ...],
        "roles": [str, ...],
        "linksCreated": int,
      }
    ]
}`}
            </Flex>
            <Typography.Title className="mt-4!" level={5}>
              Query Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>roles</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Filter users by roles.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>filter</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Only return specified fields in response (comma-separated).
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'links-post',
      label: 'POST /links',
      children: (
        <Typography>
          <Typography.Title level={4}>Create Link</Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Creates a short link within an organization
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl ${apiUrl}/links \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY" \\
  -d '{
    "title": "My Link",
    "long_url": "https://example.com",
    "alias": "exampl",
    "expiration_time": "2025-12-31T23:59:59Z",
    "organization_id": "<org_id>",
    "check_existing": true
  }'`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`{
  "id": str,
  "alias": str,
  "link": str
}`}
            </Flex>
            <Typography.Paragraph className="mt-4!">
              If <Typography.Text code>check_existing</Typography.Text> is true
              and a matching link already exists, the response omits{' '}
              <Typography.Text code>link</Typography.Text> and only contains{' '}
              <Typography.Text code>id</Typography.Text> and{' '}
              <Typography.Text code>alias</Typography.Text>.
            </Typography.Paragraph>
            <Typography.Title className="mt-4!" level={5}>
              Body Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>organization_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required for Super Tokens
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                The organization to create the link in. Required when using a
                Super Token. Optional when using an org-scoped token &mdash;
                defaults to that token&apos;s organization, and must match it if
                provided.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>long_url</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Destination URL for the short link.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>title</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Human-friendly name for the link. Defaults to &quot;Untitled
                Link&quot;.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>alias</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Custom short code (min length 5). If omitted, one is generated.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>expiration_time</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        string (ISO 8601)
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                When the link should expire. Example: 2025-12-31T23:59:59Z
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>check_existing</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        boolean
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                If true, returns an existing link for the given long_url (within
                the same organization) otherwise creates a new one.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'links-get',
      label: 'GET /links/<link_id>',
      children: (
        <Typography>
          <Typography.Title level={4}>Get Link</Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Retrieves a link by ID. Requires a Super Token.
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl ${apiUrl}/links/<link_id> \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`{
  "_id": str,
  "title": str,
  "long_url": str,
  "owner": { "_id": str, "type": "netid" | "org" },
  "created_time": str,
  "expiration_time": str | null,
  "domain": str | null,
  "alias": str,
  "deleted": bool,
  "deletion_info": { "deleted_by": str | null, "delete_time": str | null },
  "editors": [str, ...],
  "viewers": [str, ...],
  "is_tracking_pixel_link": false,
  "visits": int,
  "unique_visits": int
}`}
            </Flex>
            <Typography.Title className="mt-4!" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>link_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                ID of the link to retrieve.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'links-patch',
      label: 'PATCH /links/<link_id>',
      children: (
        <Typography>
          <Typography.Title level={4}>Update Link</Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Updates a link&apos;s deleted state or expiration time. Requires a
            Super Token with{' '}
            <Typography.Text code>update:links</Typography.Text> permission.
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono dark:tw-bg-[#4c4c4c]">
              {`curl ${apiUrl}/links/<link_id> \\
  -X PATCH \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY" \\
  -d '{
    "deleted": false,
    "expiration_time": "2099-01-01T00:00:00Z"
  }'`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="!tw-mt-4">
            Response
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono dark:tw-bg-[#4c4c4c]">
              {`{ "status": "updated" }`}
            </Flex>
            <Typography.Title className="!tw-mt-4" level={5}>
              Body Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>deleted</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        boolean
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Set <Typography.Text code>true</Typography.Text> to soft-delete
                the link; <Typography.Text code>false</Typography.Text> to
                restore a previously deleted link.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="tw-my-2 !tw-mt-4" />
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>expiration_time</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        string (ISO 8601) | null
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                New expiration time for the link. Pass{' '}
                <Typography.Text code>null</Typography.Text> to remove the
                expiration entirely.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'org-links-get',
      label: 'GET /organizations/<org_id>/links/<link_id>',
      children: (
        <Typography>
          <Typography.Title level={4}>Get Organization Link</Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Retrieves a link owned by a specific organization by org ID and link
            ID.
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl ${apiUrl}/organizations/<org_id>/links/<link_id> \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`{
  "_id": str,
  "title": str,
  "long_url": str,
  "owner": { "_id": str, "org_name": str, "type": "org" },
  "created_time": str,
  "expiration_time": str | null,
  "domain": str | null,
  "alias": str,
  "deleted": bool,
  "deletion_info": { "deleted_by": str | null, "delete_time": str | null },
  "editors": [{ "_id": str, "type": "netid" | "org" }, ...],
  "viewers": [{ "_id": str, "type": "netid" | "org" }, ...],
  "is_tracking_pixel_link": false
}`}
            </Flex>
            <Typography.Title className="mt-4!" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>org_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Organization ID owning the link.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>link_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                ID of the link to retrieve.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'org-links-list',
      label: 'GET /organizations/<org_id>/links',
      children: (
        <Typography>
          <Typography.Title level={4}>List Organization Links</Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Returns all links owned by an organization.
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl ${apiUrl}/organizations/<org_id>/links \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`{
  "links": [
    {
      "_id": str,
      "title": str,
      "long_url": str,
      "owner": { "_id": str, "org_name": str, "type": "org" },
      "created_time": str,
      "expiration_time": str | null,
      "domain": str | null,
      "alias": str,
      "deleted": bool,
      "deletion_info": { "deleted_by": str | null, "delete_time": str | null },
      "editors": [{ "_id": str, "type": "netid" | "org" }, ...],
      "viewers": [{ "_id": str, "type": "netid" | "org" }, ...],
      "is_tracking_pixel_link": false
    }
  ]
}`}
            </Flex>
            <Typography.Title className="mt-4!" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>org_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Organization ID whose links to list.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'links-bulk-share',
      label: 'POST /api/core/link/acl_bulk',
      children: (
        <BulkOperationReference apiUrl={coreLinkApiUrl} action="share" />
      ),
    },
    {
      key: 'links-bulk-transfer',
      label: 'POST /api/core/link/transfer_bulk',
      children: (
        <BulkOperationReference apiUrl={coreLinkApiUrl} action="transfer" />
      ),
    },
    {
      key: 'links-bulk-delete',
      label: 'POST /api/core/link/delete_bulk',
      children: (
        <BulkOperationReference apiUrl={coreLinkApiUrl} action="delete" />
      ),
    },
    {
      key: 'visits-post',
      label: 'POST /links/<org_id>/<link_id>/visits',
      children: (
        <Typography>
          <Typography.Title level={4}>
            Fetch visits data with optional query
          </Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Fetch visits of a link
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl ${apiUrl}/links/<org_id>/<link_id>/visits \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY" \\
  -d '{
    "mid": "foo",
    "uid": "bar",
  }'`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`{
  "visits": [
    {
      "_id": str,
      "alias": str,
      "country_code": str | null,
      "link_id": str,
      "mid": str | null,
      "referer": str | null,
      "source": str | null,
      "source_ip": str,
      "state_code": str | null,
      "time": str,
      "tracking_id": str | null,
      "user_agent": str | null,
      "uid": str | null
    }
  ]
}`}
            </Flex>
            <Typography.Title className="mt-4!" level={5}>
              Body Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>mid</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        string | string[]
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Pass in a Mail ID or an array of Mail IDs to fetch visits for.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>uid</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        string | string[]
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Pass in a unique id or an array of User IDs to fetch visits for.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'pixels-post',
      label: 'POST /tracking-pixels',
      children: (
        <Typography>
          <Typography.Title level={4}>Create Tracking Pixel</Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Creates a tracking pixel link within an organization
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl ${apiUrl}/tracking-pixels \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY" \\
  -d '{
    "title": "Newsletter Pixel",
    "tracking_pixel_extension": ".png",
    "organization_id": "<org_id>"
  }'`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`{
  "id": str,
  "alias": str
}`}
            </Flex>
            <Typography.Title className="mt-4!" level={5}>
              Body Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>organization_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required for Super Tokens
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                The organization to create the tracking pixel in. Required when
                using a Super Token. Optional when using an org-scoped token
                &mdash; defaults to that token&apos;s organization, and must
                match it if provided.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>title</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Human-friendly name for the tracking pixel. Defaults to
                &quot;Untitled Link&quot;.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>
                        tracking_pixel_extension
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        string (&quot;.png&quot; | &quot;.gif&quot;)
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                File format for the pixel image. Defaults to .png.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'pixels-get',
      label: 'GET /tracking-pixels/<org_id>/<link_id>',
      children: (
        <Typography>
          <Typography.Title level={4}>Get Tracking Pixel</Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Retrieves a tracking pixel link by organization and link ID
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl ${apiUrl}/tracking-pixels/<org_id>/<link_id> \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`{
  "_id": str,
  "title": str,
  "long_url": str,
  "owner": { "_id": str, "org_name": str, "type": "org" },
  "created_time": str,
  "expiration_time": str | null,
  "domain": str | null,
  "alias": str,
  "deleted": bool,
  "deletion_info": { "deleted_by": str | null, "delete_time": str | null },
  "editors": [{ "_id": str, "type": "netid" | "org" }, ...],
  "viewers": [{ "_id": str, "type": "netid" | "org" }, ...],
  "is_tracking_pixel_link": true
}`}
            </Flex>
            <Typography.Title className="mt-4!" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>org_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Organization ID owning the tracking pixel link.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="my-2 mt-4!" />
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>link_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                ID of the tracking pixel link to retrieve.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'pixels-list',
      label: 'GET /tracking-pixels/<org_id>',
      children: (
        <Typography>
          <Typography.Title level={4}>
            List Organization Tracking Pixels
          </Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Returns all tracking pixel links owned by an organization
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl ${apiUrl}/tracking-pixels/<org_id> \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`{
  "links": [
    {
      "_id": str,
      "title": str,
      "long_url": str,
      "owner": { "_id": str, "org_name": str, "type": "org" },
      "created_time": str,
      "expiration_time": str | null,
      "domain": str | null,
      "alias": str,
      "deleted": bool,
      "deletion_info": { "deleted_by": str | null, "delete_time": str | null },
      "editors": [{ "_id": str, "type": "netid" | "org" }, ...],
      "viewers": [{ "_id": str, "type": "netid" | "org" }, ...],
      "is_tracking_pixel_link": true
    }
  ]
}`}
            </Flex>
            <Typography.Title className="mt-4!" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>org_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Organization ID whose tracking pixel links to list. Must match
                the token&apos;s organization.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'orgs-list',
      label: 'GET /organizations',
      children: (
        <Typography>
          <Typography.Title level={4}>List All Organizations</Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Returns all organizations
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">
            Requires a Super Token. Org-scoped tokens will receive a 403.
          </Typography.Paragraph>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl ${apiUrl}/organizations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`{
  "organizations": [
    {
      "orgId": str,
      "name": str,
      "members": [str, ...]
    }
  ]
}`}
            </Flex>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'orgs-get-netid',
      label: 'GET /organizations/<netid>',
      children: (
        <Typography>
          <Typography.Title level={4}>
            List Organizations By NetID
          </Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Returns all organizations a user is a member of
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">
            Requires a Super Token. Org-scoped tokens will receive a 403.
          </Typography.Paragraph>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl ${apiUrl}/organizations/<netid> \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`{
  "organizations": [
    {
      "orgId": str,
      "name": str,
      "role": str
    }
  ]
}`}
            </Flex>
            <Typography.Title className="mt-4!" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="mt-4!">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>netid</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                NetID of the user whose organizations to list.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'orgs-post',
      label: 'POST /organizations',
      children: (
        <Typography>
          <Typography.Title level={4}>Create Organization</Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Creates a new organization. Requires a Super Token with{' '}
            <Typography.Text code>create:organizations</Typography.Text>{' '}
            permission.
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono dark:tw-bg-[#4c4c4c]">
              {`curl ${apiUrl}/organizations \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY" \\
  -d '{
    "name": "My Organization",
    "owner_netid": "netid123"
  }'`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="!tw-mt-4">
            Response
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono dark:tw-bg-[#4c4c4c]">
              {`{
  "organization": {
    "_id": str,
    "name": str
  }
}`}
            </Flex>
            <Typography.Title className="!tw-mt-4" level={5}>
              Body Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>name</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Name of the organization to create.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="tw-my-2 !tw-mt-4" />
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>owner_netid</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                NetID of the user who will own the organization.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'users-links-get',
      label: 'GET /users/<netid>/links',
      children: (
        <Typography>
          <Typography.Title level={4}>
            List Accessible Links for User
          </Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Returns all non-tracking-pixel links accessible to a user (personal
            and org-owned). Requires a Super Token.
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono dark:tw-bg-[#4c4c4c]">
              {`curl ${apiUrl}/users/<netid>/links \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="!tw-mt-4">
            Response
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono dark:tw-bg-[#4c4c4c]">
              {`{
  "links": [
    {
      "_id": str,
      "title": str,
      "long_url": str,
      "owner": { "_id": str, "type": "netid" | "org" },
      "created_time": str,
      "expiration_time": str | null,
      "domain": str | null,
      "alias": str,
      "deleted": bool,
      "deletion_info": { "deleted_by": str | null, "delete_time": str | null },
      "editors": [str, ...],
      "viewers": [str, ...],
      "is_tracking_pixel_link": false
    }
  ]
}`}
            </Flex>
            <Typography.Title className="!tw-mt-4" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>netid</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                NetID of the user whose accessible links to return.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'links-get-qrcode',
      label: 'GET /links/<link_id>/qrcode',
      children: (
        <Typography>
          <Typography.Title level={4}>Generate QRCode</Typography.Title>
          <Typography.Title className="mt-4!" level={5}>
            Generates and returns a downloadable QR code image by link ID
          </Typography.Title>
          <Typography.Paragraph className="mt-4!">Request</Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              {`curl -O -J ${apiUrl}/links/<link_id>/qrcode \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="mt-4!">
            Response
          </Typography.Paragraph>
          <Typography className="mt-4!">
            <Flex className="overflow-x-auto rounded-md bg-muted p-6 font-mono whitespace-pre">
              PNG Image: alias-qrcode.png
            </Flex>
          </Typography>
        </Typography>
      ),
    },
  ];
  return (
    <div className="-mx-6 min-h-[calc(100dvh-var(--app-header-height,0px))] bg-background px-6 pb-8 text-foreground">
      <div className="mx-auto max-w-[82rem]">
        <div className="space-y-6 pt-0 pb-6">
          <Typography>
            <Typography.Title
              level={1}
              className="app-page-heading m-0 mt-4! text-4xl leading-none font-bold tracking-normal text-foreground"
            >
              <span className="inline bg-background text-foreground">
                API Reference
              </span>
            </Typography.Title>
            <Typography.Title level={2} className="mt-4!">
              Introduction
            </Typography.Title>
            <Typography.Paragraph className="mt-4! max-w-[72rem]">
              This API reference describes the APIs you can use to interact with
              Shrunk. If you have any questions, please email us{' '}
              <Typography.Link
                href="mailto:oss@oss.rutgers.edu"
                target="_blank"
              >
                oss@oss.rutgers.edu
              </Typography.Link>
              .
            </Typography.Paragraph>
            <Typography.Title level={2} className="mt-6!">
              Authentication
            </Typography.Title>
            <Typography.Paragraph className="mt-4! max-w-[78rem]">
              The Shrunk API uses API keys for authentication. Create, manage,
              and learn more about API keys in your{' '}
              <Typography.Link
                href={`${window.location.origin}/app/orgs`}
                target="_blank"
              >
                organization managment page
              </Typography.Link>{' '}
              or the{' '}
              <Typography.Link
                href={`${window.location.origin}/app/admin?tab=super-tokens`}
                target="_blank"
              >
                admin dashboard
              </Typography.Link>
              .
            </Typography.Paragraph>
            <Typography.Paragraph className="mt-4!">
              Authentication is performed via Bearer tokens.
            </Typography.Paragraph>
            <Typography.Paragraph code className="mt-3!">
              Authorization: Bearer SHRUNK_API_KEY
            </Typography.Paragraph>
            <Typography.Paragraph className="mt-5!">
              API Base URL:
            </Typography.Paragraph>
            <Typography.Link href={apiUrl} target="_blank">
              {`${window.location.origin}/api/v1`}
            </Typography.Link>
            .
            <Collapse className="mt-6!" items={items} />
          </Typography>
        </div>
      </div>
    </div>
  );
}
