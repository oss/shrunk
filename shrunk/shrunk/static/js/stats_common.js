const MENU_ITEMS = [
    'printChart',
    'separator',
    'downloadPNG',
    'downloadJPEG',
    'downloadSVG'
];

function add_map(div_name, map_name, title, join, data) {
    Highcharts.mapChart(div_name, {
	chart: { map: map_name },
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

function show_us_map() {
    document.getElementById('us-map').style.display = '';
    document.getElementById('world-map').style.display = 'none';
}

function show_world_map() {
    document.getElementById('us-map').style.display = 'none';
    document.getElementById('world-map').style.display = '';
}
