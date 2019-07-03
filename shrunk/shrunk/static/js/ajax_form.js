function clear_form(form) {
    const prefix = form['field_element_prefix'];
    form['fields_clear'].forEach(function (field, index) {
	$(prefix + field).val('');
	$(prefix + field).removeClass('is-invalid');
	$(prefix + field + '-feedback').hide('is-invalid');
    });
}

function send_request_keypress(ev, form) {
    if (ev.keyCode == 13) {
	ev.preventDefault();
	send_request(form);
    }
}

function send_request(form) {
    const prefix = form['field_element_prefix'];
    var req = {};
    form['fields'].forEach(function (field, index) {
	if ($(prefix + field).length) {
	    req[field] = $(prefix + field).val();
	}
    });

    $.ajax({
	type: 'POST',
	url: form['endpoint'],
	data: req,
	error: (jqXHR, textStatus, errorThrown) => process_errors(form, jqXHR.responseJSON['errors']),
	success: resp => process_success(form, resp['success']),
	dataType: 'json'
    });
}

function process_errors(form, errors) {
    const prefix = form['field_element_prefix'];
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

function process_success(form, resp) {
    location.reload();
}
