$('#ad_blocker_message').remove();

const MENU_ITEMS = [
    'printChart',
    'separator',
    'downloadPNG',
    'downloadJPEG',
    'downloadSVG'
];

const url = (new URL(document.location)).searchParams.get('url');

/* ===== visits chart ===== */

function date_of_id(_id) {
    return Date.UTC(_id.year, _id.month-1, _id.day);
}

$.getJSON('/stat/visits/daily?url=' + url,
	  function (data) {
	      const first_time_visits = data.reduce((acc, el) => acc + el.first_time_visits, 0);
	      $('#first_time_visits').text(first_time_visits);

	      Highcharts.chart('visits-container', {
		  chart: {
		      type: 'spline',
		      zoomType: 'x'
		  },
		  exporting: { buttons: { contextButton: { menuItems: MENU_ITEMS } } },
		  title: { text: 'Visits' },
		  subtitle: { text: 'Click and drag to zoom in' },
		  xAxis: {
		      type: 'datetime',
		      title: { text: 'Date' }
		  },
		  yAxis: {
		      title: { text: 'Visits' },
		      min: 0
		  },
		  plotOptions: {
		      spline: { marker: { enabled: true } }
		  },
		  series: [{
		      name: 'First time visits',
		      color: '#FCE2CC',
		      data: data.map(el => [date_of_id(el._id), el.first_time_visits])
		  }, {
		      name: 'Total visits',
		      color: '#FC580C',
		      data: data.map(el => [date_of_id(el._id), el.all_visits])
		  }]
	      })
	  });

/* ===== choropleths of visitor locations ===== */

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

// Add both US and world maps
$.getJSON('/stat/geoip?url=' + url,
	  function (data) {
	      add_map('us-map', 'countries/us/us-all', 'US visitors',
		       'postal-code', data['us']);
	      add_map('world-map', 'custom/world', 'Worldwide visitors',
		       'iso-a2', data['world']);
	  });


function show_us_map() {
    document.getElementById('us-map').style.display = '';
    document.getElementById('world-map').style.display = 'none';
}

function show_world_map() {
    document.getElementById('us-map').style.display = 'none';
    document.getElementById('world-map').style.display = '';
}

// Initially only display the US map
show_us_map();

/* ===== pie/doughnut charts of various statistics ===== */

/* --- data --- */

const browser_colors = {
    'Firefox': 'rgba(244,199,133,1.0)',
    'Chrome': 'rgba(200,240,97,1.0)',
    'Safari': 'rgba(155,186,238,1.0)',
    'Microsoft Internet Explorer': 'rgba(136,198,247,1.0)',
    'Microsoft Edge': 'rgba(136,198,247,1.0)',
    'Opera': 'rgba(238,120,124,1.0)',
    'Unknown': 'rgba(80,80,80,0.2)'
};

/* todo: iOS, *BSD, etc? */
const platform_colors = {
    'Linux': 'rgba(216,171,36,1.0)',
    'Windows': 'rgba(129,238,208,1.0)',
    'Mac': 'rgba(201,201,201,1.0)',
    'Android': 'rgba(200,227,120,1.0)',
    'Unknown': 'rgba(80,80,80,0.2)'
};

const referer_colors = {
    'Facebook': 'rgba(0,75,150,1.0)',
    'Twitter': 'rgba(147,191,241,1.0)',
    'Instagram': 'rgba(193,131,212,1.0)',
    'Reddit': 'rgba(241,155,123,1.0)',
    'Unknown': 'rgba(80,80,80,0.2)'
};

function make_pie_chart(container, title, data) {
    Highcharts.chart(container, {
	chart: {
	    plotBackgroundColor: null,
	    plotBorderWidth: null,
	    plotShadow: false,
	    type: 'pie'
	},
	exporting: { buttons: { contextButton: { menuItems: MENU_ITEMS } } },
	title: { text: title },
	tooltip: {
	    pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
	},
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
	series: [{
	    name: 'Referrers',
	    colorByPoint: true,
	    data: data
	}]
    });
}

$.getJSON('/stat/referer?url=' + url,
	  function (json) {
	      let data = [];
	      Object.keys(json).forEach(function(key) {
		  data.push({ name: key, y: json[key], color: referer_colors[key] });
	      });

	      make_pie_chart('referer-stats', 'Referrer Statistics', data);
	  });

$.getJSON('/stat/useragent?url=' + url,
	  function (json) {
	      let browsers = [];
	      let platforms = [];

	      Object.keys(json.browser).forEach(function(key) {
		  browsers.push({ name: key, y: json.browser[key], color: browser_colors[key] });
	      });

	      Object.keys(json.platform).forEach(function(key) {
		  platforms.push({ name: key, y: json.platform[key],
				   color: platform_colors[key] });
	      });

	      make_pie_chart('browser-stats', 'Browser Statistics', browsers);
	      make_pie_chart('platform-stats', 'Platform Statistics', platforms);
	  });
