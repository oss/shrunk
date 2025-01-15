import React from 'react';
import { Col, Modal, QRCode, Row, Button, Input, Space } from 'antd/lib';
import { LinkInfo } from '../components/LinkInfo';

interface IShareModal {
  visible: boolean;
  linkInfo: LinkInfo | null;

  onCancel: () => void;
}

function doDownload(url: string, fileName: string) {
  const a = document.createElement('a');
  a.download = fileName;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const downloadCanvasQRCode = () => {
  const canvas = document
    .getElementById('qrcode')
    ?.querySelector<HTMLCanvasElement>('canvas');
  if (canvas) {
    const url = canvas.toDataURL();
    doDownload(url, 'QRCode.png');
  }
};

export default function ShareModal(props: IShareModal) {
  const size = 250;
  const isDev = process.env.NODE_ENV === 'development';
  const protocol = isDev ? 'http' : 'https';
  const alias = props.linkInfo?.aliases[0].alias;
  const shortUrl = `${protocol}://${document.location.host}/${alias}`;
  // TODO: Support multiple aliases

  return (
    <Modal
      open={props.visible}
      title="Share"
      onCancel={props.onCancel}
      footer={null}
      width="40%"
    >
      <Col>
        <Row justify="center" align="middle">
          <Col>
            <QRCode
              style={{ margin: '12px' }}
              id="qrcode"
              errorLevel="H"
              size={size}
              iconSize={size / 4}
              value={shortUrl}
            />
          </Col>
          <Col>
            <Space direction="vertical" size="small">
              <Space>
                <Input
                  htmlSize={shortUrl.length}
                  placeholder={shortUrl}
                  disabled
                />
              </Space>
              <Space>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(shortUrl);
                  }}
                >
                  Copy URL
                </Button>
                <Button onClick={downloadCanvasQRCode}>Download QR Code</Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Col>
    </Modal>
  );
}
