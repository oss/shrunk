const ADD_LINK_FIELDS = ['title', 'long_url', 'short_url'];

function clear_add_link_form() {
    ADD_LINK_FIELDS.forEach(function (field, index) {
	$('#add-link-' + field).val('');
	$('#add-link-' + field).removeClass('is-invalid');
	$('#add-link-' + field + '-feedback').hide('is-invalid');
    });
}

function send_add_request() {
    var req = {};
    ADD_LINK_FIELDS.forEach(function (field, index) {
	if ($('#add-link-' + field).length) {
	    req[field] = $('#add-link-' + field).val();
	}
    });
    $.post('add', req, process_add_response, 'json');
}

function process_add_response(resp) {
    if (resp.hasOwnProperty('success')) {
	location.reload()
    } else {
	const errors = resp['errors'];
	ADD_LINK_FIELDS.forEach(function (field, index) {
	    if (errors.hasOwnProperty(field)) {
		$('#add-link-' + field).addClass('is-invalid');
		$('#add-link-' + field + '-feedback').html(errors[field]);
		$('#add-link-' + field + '-feedback').show();
	    } else {
		$('#add-link-' + field).removeClass('is-invalid');
		$('#add-link-' + field + '-feedback').hide();
	    }
	});
    }
}

function copy_short_url(ev) {
    const parent = ev.target.parentElement;
    const link = parent.querySelector('.short-url');
    var text_area = document.createElement('textarea');
    text_area.value = link.href;
    document.body.appendChild(text_area);
    text_area.select();
    document.execCommand('Copy');
    text_area.remove();
}
