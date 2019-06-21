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
    remove_member_org_name = ev.target.parentElement.querySelector('.org-name').value;
    remove_member_netid = ev.target.parentElement.querySelector('.org-member-netid').value;
    $('#member-remove-modal').modal();
}

function do_remove_member() {
    const req = {
	'name': remove_member_org_name,
	'netid': remove_member_netid
    };
    remove_member_org_name = '';
    remove_member_netid = '';
    $.post('/remove_organization_member', req, function () { location.reload(); });
}
