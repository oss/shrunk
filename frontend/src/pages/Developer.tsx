import { PageShell } from '@/components/page-shell';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

const faqItems = [
  {
    key: '1',
    question: 'How do I use this?',
    answer:
      'We do not have a dedicated API client or package you can install, but you can use any package that supports sending HTTP requests.',
  },
  {
    key: '2',
    question: 'Are there restrictions?',
    answer:
      'The only limitation is you cannot specify custom aliases; if you need to specify a custom alias, please use our site.',
  },
  {
    key: '3',
    question: 'How can I get access to this?',
    answer: 'Click "Request an access token".',
  },
];

export default function Developer() {
  return (
    <PageShell className="space-y-8 py-0 pb-4">
      <section className="max-w-4xl space-y-4">
        <h1 className="app-page-heading">
          Automate Shortening Links for Rutgers University
        </h1>
        <p className="leading-7 text-pretty text-muted-foreground">
          From shortening links to creating qr codes, you can leverage our APIs
          to avoid paying for services like Bitly or TinyURL. All automated
          links will be visable on this site tagged with an API tag to flag that
          it was created using an external program. If you are actively working
          with the Shrunk API, it is recommended to look at the release notes
          from time to time for bug fixes or new improvements to the API.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button>Take me to the API Reference!</Button>
          <Button variant="outline">Request an access token</Button>
        </div>
      </section>

      <section className="max-w-4xl space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item) => (
            <AccordionItem key={item.key} value={item.key}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent className="leading-6 text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
          <AccordionItem value="4">
            <AccordionTrigger>
              I found a bug, who can I contact?
            </AccordionTrigger>
            <AccordionContent className="leading-6 text-muted-foreground [&_a]:text-primary [&_a]:underline">
              Please <a href="mailto:oss@oit.rutgers.edu">send us an email</a>{' '}
              describing your bug and how to reproduce it.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </PageShell>
  );
}
