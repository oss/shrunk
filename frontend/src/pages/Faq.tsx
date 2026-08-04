/**
 * Implements the [[Faq]] component
 * @packageDocumentation
 */
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronRightIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { Link } from 'react-router';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type AccessRow = {
  key: string;
  action: string;
  owner: string;
  editor: string;
  viewer: string;
  everyone: string;
};

type FaqItem = {
  key: string;
  question: string;
  answer: ReactNode;
};

const accessRows: AccessRow[] = [
  {
    key: '1',
    action: 'Visit Link',
    owner: '*',
    editor: '*',
    viewer: '*',
    everyone: '*',
  },
  {
    key: '2',
    action: 'View Link Info',
    owner: '*',
    editor: '*',
    viewer: '*',
    everyone: '',
  },
  {
    key: '3',
    action: 'View Link Stats',
    owner: '*',
    editor: '*',
    viewer: '*',
    everyone: '',
  },
  {
    key: '4',
    action: 'View Link Visits',
    owner: '*',
    editor: '*',
    viewer: '*',
    everyone: '',
  },
  {
    key: '5',
    action: 'View Alias Stats',
    owner: '*',
    editor: '*',
    viewer: '*',
    everyone: '',
  },
  {
    key: '6',
    action: 'View Alias Visits',
    owner: '*',
    editor: '*',
    viewer: '*',
    everyone: '',
  },
  {
    key: '7',
    action: 'Create Alias',
    owner: '*',
    editor: '*',
    viewer: '',
    everyone: '',
  },
  {
    key: '8',
    action: 'Modify Link',
    owner: '*',
    editor: '*',
    viewer: '',
    everyone: '',
  },
  {
    key: '9',
    action: 'Modify Link Permissions',
    owner: '*',
    editor: '*',
    viewer: '',
    everyone: '',
  },
  {
    key: '10',
    action: 'Modify Link Owner',
    owner: '*',
    editor: '',
    viewer: '',
    everyone: '',
  },
  {
    key: '11',
    action: 'Delete Alias',
    owner: '*',
    editor: '',
    viewer: '',
    everyone: '',
  },
  {
    key: '12',
    action: 'Delete Link',
    owner: '*',
    editor: '',
    viewer: '',
    everyone: '',
  },
  {
    key: '13',
    action: 'Reset Visit Count',
    owner: '*',
    editor: '',
    viewer: '',
    everyone: '',
  },
];

