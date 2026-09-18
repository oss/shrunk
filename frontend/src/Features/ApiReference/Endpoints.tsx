import type { ReactNode } from 'react';

export type EndpointMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type EndpointParameter = {
  name: string;
  type: string;
  requirement: string;
  description: ReactNode;
};

export type EndpointExample = {
  label: string;
  code: string;
  /** 'inline' renders as a small inline code chip instead of a full code block. */
  emphasis?: 'inline';
};

export type EndpointDoc = {
  key: string;
  method: EndpointMethod;
  path: string;
  title: string;
  summary?: ReactNode;
  notes?: ReactNode[];
  examples: EndpointExample[];
  responseNote?: ReactNode;
  parametersHeading?: string;
  parameters?: EndpointParameter[];
  trailingNote?: ReactNode;
};

function bulkOperation(
  coreLinkApiUrl: string,
  action: 'share' | 'transfer' | 'delete',
): EndpointDoc {
  const details = {
    share: {
      key: 'links-bulk-share',
      title: 'Share Links in Bulk',
      summary: 'Adds or removes a viewer or editor from multiple links',
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
      key: 'links-bulk-transfer',
      title: 'Transfer Links in Bulk',
      summary: 'Transfers multiple links to one user or organization',
      endpoint: 'transfer_bulk',
      failureMessage: 'Unable to transfer one or more links.',
      permission: 'The signed-in user must own every link.',
      body: `{
  "link_ids": ["<link_id>", "<link_id>"],
  "owner": { "_id": "<netid_or_org_id>", "type": "netid" }
}`,
    },
    delete: {
      key: 'links-bulk-delete',
      title: 'Delete Links in Bulk',
      summary: 'Soft-deletes multiple links',
      endpoint: 'delete_bulk',
      failureMessage: 'Unable to delete one or more links.',
      permission: 'The signed-in user must own every link.',
      body: `{
  "link_ids": ["<link_id>", "<link_id>"]
}`,
    },
  }[action];

  const parameters: EndpointParameter[] = [
    {
      name: 'link_ids',
      type: 'string[]',
      requirement: 'Required',
      description: `A non-empty array of unique link IDs. ${details.permission}`,
    },
  ];

  if (action === 'share') {
    parameters.push(
      {
        name: 'entry',
        type: '',
        requirement: '',
        description: (
          <>
            Required collaborator object with <code>_id</code> and{' '}
            <code>type</code> set to <code>netid</code> or <code>org</code>.
          </>
        ),
      },
      {
        name: 'acl',
        type: '',
        requirement: '',
        description: (
          <>
            Required permission list: <code>viewers</code> or{' '}
            <code>editors</code>.
          </>
        ),
      },
      {
        name: 'action',
        type: '',
        requirement: '',
        description: (
          <>
            Required operation: <code>add</code> or <code>remove</code>.
          </>
        ),
      },
    );
  } else if (action === 'transfer') {
    parameters.push({
      name: 'owner',
      type: '',
      requirement: '',
      description: (
        <>
          Required destination object with <code>_id</code> and{' '}
          <code>type</code> set to <code>netid</code> or <code>org</code>.
          Organization destinations must be available to the signed-in user.
        </>
      ),
    });
  }

  return {
    key: details.key,
    method: 'POST',
    path: `/api/core/link/${details.endpoint}`,
    title: details.title,
    summary: details.summary,
    notes: [
      'This endpoint requires an authenticated Shrunk web session. All links are validated in one transaction before the operation is committed. If any link is missing, deleted, or unauthorized, none of the selected links are changed.',
    ],
    examples: [
      {
        label: 'Request',
        code: `curl ${coreLinkApiUrl}/${details.endpoint} \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -b "session=$SHRUNK_SESSION_COOKIE" \\
  -d '${details.body}'`,
      },
      { label: 'Success response', code: '204 No Content', emphasis: 'inline' },
      {
        label: 'Validation or permission failure',
        code: `HTTP 403
{
  "errors": ["${details.failureMessage}"],
  "failed_ids": ["<link_id>", ...]
}`,
      },
    ],
    parametersHeading: 'Body Parameters',
    parameters,
    trailingNote: (
      <>
        Malformed requests, including empty or duplicate <code>link_ids</code>,
        return <code>400 Bad Request</code>.
      </>
    ),
  };
}

