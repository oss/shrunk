/**
 * Implements the [[Role]] component
 * @packageDocumentation
 */

import React from 'react';
import { Row, Col, Spin, Button, Popconfirm, Form, Input } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import base32 from 'hi-base32';
import moment from 'moment';

/**
 * Props for the [[Role]] component
 * @interface
 */
export interface Props {
  /**
   * The user's privileges, used to determine whether the user is allowed
   * to edit the present role
   * @property
   */
  userPrivileges: Set<string>;

  /**
   * The role's name (internal identifier, not the display name)
   * @property
   */
  name: string;
}

/**
 * A role's display text as fetched from the backend
 * @interface
 */
interface RoleText {
  title: string;
  invalid: string;
  grant_title: string;
  grantee_text: string;
  grant_button: string;
  revoke_title: string;
  revoke_button: string;
  empty: string;
  granted_by: string;
  allow_comment: boolean;
  comment_prompt: string;
}

/**
 * Entity information as fetched from the backend
 * @interface
 */
interface EntityInfo {
  /**
   * The name of the entity
   * @property
   */
  entity: string;

  /**
   * The NetID of the user who granted the role to the entity
   * @property
   */
  granted_by: string;

  /**
   * The comment, or `null` if not present
   * @property
   */
  comment: string | null;
  time_granted: Date | null;
}

/**
 * The [[GrantForm]] component allows the user to grant a role to a new entity.
 * It performs async input validation and executes the API query to grant the role
 * after the user submits the form
 * @function
 * @param props Props
 */
const GrantForm: React.FC<{
  role: string;
  roleText: RoleText;
  onCreate: (entity: string, comment: string) => Promise<void>;
}> = (props) => {
  const [form] = Form.useForm();
  const serverValidateEntity = async (
    _rule: any,
    value: string,
  ): Promise<void> => {
    if (!value) {
      return;
    }
    const entity = base32.encode(value);
    const result = await fetch(
      `/api/v1/role/${props.role}/validate_entity/${entity}`,
    ).then((resp) => resp.json());
    if (!result.valid) {
      throw new Error(result.reason);
    }
  };
  const onFinish = async (values: {
    entity: string;
    comment?: string;
  }): Promise<void> => {
    const comment = values.comment ? values.comment : '';
    await props.onCreate(values.entity, comment);
    form.resetFields();
  };
  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      {!props.roleText.allow_comment ? (
        <></>
      ) : (
        <Form.Item
          name="comment"
          rules={[{ required: true, message: 'Please enter a comment.' }]}
        >
          <Input.TextArea
            rows={4}
            placeholder={props.roleText.comment_prompt}
          />
        </Form.Item>
      )}

      <Input.Group compact>
        <Form.Item
          name="entity"
          rules={[
            { required: true, message: 'Please enter a value.' },
            { validator: serverValidateEntity },
          ]}
        >
          <Input placeholder={props.roleText.grantee_text} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            {props.roleText.grant_button}
          </Button>
        </Form.Item>
      </Input.Group>
    </Form>
  );
};

/**
 * The [[EntityRow]] component displays one row in the listing of entities.
 * It provides a delete button which removes the entity from the role
 * @function
 * @param props Props
 */
const EntityRow: React.FC<{
  roleText: RoleText;
  info: EntityInfo;
  onRevoke: (entity: string) => Promise<void>;
}> = (props) => (
  <Row className="primary-row">
    <Col span={20}>
      <Row>
        <Col span={24}>
          <span className="title">{props.info.entity}</span>
        </Col>
      </Row>
      <Row>
        <Col span={24}>
          <span>
            <em>{props.roleText.granted_by}:</em>&nbsp;{props.info.granted_by}
          </span>
        </Col>
      </Row>
      {props.info.comment === null || props.info.comment === '' ? (
        <></>
      ) : (
        <Row>
          <Col span={24}>
            <span>
              <em>Comment:</em>&nbsp;{props.info.comment}
            </span>
          </Col>
        </Row>
      )}
      {props.info.time_granted === null ? (
        <></>
      ) : (
        <Row>
          <Col span={24}>
            <span>
              <em>Date granted:</em>&nbsp;
              {moment(props.info.time_granted).format('MMM D, YYYY')}
            </span>
          </Col>
        </Row>
      )}
    </Col>
    <Col span={4} className="btn-col">
      <Popconfirm
        placement="top"
        title="Are you sure?"
        onConfirm={async () => props.onRevoke(props.info.entity)}
        icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
      >
        <Button danger>{props.roleText.revoke_button}</Button>
      </Popconfirm>
    </Col>
  </Row>
);

