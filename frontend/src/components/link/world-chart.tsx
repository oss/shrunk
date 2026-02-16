import React, { useState } from 'react';
import { Select, Row, Col, Flex } from 'antd';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsMapModule from 'highcharts/modules/map';
import unitedStatesData from '@highcharts/map-collection/countries/us/us-all.geo.json';
import worldData from '@highcharts/map-collection/custom/world.geo.json';
import { GeoipStats, MapDatum, StatMap } from '@/interfaces/link';

HighchartsMapModule(Highcharts);

const VisitsMap: React.FC<{
  join: string;
  map: any;
  data: MapDatum[];
}> = (props) => {
  const options = {
    chart: { map: props.map },
    credits: { enabled: false },
    title: { text: '' },
    mapNavidation: { enabled: true },
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

const GeoipChart: React.FC<{ data?: GeoipStats }> = (props) => {
  const [mapType, setMapType] = useState<StatMap>(StatMap.UnitedStates);

  if (!props.data) {
    return <></>;
  }

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Flex justify="center">
          <Select
            defaultValue={StatMap.UnitedStates}
            className="tw-w-36"
            onChange={(value: StatMap) => {
              setMapType(value);
            }}
            options={[
              { value: StatMap.UnitedStates, label: 'United States' },
              { value: StatMap.World, label: 'World' },
            ]}
          />
        </Flex>
      </Col>
      <Col span={24}>
        {mapType === StatMap.UnitedStates && (
          <VisitsMap
            join="postal-code"
            map={unitedStatesData}
            data={props.data.us}
          />
        )}
        {mapType === StatMap.World && (
          <VisitsMap join="iso-a2" map={worldData} data={props.data.world} />
        )}
      </Col>
    </Row>
  );
};

export default GeoipChart;
