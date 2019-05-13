(function(){
    let first_time_visits_elem=d3.select("#first_time_visits");
    let start_options=d3.select("#start");
    let end_options=d3.select("#end");
    let reset_btn=d3.select("#reset");
    let all_visits=[];

    let url=new URL(document.location);
    const short_url=url.searchParams.get("url");

    const obj2datestr = (obj) => {
	const pad = (v) => parseInt(v) < 10 ? "0" + v : v;
	return pad(obj._id.year) + "-" + pad(obj._id.month) + "-" + pad(obj._id.day);
    }
    const obj2date = (obj) => {
	return new Date(obj2datestr(obj));
    }
    window.obj2datestr = obj2datestr;
    window.obj2date = obj2date;

    // parse the date / time
    const parseTime = (strtime)=>new Date(strtime);
    window.pt=parseTime;
    // format the dates
    const parse_dates = function(visits) {
	visits.forEach(visit=>{
	    visit.date = parseTime(visit._id.year+"-"+visit._id.month+"-"+visit._id.day);
	});
	return visits;
    };

    const add_visits_chart = function(visits){
	if(visits.length<2){
	    d3.select("#nodata").text("Not enough data for a chart");
	    return visits;
	}
	const margin = {top: 20, right: 20, bottom: 30, left: 50};
	let width = 700 - margin.left - margin.right;
	let height = 500 - margin.top - margin.bottom;
	const aspect = height / width;
	if (width > window.innerWidth * 0.7) {
	    width = window.innerWidth * 0.7;
	    height = width * aspect;
	}
	console.log("resize", width, height);

	// set the ranges
	let scale_time = d3.scaleTime()
	    .domain([Date.parse(visits[0].date), Date.parse(visits[visits.length - 1].date)])
	    .range([0, width]);

	// format ticks
	scale_time.tickFormat = (count, specifier) => {
	    const year = (d) => d3.timeFormat("%Y")(d);
	    const day = (d) => d3.timeFormat("%b %d")(d);
	    const month = (d) => d3.timeFormat("%b")(d);
	    return (d) => {
		return d.getMonth() == 0 && d.getDate == 0? year(d) :
		    d.getDate() == 1 ? month(d) : day(d)
	    };
	}

	let scale_visits = d3.scaleLinear()
	    .domain([0, d3.max(visits, d=>d.all_visits)])
	    .range([height, 0]);

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
    window.add_visits_chart = add_visits_chart;

    const add_ranges = function(visits){
	const first = obj2datestr(visits[0]);

	const last = obj2datestr(visits[visits.length - 1]);
	start_options.attr("min", first);
	start_options.attr("max", last);
	start_options.node().value = first;

	end_options.attr("min", first);
	end_options.attr("max", last);
	end_options.node().value = last;
    }

    const empty_visit = function(yearOrDate, month, day){
	let year = yearOrDate;
	let date = yearOrDate;
	if (month == undefined) {
	    year = date.getFullYear();
	    month = date.getMonth();
	    day = date.getDate();
	}
	return {
	    _id:{
		month: month + 1,
		year:  year,
		day: day
	    },
	    date: new Date(year, month, day),
	    all_visits: 0,
	    first_time_visits: 0
	}
    }

    /**
     * if there is no view data for a month there is no months object
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
		new_months.push(empty_visit(1, last_year+1, 1));
	    }else{
		new_months.push(empty_month(last_month+1,last_year, 1))
	    }
	}
	return new_months;
    }

    const log = function(input){
	console.log(input);
	return input;
    }
    const log_visits = function(visits){
	visits.map(visit=>console.log(visit._id.visit, visit._id.year))
	return visits;
    }

    const set_first_time_visits = function(visits){
	let total_first_time=0;
	visits.map(visit=>{
	    total_first_time+=visit.first_time_visits
	});
	first_time_visits_elem.text(total_first_time);
	return visits;
    }

    const set_all_visits = function(visits){
	all_visits=visits;
	window.all_visits = visits;
	return visits;
    }

    const set_range_error = function(){
	d3.select("#error").text("Invalid range");
    }
    const clear_range_error = function(){
	d3.select("#error").text("");
    }

    /**
     * filters the graph data to be within the date range
     */

    const update_range = function(){
	const first = obj2date(all_visits[0]);
	const last = obj2date(all_visits[all_visits.length - 1]);

	const start = Date.parse(start_options.node().value);
	const end = Date.parse(end_options.node().value);
	if(isNaN(start) || isNaN(end) || start >= end
	   || start < first || end > last){
	    set_range_error();
	}else{
	    clear_range_error();
	    add_visits_chart(
		all_visits
		    .filter(visit => obj2date(visit) <= end)
		    .filter(visit => obj2date(visit) >= start)
	    );
	}
    }

    const add_zero_days = function(visits){
	const add_date = (amt) => (date) => {
	    let t = new Date(date);
	    t.setDate(t.getDate() + amt);
	    return t;
	}
	const tomorow = add_date(1);
	const yesterday = add_date(-1);

	let new_visits = [visits[0]];
	let last = new_visits[0];
	let i = 1;
	while (i < visits.length) {
	    // if the next item in visits is tomorow
	    if (visits[i].date - tomorow(last.date) == 0) {
		new_visits.push(visits[i]);
		i++;
	    } else if (last.all_visits == 0) {
		new_visits.push(empty_visit(yesterday(visits[i].date)));
		new_visits.push(visits[i]);
		i++;
	    } else {
		new_visits.push(empty_visit(tomorow(last.date)));
	    }
	    last = new_visits[new_visits.length - 1];
	}
	return new_visits;
    }
    window.add_zero_days = add_zero_days;

    start_options.on("input", update_range);
    end_options.on("input", update_range);
    reset_btn.node().onclick = (e) => {
	add_ranges(all_visits);
	add_visits_chart(all_visits);
	clear_range_error();
	e.preventDefault();
    };

    fetch("/daily-visits?url="+short_url, {
	credentials: "include"
    })
	//.then(log)
	.then(response=>response.json())
	.then(parse_dates)
	.then(add_zero_days)
	.then(set_first_time_visits)
	.then(set_all_visits)
	.then(add_visits_chart)
	.then(add_ranges)
	.catch(console.error);
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