/**
 * State for the [[Role]] component
 * @interface
 */
interface State {
  /**
   * Whether the user has permission to view this role. If `false`, an error message
   * is displayed
   * @property
   */
  hasPermission: boolean;

  /**
   * The display text for the role
   * @property
   */
  roleText: RoleText | null;

  /**
   * The entities that have the role
   * @property
   */
  entities: EntityInfo[] | null;
}

/**
 * The [[Role]] component allows the user to view, add, and delete entities with
 * a particular role
 * @class
 */
export class Role extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasPermission: true,
      roleText: null,
      entities: null,
    };
  }

  async componentDidMount(): Promise<void> {
    this.updateHasPermission();
    await this.updateRoleInfo();
  }

  async componentDidUpdate(prevProps: Props): Promise<void> {
    if (prevProps !== this.props) {
      this.updateHasPermission();
      await this.updateRoleInfo();
    }
  }

  /**
   * Determine whether the user has permission to view/edit the given
   * role based on the role name and the user's permissions
   * @method
   */
  updateHasPermission = (): void => {
    let hasPermission = false;

    if (
      this.props.name === 'whitelisted' &&
      this.props.userPrivileges.has('facstaff')
    ) {
      hasPermission = true;
    }

    if (this.props.userPrivileges.has('admin')) {
      hasPermission = true;
    }

    this.setState({ hasPermission });
  };

  /**
   * Fetch the role text and role entities from the backend
   * @method
   */
  updateRoleInfo = async (): Promise<void> => {
    const updateText = this.updateRoleText();
    const updateEntities = this.updateRoleEntities();
    await Promise.all([updateText, updateEntities]);
  };

  /**
   * Fetch the role text from the backend
   * @method
   */
  updateRoleText = async (): Promise<void> => {
    const result = await fetch(`/api/v1/role/${this.props.name}/text`).then(
      (resp) => resp.json(),
    );
    this.setState({ roleText: result.text as RoleText });
  };

  /**
   * Fetch the role entities from the backend
   * @method
   */
  updateRoleEntities = async (): Promise<void> => {
    const result = await fetch(`/api/v1/role/${this.props.name}/entity`).then(
      (resp) => resp.json(),
    );
    this.setState({ entities: result.entities as EntityInfo[] });
  };

  /**
   * Execute API requests to grant the role to a new entity
   * @method
   * @param entity The entity to which to grant the role
   * @param comment The comment
   */
  onGrant = async (entity: string, comment: string): Promise<void> => {
    const encodedEntity = base32.encode(entity);
    await fetch(`/api/v1/role/${this.props.name}/entity/${encodedEntity}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    await this.updateRoleEntities();
  };

  /**
   * Execute API requests to revoke a role from an entity
   * @method
   * @param entity The entity from which to revoke the role
   */
  onRevoke = async (entity: string): Promise<void> => {
    const encodedEntity = base32.encode(entity);
    await fetch(`/api/v1/role/${this.props.name}/entity/${encodedEntity}`, {
      method: 'DELETE',
    });
    await this.updateRoleEntities();
  };

  render(): React.ReactNode {
    if (!this.state.hasPermission) {
      return (
        <Row className="primary-row">
          <Col span={24}>
            <span className="page-title">
              You do not have permission to edit this role.
            </span>
          </Col>
        </Row>
      );
    }

    if (this.state.roleText === null) {
      return <Spin size="large" />;
    }

    return (
      <>
        <Row className="primary-row">
          <Col span={24}>
            <span className="page-title">
              {this.state.roleText.grant_title}
            </span>
          </Col>
        </Row>

        <Row className="primary-row">
          <Col span={24}>
            <GrantForm
              role={this.props.name}
              roleText={this.state.roleText}
              onCreate={this.onGrant}
            />
          </Col>
        </Row>

        {this.state.entities === null ? (
          <Spin size="large" />
        ) : (
          this.state.entities.map((entity) => (
            <EntityRow
              key={entity.entity}
              roleText={this.state.roleText!}
              info={entity}
              onRevoke={this.onRevoke}
            />
          ))
        )}
      </>
    );
  }
}
