import React from 'react';
import { Col, Modal, QRCode, Row, Button } from 'antd/lib';
import { LinkInfo } from '../components/LinkInfo';

interface IShareModal {
  visible: boolean;
  linkInfo: LinkInfo | null;

  onCancel: () => void;
}

export default function ShareModal(props: IShareModal) {
  const size = 250;
  const isDev = process.env.NODE_ENV === 'development';
  const protocol = isDev ? 'http' : 'https';
  const alias = props.linkInfo?.aliases[0].alias;
  const shortUrl = `${protocol}://${document.location.host}/${alias}`;
  // TODO: Support multiple aliases

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
      doDownload(url, `${url}.png`);
    }
  };

  return (
    <Modal open={props.visible} onCancel={props.onCancel} footer={null}>
      <Row gutter={[16, 16]} justify="center" align="middle">
        <Col span={24}>
          <QRCode
            id="qrcode"
            errorLevel="H"
            size={size}
            iconSize={size / 4}
            value={shortUrl}
          />
        </Col>
        <Col span={24}>
          <Button onClick={downloadCanvasQRCode}>Download</Button>
        </Col>
      </Row>
    </Modal>
  );
}
