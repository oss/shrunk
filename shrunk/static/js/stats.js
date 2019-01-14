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

    fetch("/monthly_visits?url="+short_url, {
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

const us_map_div = document.getElementById('us-map');
const world_map_div = document.getElementById('world-map');

function add_map(locationmode, layout, div, csvurl) {
    Plotly.d3.csv(csvurl,
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

		  Plotly.plot(div, data, layout, {showLink: false});
	      });
}

let url = new URL(document.location);
const short_link = url.searchParams.get("url");

const states_csv_url = "/geoip_csv?resolution=state&link=" + short_link;
const states_layout = {
    title: 'Visits per state',
    geo: {
	scope: 'usa',
	projection: {
	    type: 'albers usa'
	}
    }
};

add_map('USA-states', states_layout, us_map_div, states_csv_url);

const country_csv_url = "/geoip_csv?resolution=country&link=" + short_link;
const country_layout = {
    title: 'Visits per country',
    geo: {
	projection: {
	    type: 'robinson'
	}
    }
};

add_map('country names', country_layout, world_map_div, country_csv_url);

function show_us_map() {
    us_map_div.style.display = '';
    world_map_div.style.display = 'none';
}

function show_world_map() {
    us_map_div.style.display = 'none';
    world_map_div.style.display = '';
}

show_us_map();
