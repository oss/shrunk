import React from 'react';
import { Tabs, Spin } from 'antd';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import UsMapData from '@highcharts/map-collection/countries/us/us-all.geo.json';
import WorldMapData from '@highcharts/map-collection/custom/world.geo.json';

// eslint-disable-next-line
require('highcharts/modules/map')(Highcharts);

interface MapDatum {
    code: string;
    value: number;
}

export interface GeoipStats {
    us: MapDatum[];
    world: MapDatum[];
}

// TODO: make export menu work
export const MENU_ITEMS =
    ['printChart', 'separator', 'downloadPNG', 'downloadJPEG', 'downloadSVG'];

const VisitsMap: React.FC<{ title: string, join: string, map: any, data: MapDatum[] }> = (props) => {
    const options = {
        chart: { map: props.map },
        title: { text: props.title },
        subtitle: { text: '(Logarithmic scale)' },
        mapNavidation: { enabled: true },
        exporting: {
            sourceWidth: 600,
            sourceHeight: 500,
            buttons: { contextButton: { menuItems: MENU_ITEMS } },
        },
        legend: { layout: 'vertical', align: 'left', verticalAlign: 'bottom' },
        colorAxis: { min: 1, type: 'logarithmic', minColor: '#fce2cc', maxColor: '#fc580c' },
        series: [{
            name: 'Visits',
            joinBy: [props.join, 'code'],
            tooltip: { pointFormat: '{point.name}: {point.value}' },
            data: props.data,
        }],
    };

    return (<HighchartsReact highcharts={Highcharts} constructorType='mapChart' options={options} />);
}

export const GeoipChart: React.FC<{ geoipStats: GeoipStats | null }> = (props) => {
    return (
        <Tabs defaultActiveKey='us'>
            <Tabs.TabPane tab='US' key='us'>
                {props.geoipStats === null ? <Spin /> :
                    <VisitsMap title='US visitors' join='postal-code' map={UsMapData} data={props.geoipStats.us} />}
            </Tabs.TabPane>

            <Tabs.TabPane tab='World' key='world'>
                {props.geoipStats === null ? <Spin /> :
                    <VisitsMap title='Worldwide visitors' join='iso-a2' map={WorldMapData} data={props.geoipStats.world} />}
            </Tabs.TabPane>
        </Tabs>
    );
}
