import { Fragment } from 'react';
import { CodeBlock } from '@/Features/ApiReference/CodeBlock';
import { cn } from '@/Shared/Lib/Utils';
import type { EndpointDoc } from '@/Features/ApiReference/Endpoints';

const codeBlockClass =
  'rounded-sm border border-border bg-muted px-6 py-6 text-[0.95rem] leading-8 text-foreground';
const inlineCodeBlockClass =
  'w-fit rounded-sm border border-border bg-muted px-2 py-1 text-[0.95rem] text-foreground';
const paragraphClass = 'mt-4 text-[1.02rem] leading-8 text-foreground';
const sectionHeadingClass =
  'mt-4 text-base font-semibold tracking-normal text-foreground';

export function EndpointCard({ endpoint }: { endpoint: EndpointDoc }) {
  return (
    <div className="space-y-1.5 bg-background text-foreground">
      <h4 className="text-[1.05rem] font-semibold tracking-normal text-foreground">
        {endpoint.title}
      </h4>

      {endpoint.summary && (
        <h5 className={sectionHeadingClass}>{endpoint.summary}</h5>
      )}

      {endpoint.notes?.map((note, index) => (
        <p key={index} className={paragraphClass}>
          {note}
        </p>
      ))}

      {endpoint.examples.map((example) => (
        <Fragment key={example.label}>
          <p className={paragraphClass}>{example.label}</p>
          <CodeBlock
            className={cn(
              example.emphasis === 'inline'
                ? inlineCodeBlockClass
                : codeBlockClass,
              'mt-3',
            )}
          >
            {example.code}
          </CodeBlock>
        </Fragment>
      ))}

      {endpoint.responseNote && (
        <p className={paragraphClass}>{endpoint.responseNote}</p>
      )}

      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <>
          <h5 className={sectionHeadingClass}>{endpoint.parametersHeading}</h5>
          <dl className="mt-4 divide-y divide-border">
            {endpoint.parameters.map((param) => (
              <div
                key={param.name}
                className="grid gap-2 py-5 sm:grid-cols-[minmax(0,22rem)_1fr] sm:items-start"
              >
                <dt>
                  <span className="inline-flex flex-wrap items-center gap-3">
                    <code className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.92rem] text-foreground">
                      {param.name}
                    </code>
                    {param.type && (
                      <span className="text-muted-foreground">
                        {param.type}
                      </span>
                    )}
                    {param.requirement && (
                      <span className="text-muted-foreground">
                        {param.requirement}
                      </span>
                    )}
                  </span>
                </dt>
                <dd className="leading-7 text-foreground">
                  {param.description}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {endpoint.trailingNote && (
        <p className={paragraphClass}>{endpoint.trailingNote}</p>
      )}
    </div>
  );
}
