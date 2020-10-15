import React from 'react';
import { Row, Col } from 'antd';
import { Link } from 'react-router-dom';

import './Faq.less';

export const Faq: React.FC = (_props) => {
    return (
        <div className='faq'>
            <Row className='primary-row'>
                <Col span={24}>
                    <span className='page-title'>
                        Frequently Asked Questions
                    </span>
                </Col>
            </Row>

            <Row>
                <Col>
                    <h1>What is Go?</h1>
                    <p>Go is the official URL shortener of Rutgers University.</p>
                </Col>
            </Row>

            <Row>
                <Col>
                    <h1>Who has access to Go?</h1>
                    <p>All current Rutgers University faculty and staff members are able
                    to log into <a href='https://go.rutgers.edu/'>go.rutgers.edu</a> using
                    their NetID and password. Undergraduate student workers can be granted
                    access to Go by a faculty or staff members.</p>
                </Col>
            </Row>

            <Row>
                <Col>
                    <h1>Can I choose the URL my link will be shortened to?</h1>
                    <p>To create a custom short URL, you must have the &ldquo;power user&rdquo; role.
                    This role is available only to faculty and staff members. To request to
                    be added to this role, please email&nbsp;
                    <a href='mailto:oss@oss.rutgers.edu'>oss@oss.rutgers.edu</a>.</p>
                </Col>
            </Row>

            <Row>
                <Col>
                    <h1>How can I grant an undergraduate student worker access to Go?</h1>
                    <p>To grant access to an undergraduate user, click the&nbsp;
                        <Link to='/roles/whitelisted'>Whitelist </Link>
                    tab in the navigation bar, then enter the user&rsquo;s NetID and the
                    reason the user needs access to Go. Undergraduate users should only use Go for
                    purposes related to their employment with the University.</p>
                </Col>
            </Row>

            <Row>
                <Col>
                    <h1>What is the organizations feature?</h1>
                    <p>The organizations feature allows a group of users to view each other&rsquo;s links.
                    For example, users working together on a project may want to be able to see
                    each other&rsquo;s links.</p>
                </Col>
            </Row>

            <Row>
                <Col>
                    <h1>How can I use the organizations feature?</h1>
                    <p>To create a new organization, navigate to the <Link to='/orgs'>Organizations </Link>
                    page and click the &ldquo;Create an Organization&rdquo; button. You will automatically be made
                    an administrator of the newly created organization. Once the organization has been
                    created, you may navigate to its management page and use the &ldquo;Add a Member&rdquo; button
                    to add members to the organization.</p>

                    <p>To view the links created by members of an organization,
                    click the &ldquo;My Links&rdquo; dropdown next to the search bar, and
                    select the organization whose links you would like to view.</p>
                </Col>
            </Row>
        </div >
    );
}
