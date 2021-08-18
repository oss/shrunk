/**
 * Implements the [[LinkRow]] component
 * @packageDocumentation
 */

import React from 'react';
import { Row, Col, Button, Popconfirm, Tooltip, Tag } from 'antd';
import {
  CopyFilled,
  DeleteOutlined,
  LineChartOutlined,
  EditOutlined,
  QrcodeOutlined,
  ExclamationCircleFilled,
  StopOutlined,
  MailOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { 
  RiEditBoxLine, 
  RiMailSendFill,
  RiMailForbidLine,
  RiFileChartLine, 
  RiFileCopy2Fill,
  RiDeleteBin6Line, 
  RiQrCodeLine, 
  RiMessage2Line,
  RiChatOffLine,
  RiTeamLine
} from "react-icons/ri"

import CopyToClipboard from 'react-copy-to-clipboard';
import moment from 'moment';

import { LinkInfo } from './LinkInfo';
import './LinkRow.less';

/**
 * Props for the [[LinkRow]] component
 * @interface
 */
export interface Props {
  /**
   * [[LinkInfo]] of the link to display
   * @property
   */
  linkInfo: LinkInfo;

  /**
   * NetID of the user
   * @property
   */
  netid: string;

  /**
   * Callback called when the edit modal should be displayed
   * @property
   */
  showEditModal: (linkInfo: LinkInfo) => void;

  /**
   * Callback called when the share link modal should be displayed
   * @property
   */
  showShareLinkModal: (linkInfo: LinkInfo) => void;

  /**
   * Callback called when the QR modal should be displayed
   * @property
   */
  showQrModal: (linkInfo: LinkInfo) => void;

  /**
   * Callback called when the search results should be refreshed
   * (e.g. after link is updated)
   * @property
   */
  refreshResults: () => void;
}

/**
 * State for the [[LinkRow]] component
 * @interface
 */
export interface State {
  requestSent: boolean;
}

/**
 * The [[LinkRow]] component displays the information for a single link
 * on the dashboard. It provides buttons for editing and deleting the link,
 * and viewing link stats or QR codes
 * @class
 */
export class LinkRow extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      requestSent: false,
    };
  }

  componentDidMount = () => {
    this.hasSentRequest();
  };

  /**
   * Execute API requests to delete the link, then refresh search results
   * @method
   */
  confirmDelete = async (): Promise<void> => {
    // Delete link
    await fetch(`/api/v1/link/${this.props.linkInfo.id}`, { method: 'DELETE' });

    // Delete alias link
    let aliasName;

    this.props.linkInfo.aliases.map((alias) => {
      aliasName = `${alias.alias}`;
    });

    await fetch(`/api/v1/link/${this.props.linkInfo.id}/alias/${aliasName}`, {
      method: 'DELETE',
    });

    await this.props.refreshResults();
  };

  /**
   * Check if request has been sent yet
   * @method
   */
  hasSentRequest = async (): Promise<void> => {
    const result = await fetch(
      `/api/v1/link/${this.props.linkInfo.id}/active_request_exists`,
      {
        method: 'GET',
      },
    ).then((resp) => resp.json());
    this.setState({ requestSent: result });
  };

  /**
   * Execute API requests to request edit for the link
   * @method
   */
  requestEditAccess = async (): Promise<void> => {
    await fetch(`/api/v1/link/${this.props.linkInfo.id}/request_edit_access`, {
      method: 'POST',
    });
    this.setState({ requestSent: true });
    await this.props.refreshResults();
  };

  /**
   * Execute API requests to delete the request for edit
   * @method
   */
  cancelRequest = async (): Promise<void> => {
    await fetch(
      `/api/v1/link/${this.props.linkInfo.id}/cancel_request_edit_access`,
      {
        method: 'POST',
      },
    );
    this.setState({ requestSent: false });
    await this.props.refreshResults();
  };

  render(): React.ReactNode {
    const isLinkDeleted = this.props.linkInfo.deletion_info !== null;
    const isLinkExpired = this.props.linkInfo.is_expired;
    const titleClassName =
      isLinkDeleted || isLinkExpired ? 'link-title deleted' : 'link-title';

    return (
      <Row className="primary-row" justify="center">
        <Col span={20}>
          <Row>
            <Col span={24}>
              <span className={titleClassName}>
                {this.props.linkInfo.title}
              </span>

              {isLinkDeleted ? <Tag color="red">Deleted</Tag> : <></>}
              {isLinkExpired ? <Tag color="gray">Expired</Tag> : <></>}
              {!this.props.linkInfo.may_edit ? (
                <Tag color="gray">View-only</Tag>
              ) : (
                <></>
              )}
              <span className="info-span">
                <span className="info">Owner: {this.props.linkInfo.owner}</span>

                <span className="info">Visits: {this.props.linkInfo.visits}</span>

                <span className="info">
                  Unique visits: {this.props.linkInfo.unique_visits}
                </span>

                {this.props.linkInfo.expiration_time === null ? (
                  <></>
                ) : (
                  <span className="info">
                    Expires:{' '}
                    {moment(this.props.linkInfo.expiration_time).format(
                      'DD MMM YYYY',
                    )}
                  </span>
                )}

                <span className="info">
                  Created:{' '}
                  {moment(this.props.linkInfo.created_time).format('DD MMM YYYY')}
                </span>
              </span>
            </Col>
          </Row>
          {this.props.linkInfo.aliases.map((alias) => {
            const shortUrl = `https://${document.location.host}/${alias.alias}`;
            const className =
              isLinkDeleted || isLinkExpired || alias.deleted
                ? 'alias deleted'
                : 'alias';
            return (
              <Row key={alias.alias}>
                <Col>
                  <div className={className}>
                    <CopyToClipboard text={shortUrl}>
                      <Tooltip title="Copy shortened URL">
                        <Button type="text" icon={<RiFileCopy2Fill />} />
                      </Tooltip>
                    </CopyToClipboard>
                    {alias.description ? <em>({alias.description})</em> : ''}
                    &nbsp;
                    <a href={shortUrl}>{shortUrl}</a>
                    &rarr;
                    <a href={this.props.linkInfo.long_url}>
                      {this.props.linkInfo.long_url}
                    </a>
                  </div>
                </Col>
              </Row>
            );
          })}
        </Col>

        <Col span={4} className="btn-col">
          {isLinkDeleted || !this.props.linkInfo.may_edit ? (
            <></>
          ) : (
            <Tooltip title="Edit link">
              <Button
                type="text"
                icon={<RiEditBoxLine size="1.1em"/>}
                onClick={(_ev) => this.props.showEditModal(this.props.linkInfo)}
              />
            </Tooltip>
          )}

          {isLinkDeleted || !this.props.linkInfo.may_edit ? (
            <></>
          ) : (
            <Tooltip title="Manage sharing">
              <Button
                type="text"
                icon={<RiTeamLine size="1.1em"/>}
                onClick={(_ev) =>
                  this.props.showShareLinkModal(this.props.linkInfo)
                }
              />
            </Tooltip>
          )}
          <Tooltip title="Link stats">
            <Button
              type="text"
              icon={<RiFileChartLine size="1.1em"/>}
              href={`/app/#/stats/${this.props.linkInfo.id}`}
            />
          </Tooltip>
          <Tooltip title="QR code">
            <Button
              type="text"
              icon={<RiQrCodeLine size="1.1em"/>}
              onClick={(_ev) => this.props.showQrModal(this.props.linkInfo)}
            />
          </Tooltip>
          {isLinkDeleted || !this.props.linkInfo.may_edit ? (
            <></>
          ) : (
            <Popconfirm
              placement="top"
              title="Are you sure you want to delete this link?"
              onConfirm={this.confirmDelete}
              icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
            >
              <Tooltip title="Delete link">
                <Button danger type="text" icon={<RiDeleteBin6Line size="1.1em"/>} />
              </Tooltip>
            </Popconfirm>
          )}
          {this.props.linkInfo.may_edit || this.state.requestSent ? (
            <></>
          ) : (
            <Popconfirm
              placement="top"
              title="Request access to edit this link?"
              onConfirm={this.requestEditAccess}
            >
              <Tooltip title="Request edit access">
                <Button type="text" icon={<RiMailSendFill size="1.1em"/>} />
              </Tooltip>
            </Popconfirm>
          )}
          {this.props.linkInfo.may_edit || !this.state.requestSent ? (
            <></>
          ) : (
            <Popconfirm
              placement="top"
              title="Cancel request for access to edit this link?"
              onConfirm={this.cancelRequest}
            >
              <Tooltip title="Cancel request for edit access">
                <Button type="text" icon={<RiMailForbidLine size="1.1em"/>} />
              </Tooltip>
            </Popconfirm>
          )}
        </Col>
      </Row>
    );
  }
}
