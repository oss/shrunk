import React from 'react';
import { Modal, Row, Col, Select, Space, Button } from 'antd';
import QRCodeReact from 'qrcode.react';

import { LinkInfo } from './LinkInfo';
import './QrCode.less';

export interface Props {
    visible: boolean;
    linkInfo: LinkInfo;
    width: number;
    onCancel: () => void;
}

export interface State {
    selectedAlias: string | null;
    selectedShortUrl: string | null;
}

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

    resetAlias = (): void => {
        const linkInfo = this.props.linkInfo;
        if (linkInfo === null || linkInfo.aliases.length === 0) {
            return;
        }

        this.setAlias(linkInfo.aliases[0].alias);
    }

    setAlias = (alias: string): void => {
        this.setState({
            selectedAlias: alias,
            selectedShortUrl: `https://${location.origin}/${alias}`,
        });
    }

    getQrDataUrl = (): string => {
        const canvasCol = document.getElementsByClassName('qrcode-canvas');
        if (canvasCol.length === 0) {
            throw new Error('could not find QR code canvas');
        }

        const canvas = canvasCol[0] as HTMLCanvasElement;
        return canvas.toDataURL('image/png');
    }

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
    }

    onDownload = (): void => {
        const dlLink = document.createElement('a');
        dlLink.download = `${this.state.selectedAlias}.png`;
        dlLink.href = this.getQrDataUrl();
        document.body.appendChild(dlLink);
        dlLink.click();
    }

    render(): React.ReactNode {
        if (this.props.linkInfo === null) {
            return (<></>);
        }

        const aliases = this.props.linkInfo.aliases.filter(alias => !alias.deleted);

        return (
            <Modal
                visible={this.props.visible}
                title='QR code'
                onCancel={this.props.onCancel}
                width={this.props.width + 2 * 24}
                className='qr-modal'
                footer={
                    <Space>
                        <Button onClick={this.onPrint}>Print</Button>
                        <Button onClick={this.onDownload}>Download</Button>
                    </Space>
                }>
                {aliases.length <= 1 ? <></> :
                    <Row>
                        <Col>
                            <Select onSelect={this.setAlias} defaultValue={aliases[0].alias} className='select' style={{ width: this.props.width }}>
                                {aliases.map(alias => (
                                    <Select.Option key={alias.alias} value={alias.alias}>
                                        {alias.alias}&nbsp;{alias.description ? <em>({alias.description})</em> : <></>}
                                    </Select.Option>))}
                            </Select>
                        </Col>
                    </Row>}

                {this.state.selectedShortUrl === null ? <></> :
                    <Row>
                        <Col>
                            <QRCodeReact value={this.state.selectedShortUrl} className='qrcode-canvas' size={this.props.width} />
                        </Col>
                    </Row>}
            </Modal>
        );
    }
}
