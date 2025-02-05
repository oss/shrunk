import { CloudDownloadOutlined, PlusCircleFilled, ThunderboltOutlined } from "@ant-design/icons"
import { Button, Checkbox, Col, Form, Input, Modal, Row, Space } from "antd"
import React from "react"
import SearchBannedLinks from "./SearchBannedLinks"

const LookupTableHeader = () => {
    const [form] = Form.useForm();
  
    const handleConfirm = () => {
        form.validateFields().then(values => {
        console.log('Form values:', values);
        // Handle form submission
        // onCancel();
        });
    };
    
    const [showBlockLinkModal, setShowBlockLinkModal] = React.useState(false)

    const toggleShowBlockLinkModal = () => { setShowBlockLinkModal(!showBlockLinkModal) }

    return (
        <>
            <Row className="lookup-row" gutter={0} justify="space-between">

                <Space direction="horizontal">
                    <Col>
                        <Button type="text" style={{ border: '1px solid #CFCFCF' }}>
                            AI Filter <ThunderboltOutlined />
                        </Button>
                    </Col>
                
                    <SearchBannedLinks />
                </Space>
                {/* 
                <Col flex="0 0 auto" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                    <div style={{ borderLeft: '1px solid #CFCFCF', height: '100%' }} />
                </Col>
                 */}
                <Col>
                    <Row gutter={[4, 0]}>
                        <Col>
                            <Button
                            type="primary"
                            icon={<CloudDownloadOutlined />}
                            onClick={() => {}}
                            >
                            Export as CSV
                            </Button>
                        </Col>
                        <Col>
                            <Button
                            type="primary"
                            icon={<PlusCircleFilled />}
                            onClick={toggleShowBlockLinkModal}
                            >
                            Block Link
                            </Button>
                        </Col>
                    </Row>
                </Col>
            </Row>

            <Modal 
                open={showBlockLinkModal}
                onCancel={() => {setShowBlockLinkModal(false)}}
                title={"Block Link"}
                footer={[
                <Button
                        type="default"
                        key="back"
                        onClick={() => {
                            setShowBlockLinkModal(false);
                        }}
                    >
                        Cancel
                    </Button>,
                    <Button
                        type="primary"
                        key="submit"
                        onClick={() => {
                            handleConfirm();
                            setShowBlockLinkModal(false);
                        }}
                    >
                        Confirm
                    </Button>,
                ]}
                width={400}
                >
                    <Form
                        form={form}
                        layout="vertical"
                    >

                        <Form.Item
                            name="netid"
                            label="NetID:"
                            rules={[{ required: true, message: 'Enter a link to block' }]}
                        >
                            <Input placeholder="https://example.com" />
                        </Form.Item>

                        <Form.Item
                        name="comment"
                        label="Comment:"
                        >
                            <Input.TextArea 
                                placeholder="Why is this link being blocked?"
                                rows={4}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
        </>
    )
}
//    {/* TODO --> Bring back this error message */}
//   {/* <div className="error"> */}
//     {/* {errorMessage !== '' ? errorMessage : '\u00A0'}{' '} */}
//     {/* HACK: Space character to maintain height */}
//   {/* </div> */}

//   {/* TODO --> Move this to be more implicit within the filters */}
//   {/* <div className="operation-tags">
//     {appliedOperations.map((operation) => (
//       <Tag
//         key={generateOperationKey(operation)}
//         closable
//         onClose={() => deleteOperation(generateOperationKey(operation))}
//       >
//         {renderOperation(operation)}
//       </Tag>
//     ))}
//   </div> */}



export default LookupTableHeader