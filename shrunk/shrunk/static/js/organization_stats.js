const name = (new URL(document.location)).searchParams.get('name');

$.getJSON('/orgs/stats_json?name=' + name,
	  function (data) {
	      Highcharts.chart('member_stats_container', {
		  chart: { type: 'bar' },
		  title: { text: 'Visits per user' },
		  exporting: { buttons: { contextButton: { menuItems: MENU_ITEMS } } },
		  xAxis: { categories: data.map(doc => doc.netid), title: { text: null } },
		  yAxis: {
		      min: 0,
		      title: {
			  text: 'Visitors'
		      },
		      labels: {
			  overflow: 'justify',
			  step: 4
		      }
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
		  series: [{
		      name: 'Total visits',
		      color: '#FC580C',
		      data: data.map(doc => doc.total_visits)
		  }, {
		      name: 'Unique visits',
		      color: '#FCE2CC',
		      data: data.map(doc => doc.unique_visits)
		  }]
	      });
	  });

$.getJSON('/orgs/geoip?name=' + name,
	  function (data) {
	      add_map('us-map', 'countries/us/us-all', 'US visitors', 'postal-code', data['us']);
	      add_map('world-map', 'custom/world', 'Worldwide visitors', 'iso-a2', data['world']);
	  });

// Initially only display the US map
show_us_map();
