import React from 'react';
import { Tag, Tooltip } from 'antd';

export const OrgAdminTag: React.FC<{ title: string }> = (props) => {
    return (
        <Tag color='magenta'>
            <Tooltip title={props.title}>
                Admin
            </Tooltip>
        </Tag>
    );
}

export const OrgMemberTag: React.FC = (_props) => {
    return (
        <Tag color='blue'>
            <Tooltip title='You are a member of this organization.'>
                Member
            </Tooltip>
        </Tag>
    );
}
