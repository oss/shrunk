/**
 * Implements the orgs list view
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Checkbox,
  Popconfirm,
  Button,
  Dropdown,
  Form,
  Input,
  Tooltip,
  Spin,
  FloatButton,
  Typography,
} from 'antd/lib';
import { ExclamationCircleFilled, PlusCircleFilled } from '@ant-design/icons';
import { RiLineChartFill, RiToolsFill, RiDeleteBin6Line } from 'react-icons/ri';
import dayjs from 'dayjs';

import { OrgInfo, listOrgs, createOrg, deleteOrg } from '../api/Org';
import { OrgAdminTag, OrgMemberTag } from './subpages/OrgCommon';

import { serverValidateOrgName } from '../Validators';

/**
 * Props for the [[Orgs]] component
 * @interface
 */
interface Props {
  /**
   * The user's privileges
   * @property
   */
  userPrivileges: Set<string>;
}

/**
 * The [[CreateOrgForm]] component provides a dropdown form to create a new org
 * @param props The props
 */
const CreateOrgForm: React.FC<{ onCreate: (name: string) => Promise<void> }> = (
  props,
) => {
  const onFinish = async (values: { name: string }) =>
    props.onCreate(values.name);
  return (
    <div>
      <Form initialValues={{ name: '' }} onFinish={onFinish}>
        <Input.Group compact>
          <Form.Item
            name="name"
            rules={[
              { required: true, message: 'Please input a name.' },
              {
                pattern: /^[a-zA-Z0-9_.,-]*$/,
                message:
                  'Name must consist of letters, numbers, and the characters "_.,-".',
              },
              {
                max: 60,
                message: 'Org names can be at most 60 characters long',
              },
              { validator: serverValidateOrgName },
            ]}
          >
            <Input placeholder="Name" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlusCircleFilled />}
            />
          </Form.Item>
        </Input.Group>
      </Form>
    </div>
  );
};

/**
 * The [[OrgRow]] component displays information pertaining to one org
 * @param props The props
 */
const OrgRow: React.FC<{
  showAll: boolean;
  orgInfo: OrgInfo;
  onDelete: (id: string) => Promise<void>;
}> = (props) => (
  <Row>
    <Col span={20}>
      <a href={`/app/#/orgs/${props.orgInfo.id}/manage`}>
        {props.orgInfo.name}
      </a>
      {props.orgInfo.is_admin ? (
        <OrgAdminTag title="You are an administrator of this organization." />
      ) : (
        <></>
      )}
      {props.showAll && props.orgInfo.is_member ? <OrgMemberTag /> : <></>}
      <span>
        Created: {dayjs(props.orgInfo.timeCreated).format('MMM D, YYYY')}
      </span>
    </Col>
    <Col span={4}>
      <Tooltip title="Manage org">
        <Button
          type="text"
          href={`/app/#/orgs/${props.orgInfo.id}/manage`}
          icon={<RiToolsFill size="1.1em" />}
        />
      </Tooltip>
      <Tooltip title="Org stats">
        <Button
          type="text"
          icon={<RiLineChartFill size="1.1em" />}
          href={`/app/#/orgs/${props.orgInfo.id}/stats`}
        />
      </Tooltip>
      {!props.orgInfo.is_admin ? (
        <></>
      ) : (
        <Tooltip title="Delete org">
          <Popconfirm
            placement="top"
            title="Are you sure you want to delete this organization?"
            onConfirm={async () => props.onDelete(props.orgInfo.id)}
            icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
          >
            <Button
              danger
              type="text"
              icon={<RiDeleteBin6Line size="1.1em" />}
            />
          </Popconfirm>
        </Tooltip>
      )}
    </Col>
  </Row>
);

/**
 * The Orgs component implements the orgs list view
 */
export default function Orgs({ userPrivileges }: Props): React.ReactElement {
  const [showAll, setShowAll] = useState(false);
  const [orgs, setOrgs] = useState<OrgInfo[] | null>(null);
  const [createOrgFormVisible, setCreateOrgFormVisible] = useState(false);

  const refreshOrgs = async () => {
    const newOrgs = await listOrgs(showAll ? 'all' : 'user');
    setOrgs(newOrgs);
  };

  useEffect(() => {
    refreshOrgs();
  }, [showAll]);

  const onCreateOrg = async (name: string) => {
    await createOrg(name);
    setCreateOrgFormVisible(false);
    await refreshOrgs();
  };

  const onDeleteOrg = async (id: string) => {
    await deleteOrg(id);
    await refreshOrgs();
  };

  const mayCreateOrg =
    userPrivileges.has('admin') || userPrivileges.has('facstaff');
  const isAdmin = userPrivileges.has('admin');

  return (
    <>
      <Row>
        <Typography.Title>Organizations</Typography.Title>
      </Row>
      <Row>
        <Col span={8}>
          {!mayCreateOrg ? (
            <></>
          ) : (
            <Dropdown
              overlay={<CreateOrgForm onCreate={onCreateOrg} />}
              open={createOrgFormVisible}
              onVisibleChange={setCreateOrgFormVisible}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button type="primary">
                <PlusCircleFilled /> Create an Org
              </Button>
            </Dropdown>
          )}

          {!isAdmin ? (
            <></>
          ) : (
            <Checkbox
              style={{ paddingTop: '6px' }}
              defaultChecked={false}
              onChange={(ev) => setShowAll(ev.target.checked)}
            >
              Show all orgs?
            </Checkbox>
          )}
        </Col>
      </Row>

      {orgs === null ? (
        <Spin size="large" />
      ) : (
        <div>
          {orgs.length === 0 ? (
            <p>You are currently not in any organizations.</p>
          ) : (
            <div>
              {orgs.map((org) => (
                <OrgRow
                  key={org.id}
                  showAll={showAll}
                  orgInfo={org}
                  onDelete={onDeleteOrg}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
