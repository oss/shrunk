/**
 * Implements some components used across various stats pages
 * @packageDocumentation
 */

import React from 'react';
import { Tabs, Spin } from 'antd/lib';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import UsMapData from '@highcharts/map-collection/countries/us/us-all.geo.json';
import WorldMapData from '@highcharts/map-collection/custom/world.geo.json';

// eslint-disable-next-line
require('highcharts/modules/map')(Highcharts);

/**
 * Records value of some variable in some region
 * @interface
 */
interface MapDatum {
  /**
   * The ISO code (country code or US state code) of the region
   * @property
   */
  code: string;

  /**
   * The value of the variable in the region
   * @property
   */
  value: number;
}

/**
 * GeoIP statistics for the US and the world
 * @interface
 */
export interface GeoipStats {
  /**
   * Data for US states
   * @property
   */
  us: MapDatum[];

  /**
   * Data for countries
   * @property
   */
  world: MapDatum[];
}

// TODO: make export menu work
/**
 * Which items to show in the Highcharts menu
 * @constant
 */
export const MENU_ITEMS = [
  'printChart',
  'separator',
  'downloadPNG',
  'downloadJPEG',
  'downloadSVG',
];

/**
 * The [[VisitsMap]] component displays a map from an array of [[MapDatum]]
 * @param props The props
 */
const VisitsMap: React.FC<{
  title: string;
  join: string;
  map: any;
  data: MapDatum[];
}> = (props) => {
  const options = {
    chart: { map: props.map },
    credits: { enabled: false },
    title: { text: props.title },
    subtitle: { text: '(Logarithmic scale)' },
    mapNavidation: { enabled: true },
    exporting: {
      sourceWidth: 600,
      sourceHeight: 500,
      buttons: { contextButton: { menuItems: MENU_ITEMS } },
    },
    legend: { layout: 'vertical', align: 'left', verticalAlign: 'bottom' },
    colorAxis: {
      min: 1,
      type: 'logarithmic',
      minColor: '#fce2cc',
      maxColor: '#fc580c',
    },
    series: [
      {
        name: 'Visits',
        joinBy: [props.join, 'code'],
        tooltip: { pointFormat: '{point.name}: {point.value}' },
        data: props.data,
      },
    ],
  };

  return (
    <HighchartsReact
      highcharts={Highcharts}
      constructorType="mapChart"
      options={options}
    />
  );
};

/**
 * The [[GeoipChart]] component displays the US and world data from a [[GeoipStats]]
 * object in two maps
 * @param props The props
 */
export const GeoipChart: React.FC<{ geoipStats: GeoipStats | null }> = (
  props,
) => (
  <Tabs defaultActiveKey="us">
    <Tabs.TabPane tab="US" key="us">
      {props.geoipStats === null ? (
        <Spin />
      ) : (
        <VisitsMap
          title="US visitors"
          join="postal-code"
          map={UsMapData}
          data={props.geoipStats.us}
        />
      )}
    </Tabs.TabPane>

    <Tabs.TabPane tab="World" key="world">
      {props.geoipStats === null ? (
        <Spin />
      ) : (
        <VisitsMap
          title="Worldwide visitors"
          join="iso-a2"
          map={WorldMapData}
          data={props.geoipStats.world}
        />
      )}
    </Tabs.TabPane>
  </Tabs>
);
