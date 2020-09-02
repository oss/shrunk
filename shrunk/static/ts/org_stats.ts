// See comment in index.ts
import 'bootstrap';
import '../scss/org_stats.scss';

import * as Highcharts from 'highcharts';
import * as $ from 'jquery';

import {get_us_map, get_world_map} from './maps';
import {add_map, MapDatum, MENU_ITEMS} from './stats_common';

interface MemberStatsDatum {
  netid: string;
  total_visits: number;
  unique_visits: number;
}

$.getJSON(
    $('#endpoints').attr('data-stats-json-endpoint') as string,
    (data: MemberStatsDatum[]) => Highcharts.chart('member-stats-container', {
      chart: {type: 'bar'},
      title: {text: 'Visits per user'},
      exporting: {buttons: {contextButton: {menuItems: MENU_ITEMS}}},
      xAxis: {categories: data.map(doc => doc.netid), title: {text: null}},
      yAxis: {
        min: 0,
        title: {text: 'Visitors'},
        labels: {overflow: 'justify', step: 4}
      },
      legend: {
        layout: 'vectical',
        align: 'right',
        verticalAlign: 'top',
        x: -40,
        y: 80,
        borderWidth: 1,
        shadow: true
      },
      series: [
        {
          name: 'Total visits',
          color: '#FC580C',
          data: data.map(doc => doc.total_visits)
        },
        {
          name: 'Unique visits',
          color: '#FCE2CC',
          data: data.map(doc => doc.unique_visits)
        }
      ]
    }));

$.getJSON(
    $('#endpoints').attr('data-geoip-endpoint') as string,
    (data: {us: MapDatum[]; world: MapDatum[]}) => {
        Promise.all([get_us_map(), get_world_map()])
            .then(([us_map, world_map]) => {
              add_map('us-map', us_map, 'US visitors', 'postal-code', data.us);
              add_map(
                  'world-map', world_map, 'Worldwide visitors', 'iso-a2',
                  data.world);
            })});
