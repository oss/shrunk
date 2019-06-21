function clear_form(form) {
    const prefix = form['field_element_prefix'];
    form['fields_clear'].forEach(function (field, index) {
	$(prefix + field).val('');
	$(prefix + field).removeClass('is-invalid');
	$(prefix + field + '-feedback').hide('is-invalid');
    });
}

function send_request(form) {
    const prefix = form['field_element_prefix'];
    var req = {};
    form['fields'].forEach(function (field, index) {
	if ($(prefix + field).length) {
	    req[field] = $(prefix + field).val();
	    console.log(field);
	    console.log(req[field]);
	}	   
    });
    $.post(form['endpoint'], req, resp => process_response(form, resp), 'json');
}

function process_response(form, resp) {
    if (resp.hasOwnProperty('success')) {
	location.reload();
    } else {
	const prefix = form['field_element_prefix'];
	const errors = resp['errors'];
	form['fields'].forEach(function (field, index) {
	    if (errors.hasOwnProperty(field)) {
		$(prefix + field).addClass('is-invalid');
		$(prefix + field + '-feedback').html(errors[field]);
		$(prefix + field + '-feedback').show();
	    } else {
		$(prefix + field).removeClass('is-invalid');
		$(prefix + field + '-feedback').hide();
	    }
	});
    }
}