function AccessMatrix() {
  return (
    <div className="overflow-hidden rounded-md border border-white/10">
      <Table>
        <TableHeader className="bg-[#2b2b2b]">
          <TableRow className="border-b border-white/10 hover:bg-transparent">
            <TableHead className="h-11 px-4 text-[#d4d4d4]">Action</TableHead>
            <TableHead className="h-11 px-4 text-center text-[#d4d4d4]">
              Owner
            </TableHead>
            <TableHead className="h-11 px-4 text-center text-[#d4d4d4]">
              Editor
            </TableHead>
            <TableHead className="h-11 px-4 text-center text-[#d4d4d4]">
              Viewer
            </TableHead>
            <TableHead className="h-11 px-4 text-center text-[#d4d4d4]">
              Everyone
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accessRows.map((row) => (
            <TableRow
              key={row.key}
              className="border-b border-white/10 hover:bg-white/[0.02]"
            >
              <TableCell className="px-4 text-[#efefef]">
                {row.action}
              </TableCell>
              <TableCell className="px-4 text-center text-[#efefef]">
                {row.owner}
              </TableCell>
              <TableCell className="px-4 text-center text-[#efefef]">
                {row.editor}
              </TableCell>
              <TableCell className="px-4 text-center text-[#efefef]">
                {row.viewer}
              </TableCell>
              <TableCell className="px-4 text-center text-[#efefef]">
                {row.everyone}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FaqAnswer({ children }: { children: ReactNode }) {
  return (
    <div className="text-[1.05rem] leading-8 text-[#dfdfdf] [&_a]:text-[#d62929] [&_a]:underline [&_a]:underline-offset-2 [&_b]:font-semibold [&_b]:text-[#efefef]">
      {children}
    </div>
  );
}

function FaqAccordion() {
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      defaultValue="1"
      className="overflow-hidden rounded-lg border border-white/10 bg-[#2a2a2a]"
    >
      {faqItems.map((item) => (
        <AccordionPrimitive.Item
          key={item.key}
          value={item.key}
          className="border-b border-white/10 last:border-b-0"
        >
          <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger className="group flex w-full items-center gap-4 px-5 py-4 text-left text-[1.05rem] font-medium text-[#efefef] transition-colors hover:bg-white/[0.02]">
              <ChevronRightIcon className="size-4 shrink-0 text-[#bdbdbd] transition-transform duration-200 group-data-[state=open]:rotate-90" />
              <span>{item.question}</span>
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden border-t border-white/10 bg-[#1F1F1F] data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="px-5 py-4">
              <FaqAnswer>{item.answer}</FaqAnswer>
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}

/**
 * The [[Faq]] component is just a static FAQ page
 * @class
 */
export default function Faq(): React.JSX.Element {
  return (
    <div className="-mx-6 min-h-[calc(100dvh-var(--app-header-height,0px))] bg-[#1A1A1A] px-6 pb-8 text-[#efefef]">
      <div className="mx-auto max-w-[82rem]">
        <div className="space-y-7">
          <h1 className="app-page-heading text-[#efefef]">
            Frequently Asked Questions
          </h1>
          <FaqAccordion />
        </div>
      </div>
    </div>
  );
}

const faqItems: FaqItem[] = [
  {
    key: '1',
    question: 'What is Go?',
    answer: <>Go is the official URL shortener of Rutgers University.</>,
  },
  {
    key: '2',
    question: 'Who has access to Go?',
    answer: (
      <>
        All current Rutgers University faculty and staff members are able to log
        into <a href="https://go.rutgers.edu/">go.rutgers.edu</a> using their
        NetID and password. Undergraduate student workers can be granted access
        to Go by a faculty or staff member.
      </>
    ),
  },
  {
    key: '14',
    question: 'How do I shorten a link?',
    answer: (
      <>
        To shorten a link click on the <b>Shrink</b> a Link button, from there
        you can give your link a name in the title field, then you can paste
        your long link in the <b>Long URL</b> field. After that you can
        optionally set a time for your link to expire. Then you have option to
        set up a description for your link. Additionaly, with Power user access
        you can add a custom ending to your URL.
      </>
    ),
  },
  {
    key: '3',
    question: 'Can I choose the URL my link will be shortened to?',
    answer: (
      <>
        To create a custom short URL, you must have the &ldquo;power user&rdquo;
        role. This role is available only to faculty and staff members. To
        request to be added to this role, please email&nbsp;
        <a href="mailto:oss@oit.rutgers.edu">oss@oit.rutgers.edu</a> along with
        your NetID.
      </>
    ),
  },
  {
    key: '4',
    question: 'How can I grant an undergraduate student worker access to Go?',
    answer: (
      <>
        To grant access to an undergraduate user, click the&nbsp;
        <Link to="/roles/whitelisted">Whitelist</Link> tab in the navigation
        bar, then enter the user&rsquo;s NetID and the reason the user needs
        access to Go. Undergraduate users should only use Go for purposes
        related to their employment with the University.
      </>
    ),
  },
  {
    key: '5',
    question: 'Why would I create multiple aliases for one link?',
    answer: (
      <>
        One use of multiple aliases would be creating distinct aliases for
        Twitter and Facebook if you wish to track the number of impressions from
        each platform. You can have at most 6 aliases for one link.
      </>
    ),
  },
  {
    key: '6',
    question: 'What is the organizations feature?',
    answer: (
      <>
        The organizations feature is a collaborative tool that allows a group of
        users to view each other&rsquo;s links. For example, users working
        together on a project may want to be able to see each other&rsquo;s
        links.
      </>
    ),
  },
  {
    key: '7',
    question: 'How can I use the organizations feature?',
    answer: (
      <>
        Only faculty and staff members are able to create a new organization. To
        do so, navigate to the <Link to="/app/orgs">Organizations</Link> page
        and click the <b>Create an Organization</b> button. You will
        automatically be made an administrator of the newly created
        organization. Once the organization has been created, you may navigate
        to its management page and use the <b>Add a Member</b> button to add
        members to the organization. Only admins of the organization can delete
        an organization, which removes member access to the shared links. To
        view the links created by members of an organization, click on
        <b> My Links</b> next to the search bar and under &ldquo;My
        Organizations&rdquo; select the organization whose links you would like
        to view.
      </>
    ),
  },
  {
    key: '8',
    question: 'Where did the links that were shared to my organization go?',
    answer: (
      <>
        The organizations feature has been changed as of September 2021.
        Previously all user links would be shared within organizations
        automatically. Now, users must share each individual link to an
        organization in order for other members of the organization to view
        shared links. If you would like to re-share all your links to an
        organization, please email&nbsp;
        <a href="mailto:oss@oit.rutgers.edu">oss@oit.rutgers.edu</a>.
      </>
    ),
  },
  {
    key: '9',
    question: 'Why can I view this link but not edit it?',
    answer: (
      <>
        As a viewer, you can see a link&apos;s stats and QR code; however, you
        cannot edit it. You can request edit access by hitting the mail icon
        next to the link which will send a request to the owner of the link.
      </>
    ),
  },
  {
    key: '10',
    question: 'How do I share my links?',
    answer: (
      <>
        To share your link with a specific user or an organization, you must
        either be the owner or an editor of the link. Click on the
        <b> manage sharing</b> icon to the right of your link and add the
        user&apos;s NetId or the organization name. You can also specify whether
        you want them to be a viewer or editor of the link.{' '}
      </>
    ),
  },
  {
    key: '11',
    question:
      'How do I sort my links? How do I see my deleted and expired links?',
    answer: (
      <>
        To sort your links on your URL dashboard, you can click on{' '}
        <b>Filter By </b>
        next to the search bar and choose what you want your links to be sorted
        by and in what order. You can also view your expired and deleted links
        among your active links. You can also specify only links created after
        or before a specific data to be shown.
      </>
    ),
  },
  {
    key: '12',
    question: 'Where can I download my link statistics?',
    answer: (
      <>
        Click on the <b>link statistics</b> icon to the right of your link and
        on that page under the tab <b>Link Info</b> and below the <b>Visits</b>{' '}
        header is the <b>Download visits as CSV</b> button. This downloads onto
        your computer a .csv file of link statistics for that specific link. The
        .csv file includes which alias was used to access the link, visitor ID,
        referrer, approximate location of the user, and time accessed.
      </>
    ),
  },
  {
    key: '13',
    question:
      'What access does someone have when I make them a viewer or editor?',
    answer: <AccessMatrix />,
  },
];