export function getEndpoints(
  apiUrl: string,
  coreLinkApiUrl: string,
): EndpointDoc[] {
  return [
    {
      key: 'users-get',
      method: 'GET',
      path: '/users',
      title: 'List all Users',
      summary: 'Returns all the Users registered on Shrunk',
      notes: ['Requires a Super Token. Org-scoped tokens will receive a 403.'],
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`,
        },
        {
          label: 'Response',
          code: `{
    "users": [
      {
        "netid": str,
        "organizations": [str, ...],
        "roles": [str, ...],
        "linksCreated": int,
      }
    ]
}`,
        },
      ],
      parametersHeading: 'Query Parameters',
      parameters: [
        {
          name: 'roles',
          type: 'string',
          requirement: 'Optional',
          description: 'Filter users by roles.',
        },
        {
          name: 'filter',
          type: 'string',
          requirement: 'Optional',
          description:
            'Only return specified fields in response (comma-separated).',
        },
      ],
    },
    {
      key: 'links-post',
      method: 'POST',
      path: '/links',
      title: 'Create Link',
      summary: 'Creates a short link within an organization',
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/links \\
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
  }'`,
        },
        {
          label: 'Response',
          code: `{
  "id": str,
  "alias": str,
  "link": str
}`,
        },
      ],
      responseNote: (
        <>
          If <code>check_existing</code> is true and a matching link already
          exists, the response omits <code>link</code> and only contains{' '}
          <code>id</code> and <code>alias</code>.
        </>
      ),
      parametersHeading: 'Body Parameters',
      parameters: [
        {
          name: 'organization_id',
          type: 'string',
          requirement: 'Required for Super Tokens',
          description: (
            <>
              The organization to create the link in. Required when using a
              Super Token. Optional when using an org-scoped token &mdash;
              defaults to that token&apos;s organization, and must match it if
              provided.
            </>
          ),
        },
        {
          name: 'long_url',
          type: 'string',
          requirement: 'Required',
          description: 'Destination URL for the short link.',
        },
        {
          name: 'title',
          type: 'string',
          requirement: 'Optional',
          description: (
            <>
              Human-friendly name for the link. Defaults to &quot;Untitled
              Link&quot;.
            </>
          ),
        },
        {
          name: 'alias',
          type: 'string',
          requirement: 'Optional',
          description:
            'Custom short code (min length 5). If omitted, one is generated.',
        },
        {
          name: 'expiration_time',
          type: 'string (ISO 8601)',
          requirement: 'Optional',
          description:
            'When the link should expire. Example: 2025-12-31T23:59:59Z',
        },
        {
          name: 'check_existing',
          type: 'boolean',
          requirement: 'Optional',
          description:
            'If true, returns an existing link for the given long_url (within the same organization) otherwise creates a new one.',
        },
      ],
    },
    {
      key: 'links-get',
      method: 'GET',
      path: '/links/<link_id>',
      title: 'Get Link',
      summary: 'Retrieves a link by ID. Requires a Super Token.',
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/links/<link_id> \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`,
        },
        {
          label: 'Response',
          code: `{
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
}`,
        },
      ],
      parametersHeading: 'Path Parameters',
      parameters: [
        {
          name: 'link_id',
          type: 'string',
          requirement: 'Required',
          description: 'ID of the link to retrieve.',
        },
      ],
    },
    {
      key: 'links-patch',
      method: 'PATCH',
      path: '/links/<link_id>',
      title: 'Update Link',
      summary: (
        <>
          Updates a link&apos;s deleted state or expiration time. Requires a
          Super Token with <code>update:links</code> permission.
        </>
      ),
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/links/<link_id> \\
  -X PATCH \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY" \\
  -d '{
    "deleted": false,
    "expiration_time": "2099-01-01T00:00:00Z"
  }'`,
        },
        { label: 'Response', code: `{ "status": "updated" }` },
      ],
      parametersHeading: 'Body Parameters',
      parameters: [
        {
          name: 'deleted',
          type: 'boolean',
          requirement: 'Optional',
          description: (
            <>
              Set <code>true</code> to soft-delete the link; <code>false</code>{' '}
              to restore a previously deleted link.
            </>
          ),
        },
        {
          name: 'expiration_time',
          type: 'string (ISO 8601) | null',
          requirement: 'Optional',
          description: (
            <>
              New expiration time for the link. Pass <code>null</code> to remove
              the expiration entirely.
            </>
          ),
        },
      ],
    },
    {
      key: 'org-links-get',
      method: 'GET',
      path: '/organizations/<org_id>/links/<link_id>',
      title: 'Get Organization Link',
      summary:
        'Retrieves a link owned by a specific organization by org ID and link ID.',
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/organizations/<org_id>/links/<link_id> \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`,
        },
        {
          label: 'Response',
          code: `{
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
}`,
        },
      ],
      parametersHeading: 'Path Parameters',
      parameters: [
        {
          name: 'org_id',
          type: 'string',
          requirement: 'Required',
          description: 'Organization ID owning the link.',
        },
        {
          name: 'link_id',
          type: 'string',
          requirement: 'Required',
          description: 'ID of the link to retrieve.',
        },
      ],
    },
    {
      key: 'org-links-list',
      method: 'GET',
      path: '/organizations/<org_id>/links',
      title: 'List Organization Links',
      summary: 'Returns all links owned by an organization.',
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/organizations/<org_id>/links \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`,
        },
        {
          label: 'Response',
          code: `{
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
}`,
        },
      ],
      parametersHeading: 'Path Parameters',
      parameters: [
        {
          name: 'org_id',
          type: 'string',
          requirement: 'Required',
          description: 'Organization ID whose links to list.',
        },
      ],
    },
    bulkOperation(coreLinkApiUrl, 'share'),
    bulkOperation(coreLinkApiUrl, 'transfer'),
    bulkOperation(coreLinkApiUrl, 'delete'),
    {
      key: 'visits-post',
      method: 'POST',
      path: '/links/<org_id>/<link_id>/visits',
      title: 'Fetch visits data with optional query',
      summary: 'Fetch visits of a link',
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/links/<org_id>/<link_id>/visits \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY" \\
  -d '{
    "mid": "foo",
    "uid": "bar",
  }'`,
        },
        {
          label: 'Response',
          code: `{
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
}`,
        },
      ],
      parametersHeading: 'Body Parameters',
      parameters: [
        {
          name: 'mid',
          type: 'string | string[]',
          requirement: 'Optional',
          description:
            'Pass in a Mail ID or an array of Mail IDs to fetch visits for.',
        },
        {
          name: 'uid',
          type: 'string | string[]',
          requirement: 'Optional',
          description:
            'Pass in a unique id or an array of User IDs to fetch visits for.',
        },
      ],
    },
    {
      key: 'pixels-post',
      method: 'POST',
      path: '/tracking-pixels',
      title: 'Create Tracking Pixel',
      summary: 'Creates a tracking pixel link within an organization',
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/tracking-pixels \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY" \\
  -d '{
    "title": "Newsletter Pixel",
    "tracking_pixel_extension": ".png",
    "organization_id": "<org_id>"
  }'`,
        },
        {
          label: 'Response',
          code: `{
  "id": str,
  "alias": str
}`,
        },
      ],
      parametersHeading: 'Body Parameters',
      parameters: [
        {
          name: 'organization_id',
          type: 'string',
          requirement: 'Required for Super Tokens',
          description: (
            <>
              The organization to create the tracking pixel in. Required when
              using a Super Token. Optional when using an org-scoped token
              &mdash; defaults to that token&apos;s organization, and must match
              it if provided.
            </>
          ),
        },
        {
          name: 'title',
          type: 'string',
          requirement: 'Optional',
          description: (
            <>
              Human-friendly name for the tracking pixel. Defaults to
              &quot;Untitled Link&quot;.
            </>
          ),
        },
        {
          name: 'tracking_pixel_extension',
          type: 'string (".png" | ".gif")',
          requirement: 'Optional',
          description: 'File format for the pixel image. Defaults to .png.',
        },
      ],
    },
    {
      key: 'pixels-get',
      method: 'GET',
      path: '/tracking-pixels/<org_id>/<link_id>',
      title: 'Get Tracking Pixel',
      summary: 'Retrieves a tracking pixel link by organization and link ID',
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/tracking-pixels/<org_id>/<link_id> \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`,
        },
        {
          label: 'Response',
          code: `{
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
}`,
        },
      ],
      parametersHeading: 'Path Parameters',
      parameters: [
        {
          name: 'org_id',
          type: 'string',
          requirement: 'Required',
          description: 'Organization ID owning the tracking pixel link.',
        },
        {
          name: 'link_id',
          type: 'string',
          requirement: 'Required',
          description: 'ID of the tracking pixel link to retrieve.',
        },
      ],
    },
    {
      key: 'pixels-list',
      method: 'GET',
      path: '/tracking-pixels/<org_id>',
      title: 'List Organization Tracking Pixels',
      summary: 'Returns all tracking pixel links owned by an organization',
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/tracking-pixels/<org_id> \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`,
        },
        {
          label: 'Response',
          code: `{
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
}`,
        },
      ],
      parametersHeading: 'Path Parameters',
      parameters: [
        {
          name: 'org_id',
          type: 'string',
          requirement: 'Required',
          description: (
            <>
              Organization ID whose tracking pixel links to list. Must match the
              token&apos;s organization.
            </>
          ),
        },
      ],
    },
    {
      key: 'orgs-list',
      method: 'GET',
      path: '/organizations',
      title: 'List All Organizations',
      summary: 'Returns all organizations',
      notes: ['Requires a Super Token. Org-scoped tokens will receive a 403.'],
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/organizations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`,
        },
        {
          label: 'Response',
          code: `{
  "organizations": [
    {
      "orgId": str,
      "name": str,
      "members": [str, ...]
    }
  ]
}`,
        },
      ],
    },
    {
      key: 'orgs-get-netid',
      method: 'GET',
      path: '/organizations/<netid>',
      title: 'List Organizations By NetID',
      summary: 'Returns all organizations a user is a member of',
      notes: ['Requires a Super Token. Org-scoped tokens will receive a 403.'],
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/organizations/<netid> \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`,
        },
        {
          label: 'Response',
          code: `{
  "organizations": [
    {
      "orgId": str,
      "name": str,
      "role": str
    }
  ]
}`,
        },
      ],
      parametersHeading: 'Path Parameters',
      parameters: [
        {
          name: 'netid',
          type: 'string',
          requirement: 'Required',
          description: 'NetID of the user whose organizations to list.',
        },
      ],
    },
    {
      key: 'orgs-post',
      method: 'POST',
      path: '/organizations',
      title: 'Create Organization',
      summary: (
        <>
          Creates a new organization. Requires a Super Token with{' '}
          <code>create:organizations</code> permission.
        </>
      ),
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/organizations \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY" \\
  -d '{
    "name": "My Organization",
    "owner_netid": "netid123"
  }'`,
        },
        {
          label: 'Response',
          code: `{
  "organization": {
    "_id": str,
    "name": str
  }
}`,
        },
      ],
      parametersHeading: 'Body Parameters',
      parameters: [
        {
          name: 'name',
          type: 'string',
          requirement: 'Required',
          description: 'Name of the organization to create.',
        },
        {
          name: 'owner_netid',
          type: 'string',
          requirement: 'Required',
          description: 'NetID of the user who will own the organization.',
        },
      ],
    },
    {
      key: 'users-links-get',
      method: 'GET',
      path: '/users/<netid>/links',
      title: 'List Accessible Links for User',
      summary:
        'Returns all non-tracking-pixel links accessible to a user (personal and org-owned). Requires a Super Token.',
      examples: [
        {
          label: 'Request',
          code: `curl ${apiUrl}/users/<netid>/links \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`,
        },
        {
          label: 'Response',
          code: `{
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
}`,
        },
      ],
      parametersHeading: 'Path Parameters',
      parameters: [
        {
          name: 'netid',
          type: 'string',
          requirement: 'Required',
          description: 'NetID of the user whose accessible links to return.',
        },
      ],
    },
    {
      key: 'links-get-qrcode',
      method: 'GET',
      path: '/links/<link_id>/qrcode',
      title: 'Generate QRCode',
      summary: 'Generates and returns a downloadable QR code image by link ID',
      examples: [
        {
          label: 'Request',
          code: `curl -O -J ${apiUrl}/links/<link_id>/qrcode \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`,
        },
        { label: 'Response', code: 'PNG Image: alias-qrcode.png' },
      ],
    },
  ];
}
