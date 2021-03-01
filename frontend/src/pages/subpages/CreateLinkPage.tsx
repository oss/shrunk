/**
 * Implements the [[CreateLinkPage]] component
 * @packageDocumentation
 */

import React from "react";
import { RouteComponentProps, withRouter } from "react-router-dom";

import { CreateLinkForm } from "../../components/CreateLinkForm";
import "../../Base.less";

/**
 * Props for the [[CreateLinkPage]] component
 * @interface
 */
export type Props = RouteComponentProps & {
  /**
   * The user's privileges. Used to determine whether the user is allowed
   * to set custom aliases
   * @property
   */
  userPrivileges: Set<string>;
};

/**
 * State for the [[CreateLinkPage]] component
 * @interface
 */
interface State {}

class CreateLinkPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  onFinish = () => {
    this.props.history.push("/dash");
    return Promise.resolve();
  };

  render(): React.ReactNode {
    return (
      <>
        <CreateLinkForm
          userPrivileges={this.props.userPrivileges}
          onFinish={this.onFinish}
        />
      </>
    );
  }
}

export const CreateLink = withRouter(CreateLinkPage);
