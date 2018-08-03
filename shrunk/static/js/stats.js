(function(){
    const first_time_visits_elem=document.getElementById("first_time_visits");
    let url=new URL(document.location);
    const short_url=url.searchParams.get("url");

    const add_visits_chart = function(visits){
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
    }
    
    const log_response = function(response){
	console.log(response);
	return response;
    }

    const set_graph_dataset = function(monthly_visits){
	
    }

    const set_first_time_visits = function(monthly_visits){
	let total_first_time=0;
	monthly_visits.map(month=>total_first_time+=month.first_time_visits);
	first_time_visits_elem.innerHTML=total_first_time;
	return monthly_visits;
    }

    fetch("/monthly_visits?url="+short_url, {
	credentials: "include"
    })
	.then(log_response)
	.then(response=>response.json())
	.then(set_first_time_visits)
	.then(add_visits_chart)
	.catch(console.log);
    console.log(short_url);
}())
