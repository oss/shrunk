const ADD_MEMBER_FORM = {
    'endpoint': '/add_organization_member',
    'field_element_prefix': '#member-add-',
    'fields': ['name', 'netid', 'is_admin'],
    'fields_clear': ['netid', 'is_admin']
};

function add_member_keypress(ev) {
    if (ev.keyCode == 13) {
	ev.preventDefault();
	add_member_shim();
    }
}

function add_member_shim() {
    if ($('#member-add-is_admin-checkbox').is(':checked')) {
	$('#member-add-is_admin').val('true');
    } else {
	$('#member-add-is_admin').val('');
    }
    send_request(ADD_MEMBER_FORM);
}

var remove_member_org_name;
var remove_member_netid;

function remove_member(ev) {
    var parent = ev.target.parentElement;
    if (parent.tagName == 'BUTTON')
	parent = parent.parentElement;
    remove_member_org_name = parent.querySelector('.org-name').value;
    remove_member_netid = parent.querySelector('.org-member-netid').value;
    $('#member-remove-modal').modal();
}

function do_remove_member() {
    const req = {
	'name': remove_member_org_name,
	'netid': remove_member_netid
    };
    $.ajax({
	type: 'POST',
	url: '/remove_organization_member',
	data: req,
	error: (jqXHR, textStatus, errorThrown) => remove_member_error(jqXHR),
	success: () => location.reload()
    });
}

function remove_member_error(jqXHR) {
    const err = jQuery.parseJSON(jqXHR.responseText)['error'];
    $("#delete-member-message").text(err).css('color', 'red');
}
