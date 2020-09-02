// See comment in index.ts
import 'bootstrap';
import '../scss/stats.scss';

import * as Highcharts from 'highcharts';
import * as $ from 'jquery';

import {get_us_map, get_world_map} from './maps';
import {add_map, MapDatum, MENU_ITEMS} from './stats_common';

interface DataItem {
  _id: {day: number; month: number; year: number;};

  all_visits: number;
  first_time_visits: number;
}

function get_ms_since_epoch(item: DataItem): number {
  return Date.UTC(item._id.year, item._id.month - 1, item._id.day);
}

$.getJSON(
    $('#endpoints').attr('data-visits-daily-endpoint') as string,
    (data: DataItem[]) => Highcharts.chart('visits-container', {
      chart: {type: 'spline', zoomType: 'x'},
      exporting: {buttons: {contextButton: {menuItems: MENU_ITEMS}}},
      title: {text: 'Visits'},
      subtitle: {text: 'Click and drag to zoom in'},
      xAxis: {type: 'datetime', title: {text: 'Date'}},
      yAxis: {title: {text: 'Visits'}, min: 0},
      plotOptions: {spline: {marker: {enabled: true}}},
      series: [
        {
          name: 'Unique visits',
          color: '#FCE2CC',
          data: data.map(el => [get_ms_since_epoch(el), el.first_time_visits])
        },
        {
          name: 'Total visits',
          color: '#FC580C',
          data: data.map(el => [get_ms_since_epoch(el), el.all_visits])
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

const BROWSER_COLORS: Record<string, string> = {
  'Firefox': 'rgba(244,199,133,1.0)',
  'Chrome': 'rgba(200,240,97,1.0)',
  'Safari': 'rgba(155,186,238,1.0)',
  'Microsoft Internet Explorer': 'rgba(136,198,247,1.0)',
  'Microsoft Edge': 'rgba(136,198,247,1.0)',
  'Opera': 'rgba(238,120,124,1.0)',
  'Unknown': 'rgba(80,80,80,0.2)'
};

/* todo: iOS, *BSD, etc? */
const PLATFORM_COLORS: Record<string, string> = {
  'Linux': 'rgba(216,171,36,1.0)',
  'Windows': 'rgba(129,238,208,1.0)',
  'Mac': 'rgba(201,201,201,1.0)',
  'Android': 'rgba(200,227,120,1.0)',
  'Unknown': 'rgba(80,80,80,0.2)'
};

const REFERER_COLORS: Record<string, string> = {
  'Facebook': 'rgba(0,75,150,1.0)',
  'Twitter': 'rgba(147,191,241,1.0)',
  'Instagram': 'rgba(193,131,212,1.0)',
  'Reddit': 'rgba(241,155,123,1.0)',
  'Unknown': 'rgba(80,80,80,0.2)'
};

function make_pie_chart(container: string, title: string, data: any): void {
  Highcharts.chart(container, {
    chart: {
      plotBackgroundColor: null,
      plotBorderWidth: null,
      plotShadow: false,
      type: 'pie'
    },
    exporting: {buttons: {contextButton: {menuItems: MENU_ITEMS}}},
    title: {text: title},
    tooltip: {pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'},
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        showInLegend: true,
        dataLabels: {
          enabled: false,
          format: '<b>{point.name}</b>: {point.percentage:.1f}%'
        }
      }
    },
    series: [{name: 'Referrers', colorByPoint: true, data: data}]
  });
}

interface PieChartData {
  name: string;
  y: number;
  color: string;
}

$.getJSON($('#endpoints').attr('data-referer-endpoint') as string, (json) => {
  const data: PieChartData[] = [];
  Object.keys(json).forEach((key) => {
    data.push({name: key, y: json[key], color: REFERER_COLORS[key]});
  });

  make_pie_chart('referer-stats', 'Referrer Statistics', data);
});

$.getJSON($('#endpoints').attr('data-useragent-endpoint') as string, (json) => {
  const browsers: PieChartData[] = [];
  const platforms: PieChartData[] = [];

  Object.keys(json.browser).forEach((key) => {
    browsers.push(
        {name: key, y: json.browser[key], color: BROWSER_COLORS[key]});
  });

  Object.keys(json.platform).forEach((key) => {
    platforms.push(
        {name: key, y: json.platform[key], color: PLATFORM_COLORS[key]});
  });

  make_pie_chart('browser-stats', 'Browser Statistics', browsers);
  make_pie_chart('platform-stats', 'Platform Statistics', platforms);
});
