const url = (new URL(document.location)).searchParams.get('url');

/* ===== visits chart ===== */

function date_of_id(_id) {
    return Date.UTC(_id.year, _id.month-1, _id.day);
}

$.getJSON('/daily-visits?url=' + url,
	  function (data) {
	      const first_time_visits = data.reduce((acc, el) => acc + el.first_time_visits, 0);
	      $('#first_time_visits').text(first_time_visits);

	      Highcharts.chart('visits-container', {
		  chart: {
		      type: 'spline',
		      zoomType: 'x'
		  },
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
	mapNavigation: { enabled: true },
	exporting: {
	    sourceWidth: 600,
	    sourceHeight: 500
	},
	legend: {
	    layout: 'vertical',
	    align: 'left',
	    verticalAlign: 'bottom'
	},
	colorAxis: {
	    min: 1,
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
$.getJSON('/geoip-json?url=' + url,
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

const browser_names = {
    'Msie': 'Microsoft Edge/IE',
    'unknown': 'Unknown'
};

const browser_colors = {
    'Firefox': { background: 'rgba(244,199,133,0.2)', border: 'rgba(244,199,133,1)' },
    'Chrome': { background: 'rgba(200,240,97,0.2)', border: 'rgba(200,240,97,1)' },
    'Safari': { background: 'rgba(155,186,238,0.2)', border: 'rgba(155,186,238,1)' },
    'Msie': { background: 'rgba(136,198,247,0.2)', border: 'rgba(136,198,247,1)' },
    'Edge': { background: 'rgba(136,198,247,0.2)', border: 'rgba(136,198,247,1)' },
    'Opera': { background: 'rgba(238,120,124,0.2)', border: 'rgba(238,120,124,1)' },
    'unknown': { background: 'rgba(80,80,80,0.2)', border: 'rgba(80,80,80,1)' }
};

const browser_images = {
    'Firefox': { src: '/static/img/small-firefox-icon.png', width: 22, height: 22 },
    'Chrome': { src: '/static/img/small-chrome-icon.png', width: 22, height: 22 },
    'Safari': { src: '/static/img/small-safari-icon.png', width: 22, height: 22 },
    'Msie': { src: '/static/img/small-edge-icon.png', width: 22, height: 22 },
    'Edge': { src: '/static/img/small-edge-icon.png', width: 22, height: 22 },
    'Opera': { src: '/static/img/small-opera-icon.png', width: 22, height: 22 }
};

const platform_names = {
    'Macos': 'MacOS',
    'Iphone': 'iPhone',
    'unknown': 'Unknown'
};

/* todo: iOS, *BSD, etc? */
const platform_colors = {
    'Linux': { background: 'rgba(216,171,36,0.2)', border: 'rgba(216,171,36,1)' },
    'Windows': { background: 'rgba(129,238,208,0.2)', border: 'rgba(129,238,208,1)' },
    'Macos': { background: 'rgba(201,201,201,0.2)', border: 'rgba(201,201,201,1)' },
    'Android': { background: 'rgba(200,227,120,0.2)', border: 'rgba(200,227,120,1)' },
    'unknown': { background: 'rgba(80,80,80,0.2)', border: 'rgba(80,80,80,1)' }
};

const platform_images = {
    'Linux': { src: '/static/img/small-tux-icon.png', width: 22, height: 22},
    'Windows': { src: '/static/img/small-windows-icon.png', width: 22, height: 22},
    'Macos': { src: '/static/img/small-mac-icon.png', width: 22, height: 22},
    'Android': { src: '/static/img/small-android-icon.png', width: 22, height: 22}
};

const referer_names = {
    'facebook.com': 'Facebook',
    'twitter.com': 'Twitter',
    'instagram.com': 'Instagram',
    'reddit.com': 'Reddit',
    'unknown': 'Unknown'
};

const referer_colors = {
    'facebook.com': { background: 'rgba(0,75,150,0.2)', border: 'rgba(0,75,150,1)' },
    'twitter.com': { background: 'rgba(147,191,241,0.2)', border: 'rgba(147,191,241,1)' },
    'instagram.com': { background: 'rgba(193,131,212,0.2)', border: 'rgba(193,131,212,1)' },
    'reddit.com': { background: 'rgba(241,155,123,0.2)', border: 'rgba(241,155,123,1)' },
    'unknown': { background: 'rgba(80,80,80,0.2)', border: 'rgba(80,80,80,1)' }
};

const referer_images = {
    'facebook.com': { src: '/static/img/small-facebook-icon.png', width: 22, height: 22 },
    'twitter.com': { src: '/static/img/small-twitter-icon.png', width: 22, height: 22 },
    'instagram.com': { src: '/static/img/small-instagram-icon.png', width: 22, height: 22 },
    'reddit.com': { src: '/static/img/small-reddit-icon.png', width: 22, height: 22 }
};

/* --- code --- */

function add_pie_chart(canvas_id, title, raw_data, human_readable_names, colors, images) {
    let data = {
	labels: [],
	datasets: [{
	    label: title,
	    data: [],
	    backgroundColor: [],
	    borderColor: [],
	    borderWidth: 1
	}]
    };

    var options = {
	legend: {
	    position: 'left'
	},
	title: {
	    display: true,
	    text: title,
	    fontStyle: '',
	    fontSize: 13,
	},
	onResize: () => console.log("here")
    };

    if (images != null) {
	options.plugins = {
	    labels: {
		render: 'image',
		images: []
	    }
	};
    }

    /* add each data item to the `data` and `options` objects */
    for (var key in raw_data) {
	if (!raw_data.hasOwnProperty(key)) {
	    continue;
	}

	let human_readable_name = key;
	if (human_readable_names != null && human_readable_names.hasOwnProperty(key)) {
	    human_readable_name = human_readable_names[key];
	}

	if (colors != null && colors.hasOwnProperty(key)) {
	    var background_color = colors[key].background;
	    var border_color = colors[key].border;
	} else {
	    /* randomly generate a color */
	    const r = Math.floor(Math.random() * 255);
	    const g = Math.floor(Math.random() * 255);
	    const b = Math.floor(Math.random() * 255);
	    var background_color = 'rgba(' + r + ',' + g + ',' + b + ',' + '0.2)';
	    var border_color = 'rgba(' + r + ',' + g + ',' + b + ',' + '1)';
	}

	data.labels.push(human_readable_name);
	data.datasets[0].data.push(raw_data[key]);
	data.datasets[0].backgroundColor.push(background_color);
	data.datasets[0].borderColor.push(border_color);

	if (images != null) {
	    let image = {};
	    if (images.hasOwnProperty(key)) {
		image = images[key];
	    }
	    options.plugins.labels.images.push(image);
	}
    }

    let ctx = document.getElementById(canvas_id).getContext('2d');
    let c = new Chart(ctx, {
	type: 'doughnut',
	data: data,
	options: options
    })
    // HACK: manual resize
    c.resize = function(silent) {
	let width = 720;
	let height = 360;
	let aspect = height / width;
	if (window.innerWidth > 1200) {
	    width = 380;
	    height = 190;
	}
	if (window.innerWidth < 690) {
	    width = window.innerWidth * 0.9;
	    height = width * aspect;
	}
	this.canvas.width = this.width = width;
	this.canvas.height = this.height = height;
	this.canvas.style.width = width + "px";
	this.canvas.style.height = height + "px";
	this.update();
    }
}

/* render stats based on useragent and referer data */
(function(){
    function try_render(json, name, title, names, colors, images) {
	let canvas_id = name + '-canvas';
	let div_id = name + '-stats';
	if (json.hasOwnProperty(name)) {
	    add_pie_chart(canvas_id, title, json[name], names, colors, images)
	} else {
	    document.getElementById(div_id).style.display = 'none';
	}
    }

    const short_link = (new URL(document.location)).searchParams.get('url');
    const useragent_stats_url = '/useragent-stats?url=' + short_link;
    const referer_stats_url = '/referer-stats?url=' + short_link;

    Plotly.d3.json(useragent_stats_url, function(err, json) {
	try_render(json, 'browser', 'Browsers', browser_names, browser_colors, browser_images);
	try_render(json, 'platform', 'Platforms', platform_names, platform_colors, platform_images);
    });

    Plotly.d3.json(referer_stats_url, function(err, json) {
	if (Object.keys(json).length != 0) {
	    add_pie_chart('referer-canvas', 'Referrers', json, referer_names, referer_colors, referer_images);
	} else {
	    document.getElementById('referer-stats').style.display = 'none';
	}
    });
}());
