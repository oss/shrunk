/**
 * Implements the QR code modal
 * @packageDocumentation
 */

import React from 'react';
import { Modal, Row, Col, Select, Space, Button } from 'antd';
import QRCodeReact from 'qrcode.react';

import { LinkInfo } from './LinkInfo';
import './QrCode.less';

/**
 * Props for the [[QrCodeModal]] component
 * @interface
 */
export interface Props {
  /**
   * Whether the modal is vilible
   * @property
   */
  visible: boolean;

  /**
   * The [[LinkInfo]] of the link for which to display QR codes
   * @property
   */
  linkInfo: LinkInfo;

  /**
   * The width of the QR code
   * @property
   */
  width: number;

  /**
   * Callback called when the modal is closed
   * @property
   */
  onCancel: () => void;
}

/**
 * State for the [[QrCodeModal]] component
 * @interface
 */
export interface State {
  /**
   * The currently selected alias
   * @property
   */
  selectedAlias: string | null;

  /**
   * The short URL (e.g. `https://go.rutgers.edu/<alias>`) corresponding to
   * the currently selected alias
   * @property
   */
  selectedShortUrl: string | null;
}

/**
 * The [[QrCodeModal]] component implements the QR code modal as used on the dashboard
 * @class
 */
export class QrCodeModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      selectedAlias: null,
      selectedShortUrl: null,
    };
  }

  componentDidMount(): void {
    this.resetAlias();
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.props !== prevProps) {
      this.resetAlias();
    }
  }

  /**
   * Set the currently active alias to the first alias of the link
   * @method
   */
  resetAlias = (): void => {
    const { linkInfo } = this.props;
    if (linkInfo === null || linkInfo.aliases.length === 0) {
      return;
    }

    this.setAlias(linkInfo.aliases[0].alias);
  };

  /**
   * Update the selected alias and selected short URL
   * @method
   * @param alias The new alias
   */
  setAlias = (alias: string): void => {
    this.setState({
      selectedAlias: alias,
      selectedShortUrl: `${window.location.origin}/${alias}`,
    });
  };

  /**
   * Get a data URL of the QR code image
   * @method
   */
  getQrDataUrl = (): string => {
    const canvasCol = document.getElementsByClassName('qrcode-canvas');
    if (canvasCol.length === 0) {
      throw new Error('could not find QR code canvas');
    }

    const canvas = canvasCol[0] as HTMLCanvasElement;
    return canvas.toDataURL('image/png');
  };

  /**
   * Open a popup window containing the QR code and prompt the user to print it
   * @method
   */
  onPrint = (): void => {
    const popup = window.open();
    if (popup === null) {
      throw new Error('could not open window to print QR code');
    }

    popup.document.write(`
            <!DOCTYPE html>
            <html>
                <body>
                    <img src="${this.getQrDataUrl()}" />
                </body>
            </html>`);
    popup.focus();
    popup.print();
  };

  /**
   * Prompt the user to download the QR code for the selected alias
   * @method
   */
  onDownload = (): void => {
    const dlLink = document.createElement('a');
    dlLink.download = `${this.state.selectedAlias}.png`;
    dlLink.href = this.getQrDataUrl();
    document.body.appendChild(dlLink);
    dlLink.click();
  };

  render(): React.ReactNode {
    if (this.props.linkInfo === null) {
      return <></>;
    }

    const aliases = this.props.linkInfo.aliases.filter(
      (alias) => !alias.deleted,
    );

    return (
      <Modal
        visible={this.props.visible}
        title="QR code"
        onCancel={this.props.onCancel}
        width={this.props.width + 2 * 24}
        className="qr-modal"
        footer={
          <Space>
            <Button onClick={this.onPrint}>Print</Button>
            <Button onClick={this.onDownload}>Download</Button>
          </Space>
        }
      >
        {aliases.length <= 1 ? (
          <></>
        ) : (
          <Row>
            <Col>
              <Select
                onSelect={this.setAlias}
                defaultValue={aliases[0].alias}
                className="select"
                style={{ width: this.props.width }}
              >
                {aliases.map((alias) => (
                  <Select.Option key={alias.alias} value={alias.alias}>
                    {alias.alias}&nbsp;
                    {alias.description ? <em>({alias.description})</em> : <></>}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        )}

        {this.state.selectedShortUrl === null ? (
          <></>
        ) : (
          <Row>
            <Col>
              <QRCodeReact
                value={this.state.selectedShortUrl}
                className="qrcode-canvas"
                size={this.props.width}
              />
            </Col>
          </Row>
        )}
      </Modal>
    );
  }
}
