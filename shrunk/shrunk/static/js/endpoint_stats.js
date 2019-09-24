$.getJSON('/stat/endpoint_json',
	  function (data) {
	      Highcharts.chart('endpoint_stats_container', {
		  chart: { type: 'bar' },
		  title: { text: 'Endpoint visits' },
		  exporting: { buttons: { contextButton: { menuItems: MENU_ITEMS } } },
		  xAxis: { categories: data.map(doc => doc.endpoint), title: { text: null } },
		  yAxis: {
		      min: 0,
		      title: {
			  text: 'Visits'
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
		      name: 'Unique visits (by NetID)',
		      color: '#FCE2CC',
		      data: data.map(doc => doc.unique_visits)
		  }]
	      });
	  });
