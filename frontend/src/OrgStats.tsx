import React from 'react';
import { Spin, Row, Col } from 'antd';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

import { OrgInfo } from './api/Org';
import { GeoipStats, MENU_ITEMS, GeoipChart } from './StatsCommon';

export interface Props {
    id: string;
}

interface VisitDatum {
    netid: string;
    total_visits: number;
    unique_visits: number;
}

const VisitsChart: React.FC<{ visitStats: VisitDatum[] | null }> = (props) => {
    if (props.visitStats === null) {
        return (<Spin />);
    }

    const options = {
        chart: { type: 'bar' },
        title: { text: 'Visits per user' },
        exporting: { buttons: { contextButton: { menuItems: MENU_ITEMS } } },
        xAxis: { categories: props.visitStats.map(datum => datum.netid), title: { text: 'User' } },
        yAxis: { min: 0, title: { text: 'Visitors' }, labels: { overflow: 'justify', step: 4 } },
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'top',
            x: -40,
            y: 80,
            borderWidth: 1,
        },
        series: [
            {
                name: 'Total visits',
                color: '#fc580c',
                data: props.visitStats.map(datum => datum.total_visits),
            },
            {
                name: 'Unique visits',
                color: '#fce2cc',
                data: props.visitStats.map(datum => datum.unique_visits),
            },
        ],
    };

    return (<HighchartsReact highcharts={Highcharts} options={options} />);
}

interface State {
    info: OrgInfo | null;
    visitStats: VisitDatum[] | null;
    geoipStats: GeoipStats | null;
}

export class OrgStats extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            info: null,
            visitStats: null,
            geoipStats: null,
        };
    }

    async componentDidMount(): Promise<void> {
        await this.refreshOrgInfo();
    }

    async componentDidUpdate(prevProps: Props): Promise<void> {
        if (prevProps !== this.props) {
            await this.refreshOrgInfo();
        }
    }

    refreshOrgInfo = async (): Promise<void> => {
        const infoPromise = await fetch(`/api/v1/org/${this.props.id}`)
            .then(resp => resp.json())
            .then(json => this.setState({ info: json as OrgInfo }));
        const visitStatsPromise = await fetch(`/api/v1/org/${this.props.id}/stats/visits`, { method: 'GET' })
            .then(resp => resp.json())
            .then(json => this.setState({ visitStats: json['visits'] as VisitDatum[] }));
        const geoipStatsPromise = await fetch(`/api/v1/org/${this.props.id}/stats/geoip`, { method: 'GET' })
            .then(resp => resp.json())
            .then(json => this.setState({ geoipStats: json['geoip'] as GeoipStats }));
        await Promise.all([infoPromise, visitStatsPromise, geoipStatsPromise]);
    }

    render(): React.ReactNode {
        return (
            <>
                <Row className='primary-row'>
                    <Col span={24}>
                        {this.state.info === null ? <Spin size='small' /> :
                            <span className='page-title'>Statistics for organization <em>{this.state.info.name}</em></span>}
                    </Col>
                </Row>

                <Row className='primary-row'>
                    <Col span={24}>
                        <VisitsChart visitStats={this.state.visitStats} />
                    </Col>
                </Row>

                <Row className='primary-row'>
                    <Col span={24}>
                        <GeoipChart geoipStats={this.state.geoipStats} />
                    </Col>
                </Row>
            </>
        );
    }
}
