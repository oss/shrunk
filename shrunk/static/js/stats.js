(function(){
    let first_time_visits_elem=d3.select("#first_time_visits");
    let start_options=d3.select("#start");
    let end_options=d3.select("#end")
    let all_months=[];

    let url=new URL(document.location);
    const short_url=url.searchParams.get("url");

    const add_visits_chart = function(visits){
	if(visits.length<2){
	    d3.select("#nodata").text("Not enough data for a chart");
	    return visits;
	}
	const margin = {top: 20, right: 20, bottom: 30, left: 50};
	const width = 700 - margin.left - margin.right;
	const height = 500 - margin.top - margin.bottom;

	// parse the date / time
	const parseTime = d3.timeParse("%Y-%m");

	// set the ranges
	let scale_time = d3.scaleTime().range([0, width]);
	let scale_visits = d3.scaleLinear().range([height, 0]);

	// define the line
	const all_visits_line = d3.line()
	    .x(d=>scale_time(d.date))
	    .y(d=>scale_visits(d.all_visits));
	const first_visits_line = d3.line()
	    .x(d=>scale_time(d.date))
	    .y(d=>scale_visits(d.first_time_visits));

	//clear the svg first
	d3.select("svg > *").remove();

	// append the svg obgect to the body of the page
	// appends a 'group' element to 'svg'
	// moves the 'group' element to the top left margin
	let svg = d3.select("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	    .append("g")
	    .attr("transform",
		  "translate(" + margin.left + "," + margin.top + ")");

	// format the dates
	visits.forEach(visit=>{
	    visit.date = parseTime(visit._id.year+"-"+visit._id.month);
	});

	// Scale the range of the data
	scale_time.domain(d3.extent(visits, d=>d.date));
	scale_visits.domain([0, d3.max(visits, d=>d.all_visits)]);

	// Add the valueline path.
	svg.append("path")
	    .data([visits])
	    .attr("class", "line")
	    .attr("d", all_visits_line)
	    .attr("stroke", "steelblue")
	    .attr("fill", "none")
	    .attr("stroke-width", "2px");

	svg.append("path")
	    .data([visits])
	    .attr("class", "line")
	    .attr("d", first_visits_line)
	    .attr("stroke", "orange")
	    .attr("fill", "none")
	    .attr("stroke-width", "2px");

	// Add the Time Axis
	svg.append("g")
	    .attr("transform", "translate(0," + height + ")")
	    .call(d3.axisBottom(scale_time));

	// Add the Visits Axis
	svg.append("g")
	    .call(d3.axisLeft(scale_visits));
	return visits;
    }

    const add_ranges = function(monthly_visits){
	// you cant start from the last month or end on the first
	for(let i=0;i<monthly_visits.length-1;i++){
	    let month=monthly_visits[i]
	    start_options
		.append("option")
		.text(month._id.month+"-"+month._id.year)
		.attr("value", i)
	}
	//reversed to default to last month
	for(let i=monthly_visits.length-1;i>0;i--){
	    let month=monthly_visits[i]
	    end_options
		.append("option")
		.text(month._id.month+"-"+month._id.year)
		.attr("value", i)
	}
    }

    const empty_month = function(month, year){
	return {
	    _id:{
		month: month,
		year:  year
	    },
	    all_visits: 0,
	    first_time_visits: 0
	}
    }

    /**
     * if there is now view data for a month there is no months object
     * for that month and it creates a gap in the chart. this fills in the
     * gaps
     */
    const add_missing_months = function(months){
	let new_months=[months[0]];
	for(let i=1;i<months.length;){
	    const last_month=new_months[new_months.length-1]._id.month;
	    const next_month=months[i]._id.month
	    const last_year=new_months[new_months.length-1]._id.year;
	    const next_year=months[i]._id.year
	    const next_month_object=months[i]

	    if(next_month===last_month+1
	       ||(next_month===1
		  &&last_month===12
		  &&next_year===last_year+1))
	    {
		new_months.push(next_month_object);
		i++;
	    }else if(last_month===12){
		new_months.push(empty_month(1, last_year+1));
	    }else{
		new_months.push(empty_month(last_month+1,last_year))
	    }
	}
	return new_months;
    }
    
    const log = function(input){
	console.log(input);
	return input;
    }
    const log_months = function(months){
	months.map(month=>console.log(month._id.month, month._id.year))
	return months;
    }

    const set_first_time_visits = function(monthly_visits){
	let total_first_time=0;
	monthly_visits.map(month=>{
	    total_first_time+=month.first_time_visits
	});
	first_time_visits_elem.text(total_first_time);
	return monthly_visits;
    }
    
    const set_all_months = function(months){
	all_months=months;
	return months;
    }
    
    const set_range_error = function(){
	d3.select("#error").text("Invalid range");
    }
    const clear_range_error = function(){
	d3.select("#error").text("");
    }

    /**
     * start and end are the index of the month in monthly visits array
     */
    const is_valid_range = function(start, end){
	return end-start>0
    }

    const update_range = function(){
	const start=parseInt(start_options.node().value);
	const end=parseInt(end_options.node().value);
	if(!is_valid_range(start, end)){
	    set_range_error();
	}else{
	    clear_range_error();
	    const ranged_months=all_months.slice(start, end+1);
	    add_visits_chart(ranged_months);
	}
    }

    start_options.on("input", update_range);
    end_options.on("input", update_range);

    fetch("/monthly-visits?url="+short_url, {
	credentials: "include"
    })
	.then(log)
	.then(response=>response.json())
	.then(set_first_time_visits)
    	.then(add_missing_months)
	.then(set_all_months)
	.then(add_visits_chart)
	.then(add_ranges)
	.catch(console.log);
}());


/* ===== choropleths of visitor locations ===== */

function add_map(div_id, csv_url, locationmode, layout) {
    Plotly.d3.csv(csv_url,
		  function(err, rows) {
		      function unpack(rows, key) {
			  return rows.map(function(row) { return row[key]; });
		      }

		      var data = [{
			  type: 'choropleth',
			  locationmode: locationmode,
			  locations: unpack(rows, 'location'),
			  z: unpack(rows, 'visits'),
			  text: unpack(rows, 'location'),
			  autocolorscale: true
		      }];

		      var div = document.getElementById(div_id);
		      Plotly.plot(div, data, layout, {showLink: false});
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

/* render maps */
(function(){
    const short_link = (new URL(document.location)).searchParams.get('url');

    /* render state-level map */
    const state_csv_url = '/geoip-csv?resolution=state&url=' + short_link;
    const state_layout = {
	title: 'Visits per state',
	geo: {
	    scope: 'usa',
	    projection: { type: 'albers usa' }
	}
    };
    add_map('us-map', state_csv_url, 'USA-states', state_layout);

    /* render world map */
    const country_csv_url = "/geoip-csv?resolution=country&url=" + short_link;
    const country_layout = {
	title: 'Visits per country',
	geo: {
	    projection: { type: 'robinson' }
	}
    };
    add_map('world-map', country_csv_url, 'country names', country_layout);

    /* default to displaying US map */
    show_us_map();
}());


/* ===== pie/doughnut charts of various statistics ===== */

/* --- data --- */

const browser_names = {
    'Msie': 'Microsoft Edge/IE'
};

const browser_colors = {
    'Firefox': { background: 'rgba(244,199,133,0.2)', border: 'rgba(244,199,133,1)' },
    'Chrome': { background: 'rgba(200,240,97,0.2)', border: 'rgba(200,240,97,1)' },
    'Safari': { background: 'rgba(155,186,238,0.2)', border: 'rgba(155,186,238,1)' },
    'Msie': { background: 'rgba(136,198,247,0.2)', border: 'rgba(136,198,247,1)' },
    'Edge': { background: 'rgba(136,198,247,0.2)', border: 'rgba(136,198,247,1)' },
    'Opera': { background: 'rgba(238,120,124,0.2)', border: 'rgba(238,120,124,1)' }
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
    'Iphone': 'iPhone'
};

/* todo: iOS, *BSD, etc? */
const platform_colors = {
    'Linux': { background: 'rgba(251,230,143,0.2)', border: 'rgba(251,230,143,1)' },
    'Windows': { background: 'rgba(129,238,208,0.2)', border: 'rgba(129,238,208,1)' },
    'Macos': { background: 'rgba(201,201,201,0.2)', border: 'rgba(201,201,201,1)' },
    'Android': { background: 'rgba(200,227,120,0.2)', border: 'rgba(200,227,120,1)' }
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
    'reddit.com': 'Reddit'
};

const referer_colors = {
    'facebook.com': { background: 'rgba(0,75,150,0.2)', border: 'rgba(0,75,150,1)' },
    'twitter.com': { background: 'rgba(147,191,241,0.2)', border: 'rgba(147,191,241,1)' },
    'instagram.com': { background: 'rgba(193,131,212,0.2)', border: 'rgba(193,131,212,1)' },
    'reddit.com': { background: 'rgba(241,155,123,0.2)', border: 'rgba(241,155,123,1)' }
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
	    fontSize: 13
	}
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
    new Chart(ctx, {
	type: 'doughnut',
	data: data,
	options: options
    });
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
