/**
 * Implements the [[Dashboard]] component
 * @packageDocumentation
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Pagination, Spin, Dropdown, Button } from 'antd';
import { PlusCircleFilled } from '@ant-design/icons';

import { listOrgs, OrgInfo } from '../api/Org';
import { SearchQuery, SearchBox } from '../components/SearchBox';
import { LinkRow } from '../components/LinkRow';
import { LinkInfo } from '../components/LinkInfo';
import { QrCodeModal } from '../components/QrCode';
import { EditLinkModal, EditLinkFormValues } from '../components/EditLinkModal';
import { CreateLinkForm } from '../components/CreateLinkForm';

import './Dashboard.less';

/**
 * Props for the [[Dashboard]] component.
 * @interface
 */
export interface Props {
  userPrivileges: Set<string>;
}

/**
 * State of the [[Dashboard]] component.
 * @interface
 */
export interface State {
  /**
   * The organizations of which the user is a member. This is used in the
   * advanced search settings menu.
   * @property
   */
  userOrgs: OrgInfo[] | null;

  /**
   * An array of [[LinkInfo]] objects for the current search results.
   * @property
   */
  linkInfo: LinkInfo[] | null;

  /**
   * The number of links to display per page. Currently this is constant,
   * but that may change in the future.
   * @property
   */
  linksPerPage: number;

  /**
   * The current search query.
   * @property
   */
  query: SearchQuery | null;

  /**
   * The current page in the search results. Starts from `1`.
   * @property
   */
  currentPage: number;

  /**
   * The total number of pages of results for the current query.
   * @property
   */
  totalPages: number;

  /**
   * The current offset in the search result, in terms of number of links.
   * @property
   */
  currentOffset: number;

  /**
   * The total number of links returned by the current query.
   * @property
   */
  totalLinks: number;

  /**
   * The current state of the create link form
   * @property
   */
  createLinkState: { visible: boolean };

  /**
   * The current state of the edit modal.
   * @property
   */
  editModalState: { visible: boolean; linkInfo: LinkInfo | null };

  /**
   * The current state of the QR code modal.
   * @property
   */
  qrModalState: { visible: boolean; linkInfo: LinkInfo | null };

  /**
   * Whether the create link dropdown is visible.
   * @property
   */
  createLinkDropdownVisible: boolean;
}

/**
 * The [[Dashboard]] component implements most of Shrunk's core functionality.
 * It allows the user to
 *   * Search for links
 *   * Create, edit, and delete links
 *   * Navigate to the stats page for link
 *   * Create QR codes
 * @class
 */
