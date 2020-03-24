// import * as Highcharts from 'highcharts';
import * as Highmaps from 'highcharts/highmaps';

export const MENU_ITEMS = [
    'printChart',
    'separator',
    'downloadPNG',
    'downloadJPEG',
    'downloadSVG'
];

export interface MapDatum {
    code: string;
    value: number;
}

export function add_map(div_name: string, map_data: any, title: string,
                        join: string, data: MapDatum[]): void {
    Highmaps.mapChart(div_name, {
        chart: { map: map_data },
        title: { text: title },
        subtitle: { text: '(Logarithmic scale)' },
        mapNavigation: { enabled: true },
        exporting: {
            sourceWidth: 600,
            sourceHeight: 500,
            buttons: { contextButton: { menuItems: MENU_ITEMS } }
        },
        legend: {
            layout: 'vertical',
            align: 'left',
            verticalAlign: 'bottom'
        },
        colorAxis: {
            min: 1,
            type: 'logarithmic',
            minColor: '#FCE2CC',
            maxColor: '#FC580C'
        },
        series: [{
            data: data,
            joinBy: [join, 'code'],
            name: 'Visits',
            tooltip: { pointFormat: '{point.name}: {point.value}' }
        }]
    });
}
