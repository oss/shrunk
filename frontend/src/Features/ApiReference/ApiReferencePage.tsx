/**
 * Implements the [[ApiReference]] component
 */
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronRightIcon } from 'lucide-react';

import { CodeBlock } from '@/Features/ApiReference/CodeBlock';
import { EndpointCard } from '@/Features/ApiReference/EndpointCard';
import { getEndpoints } from '@/Features/ApiReference/Endpoints';

export default function ApiReference() {
  const apiUrl = `${window.location.origin}/api/v1`;
  const coreLinkApiUrl = `${window.location.origin}/api/core/link`;
  const endpoints = getEndpoints(apiUrl, coreLinkApiUrl);

  return (
    <div className="-mx-6 min-h-[calc(100dvh-var(--app-header-height,0px))] bg-background px-6 pb-8 text-foreground">
      <div className="mx-auto max-w-[82rem]">
        <div className="space-y-6 pt-0 pb-6">
          <div className="space-y-1.5 bg-background text-foreground">
            <h1 className="app-page-heading m-0 mt-4 text-4xl leading-none font-bold tracking-normal text-foreground">
              <span className="inline bg-background text-foreground">
                API Reference
              </span>
            </h1>
            <h2 className="mt-4 text-[2.25rem] leading-tight font-bold tracking-normal text-foreground">
              Introduction
            </h2>
            <p className="mt-4 max-w-[72rem] text-[1.02rem] leading-8 text-foreground">
              This API reference describes the APIs you can use to interact with
              Shrunk. If you have any questions, please email us{' '}
              <a
                className="text-primary underline decoration-primary underline-offset-2 hover:text-primary/80 dark:text-foreground dark:hover:text-foreground"
                href="mailto:oss@oss.rutgers.edu"
                target="_blank"
                rel="noreferrer"
              >
                oss@oss.rutgers.edu
              </a>
              .
            </p>
            <h2 className="mt-6 text-[2.25rem] leading-tight font-bold tracking-normal text-foreground">
              Authentication
            </h2>
            <p className="mt-4 max-w-[78rem] text-[1.02rem] leading-8 text-foreground">
              The Shrunk API uses API keys for authentication. Create, manage,
              and learn more about API keys in your{' '}
              <a
                className="text-primary underline decoration-primary underline-offset-2 hover:text-primary/80 dark:text-foreground dark:hover:text-foreground"
                href={`${window.location.origin}/app/orgs`}
                target="_blank"
                rel="noreferrer"
              >
                organization managment page
              </a>{' '}
              or the{' '}
              <a
                className="text-primary underline decoration-primary underline-offset-2 hover:text-primary/80 dark:text-foreground dark:hover:text-foreground"
                href={`${window.location.origin}/app/admin?tab=super-tokens`}
                target="_blank"
                rel="noreferrer"
              >
                admin dashboard
              </a>
              .
            </p>
            <p className="mt-4 text-[1.02rem] leading-8 text-foreground">
              Authentication is performed via Bearer tokens.
            </p>
            <CodeBlock className="mt-3 w-fit rounded-sm border border-border bg-muted px-2 py-1 text-[0.95rem] text-foreground">
              Authorization: Bearer SHRUNK_API_KEY
            </CodeBlock>
            <p className="mt-5 text-[1.02rem] leading-8 text-foreground">
              API Base URL:
            </p>
            <a
              className="text-primary underline decoration-primary underline-offset-2 hover:text-primary/80 dark:text-foreground dark:hover:text-foreground"
              href={apiUrl}
              target="_blank"
              rel="noreferrer"
            >
              {`${window.location.origin}/api/v1`}
            </a>
            .
            <AccordionPrimitive.Root
              type="multiple"
              className="mt-6 w-full overflow-hidden rounded-md border border-border"
            >
              {endpoints.map((endpoint) => (
                <AccordionPrimitive.Item
                  key={endpoint.key}
                  value={endpoint.key}
                  className="border-b border-border last:border-b-0"
                >
                  <AccordionPrimitive.Header className="flex">
                    <AccordionPrimitive.Trigger
                      aria-label={`${endpoint.method} ${endpoint.path}`}
                      className="group flex w-full items-center gap-3 px-5 py-4 text-left text-[1.05rem] font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
                      <span>
                        {endpoint.method} {endpoint.path}
                      </span>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <AccordionPrimitive.Content className="overflow-hidden border-t border-border text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="space-y-5 px-5 pt-10 pb-14">
                      <EndpointCard endpoint={endpoint} />
                    </div>
                  </AccordionPrimitive.Content>
                </AccordionPrimitive.Item>
              ))}
            </AccordionPrimitive.Root>
          </div>
        </div>
      </div>
    </div>
  );
}