export class Dashboard extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      userOrgs: null,
      linkInfo: null,
      linksPerPage: 10,
      query: {
        set: { set: this.props.userPrivileges.has('admin') ? 'all' : 'user' },
        show_expired_links: false,
        show_deleted_links: false,
        sort: { key: 'created_time', order: 'descending' },
        begin_time: null,
        end_time: null,
      },
      totalPages: 0,
      totalLinks: 0,
      currentPage: 1,
      currentOffset: 0,
      createLinkState: {
        visible: false,
      },
      editModalState: {
        visible: false,
        linkInfo: null,
      },
      qrModalState: {
        visible: false,
        linkInfo: null,
      },
      createLinkDropdownVisible: false,
    };
  }

  async componentDidMount(): Promise<void> {
    await Promise.all([this.fetchUserOrgs(), this.refreshResults()]);
  }

  /**
   * Fetch the organizations of which the user is a member.
   * @method
   */
  fetchUserOrgs = async (): Promise<void> => {
    const userOrgs = await listOrgs('user');
    this.setState({ userOrgs });
  };

  /**
   * Executes a search query and updates component state with the results
   * @method
   * @param newQuery The new query
   */
  setQuery = async (newQuery: SearchQuery): Promise<void> => {
    const results = await this.doQuery(newQuery, 0, this.state.linksPerPage);
    const totalPages = Math.ceil(results.count / this.state.linksPerPage);
    this.setState({
      linkInfo: results.results,
      query: newQuery,
      currentPage: 1,
      totalPages,
      currentOffset: this.state.linksPerPage,
      totalLinks: results.count,
    });
  };

  /**
   * Updates the current page of search results.
   * @method
   * @throws Error if the current query is `null`
   * @param newPage The new page
   */
  setPage = async (newPage: number): Promise<void> => {
    if (this.state.query === null) {
      throw new Error('attempted to set page with this.state.query === null');
    }

    const skip = (newPage - 1) * this.state.linksPerPage;
    const results = await this.doQuery(
      this.state.query,
      skip,
      this.state.linksPerPage
    );
    const totalPages = Math.ceil(results.count / this.state.linksPerPage);
    this.setState({
      linkInfo: results.results,
      currentPage: newPage,
      totalPages,
      currentOffset: newPage * this.state.linksPerPage,
      totalLinks: results.count,
    });
  };

  /**
   * Re-execute the currently active query.
   * @method
   */
  refreshResults = async (): Promise<void> => {
    await this.setPage(this.state.currentPage);
  };

  /**
   * Sends a search request to the server. Does not update component state.
   * Use [[setQuery]] or [[setPage]] if you want to update the current state
   * of the search results.
   * @method
   * @param query The query to execute
   * @param skip  The number of results to skip
   * @param limit The number of results to return
   * @returns The search results
   */
  doQuery = async (
    query: SearchQuery,
    skip: number,
    limit: number
  ): Promise<{ count: number; results: LinkInfo[] }> => {
    const req: Record<string, any> = {
      query: query.query,
      set: query.set,
      show_expired_links: query.show_expired_links,
      show_deleted_links: query.show_deleted_links,
      sort: query.sort,
      pagination: { skip, limit },
    };

    if (query.begin_time !== null) {
      req.begin_time = query.begin_time.format();
    }

    if (query.end_time !== null) {
      req.end_time = query.end_time.format();
    }

    const result = await fetch('/api/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    }).then((resp) => resp.json());
    return {
      count: result.count,
      results: result.results.map(
        (result: any) =>
          ({
            ...result,
            created_time: new Date(result.created_time),
            expiration_time: !result.expiration_time
              ? null
              : new Date(result.expiration_time),
            deletion_info: !result.deletion_info
              ? null
              : {
                  deleted_by: result.deletion_info.deleted_by,
                  deleted_time: new Date(result.deletion_info.deleted_time),
                },
          } as LinkInfo)
      ),
    };
  };

  /**
   * Displays the edit link modal
   * @method
   * @param linkInfo The [[LinkInfo]] of the link to edit
   */
  showEditModal = (linkInfo: LinkInfo): void => {
    this.setState({
      editModalState: {
        visible: true,
        linkInfo,
      },
    });
  };

  /** Hides the edit link modal
   * @method
   */
  hideEditModal = (): void => {
    this.setState({
      editModalState: {
        ...this.state.editModalState,
        visible: false,
      },
    });

    // We set a timeout for this to prevent the contents of the modal
    // from changing while the modal-close animation is still in progress.
    setTimeout(() => {
      this.setState({
        editModalState: {
          ...this.state.editModalState,
          linkInfo: null,
        },
      });
    }, 500);
  };

  /**
   * Show the QR code modal
   * @method
   * @param linkInfo The [[LinkInfo]] of the link for which to generate QR codes
   */
  showQrModal = (linkInfo: LinkInfo): void => {
    this.setState({
      qrModalState: {
        visible: true,
        linkInfo,
      },
    });
  };

  /**
   * Hide the QR code modal
   * @method
   */
  hideQrModal = (): void => {
    this.setState({
      qrModalState: {
        ...this.state.qrModalState,
        visible: false,
      },
    });

    // We set a timeout for this to prevent the contents of the modal
    // from changing while the modal-close animation is still in progress.
    setTimeout(() => {
      this.setState({
        qrModalState: {
          ...this.state.qrModalState,
          linkInfo: null,
        },
      });
    }, 500);
  };

  /**
   * Executes API requests to update a link
   * @param values The form values from the edit link form
   * @throws Error if the value of `this.state.editModalState.linkInfo` is `null`
   */
  doEditLink = async (values: EditLinkFormValues): Promise<void> => {
    const oldLinkInfo = this.state.editModalState.linkInfo;
    if (oldLinkInfo === null) {
      throw new Error('oldLinkInfo should not be null');
    }

    // Create the request to edit title, long_url, and expiration_time
    const patch_req: Record<string, any> = {};
    if (values.title !== oldLinkInfo.title) {
      patch_req.title = values.title;
    }
    if (values.long_url !== oldLinkInfo.long_url) {
      patch_req.long_url = values.long_url;
    }
    if (values.owner !== oldLinkInfo.owner) {
      patch_req.owner = values.owner;
    }
    if (values.expiration_time !== oldLinkInfo.expiration_time) {
      patch_req.expiration_time =
        values.expiration_time === null
          ? null
          : values.expiration_time.format();
    }

    const promises = [];

    promises.push(
      fetch(`/api/v1/link/${oldLinkInfo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch_req),
      })
    );

    const oldAliases = new Map(
      oldLinkInfo.aliases.map((alias) => [alias.alias, alias])
    );
    const newAliases = new Map(
      values.aliases.map((alias) => [alias.alias, alias])
    );

    // Delete aliases that no longer exist
    for (const alias of oldAliases.keys()) {
      if (!newAliases.has(alias)) {
        promises.push(
          fetch(`/api/v1/link/${oldLinkInfo.id}/alias/${alias}`, {
            method: 'DELETE',
          })
        );
      }
    }

    // Create/update aliases
    for (const [alias, info] of newAliases.entries()) {
      const isNew = !oldAliases.has(alias);
      const isDescriptionChanged =
        oldAliases.has(alias) &&
        info.description !== oldAliases.get(alias)?.description;
      if (isNew || isDescriptionChanged) {
        promises.push(
          fetch(`/api/v1/link/${oldLinkInfo.id}/alias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alias,
              description: info.description,
            }),
          })
        );
      }
    }

    // Await all the requests and refresh search results
    await Promise.all(promises);
    await this.refreshResults();
  };

  render(): React.ReactNode {
    return (
      <>
        <Row className="primary-row">
          <Col span={4}>
            <span className="page-title">Dashboard</span>
          </Col>

          <Col span={16} className="vertical-center-col">
            {this.state.userOrgs === null ? (
              <></>
            ) : (
              <SearchBox
                userPrivileges={this.props.userPrivileges}
                userOrgs={this.state.userOrgs}
                setQuery={this.setQuery}
              />
            )}
          </Col>

          <Col span={4} className="btn-col">
            <Dropdown
              overlay={
                <CreateLinkForm
                  userPrivileges={this.props.userPrivileges}
                  onFinish={async () => {
                    this.setState({ createLinkDropdownVisible: false });
                    await this.refreshResults();
                  }}
                />
              }
              visible={this.state.createLinkDropdownVisible}
              onVisibleChange={(flag) =>
                this.setState({ createLinkDropdownVisible: flag })
              }
              placement="bottomRight"
              trigger={['click']}
            >
              <Button type="primary">
                <PlusCircleFilled /> Shrink a Link
              </Button>
            </Dropdown>
          </Col>
        </Row>

        {this.state.linkInfo === null ? (
          <Spin size="large" />
        ) : (
          <div className="dashboard-links">
            {this.state.linkInfo.map((linkInfo) => (
              <LinkRow
                key={linkInfo.id}
                linkInfo={linkInfo}
                showEditModal={this.showEditModal}
                showQrModal={this.showQrModal}
                refreshResults={this.refreshResults}
              />
            ))}

            <Pagination
              className="pagination"
              defaultCurrent={1}
              current={this.state.currentPage}
              showSizeChanger={false}
              total={this.state.totalLinks}
              onChange={this.setPage}
            />
          </div>
        )}

        {this.state.editModalState.linkInfo === null ? (
          <></>
        ) : (
          <EditLinkModal
            visible={this.state.editModalState.visible}
            userPrivileges={this.props.userPrivileges}
            linkInfo={this.state.editModalState.linkInfo}
            onOk={async (values) => {
              await this.doEditLink(values);
              this.hideEditModal();
            }}
            onCancel={this.hideEditModal}
          />
        )}

        {this.state.qrModalState.linkInfo === null ? (
          <></>
        ) : (
          <QrCodeModal
            visible={this.state.qrModalState.visible}
            width={256}
            linkInfo={this.state.qrModalState.linkInfo}
            onCancel={this.hideQrModal}
          />
        )}
      </>
    );
  }
}