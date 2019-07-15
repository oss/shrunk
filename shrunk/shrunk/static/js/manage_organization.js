const ADD_MEMBER_FORM = {
    'endpoint': '/orgs/add_member',
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

// These variables are set in remove_member and remove_self. When the
// confirmation button is pressed in the modal, do_remove_member is called
// and sends an AJAX request to the server. On success, remove_member_cont
// is invoked. On failure, remove_member_error is invoked with the jqXHR
// object as its argument.
var remove_member_org_name;
var remove_member_netid;
var remove_member_cont;

function remove_member(ev) {
    var parent = ev.target.parentElement;
    if (parent.tagName == 'BUTTON')
	parent = parent.parentElement;
    remove_member_org_name = parent.querySelector('.org-name').value;
    remove_member_netid = parent.querySelector('.org-member-netid').value;
    // If the user is removing themself from an organization through this
    // function (which is possible for an organization admin), we can't
    // reload the manage_organization page, because the user will no longer
    // have permission to view it. So we redirect back to the index instead.
    if (remove_member_netid == $('#netid').val())
	remove_member_cont = () => location.replace('/');
    else
	remove_member_cont = () => location.reload();
    $('#delete-member-header').text('Are you sure you want to remove this member?');
    $('#delete-member-message').text('This operation cannot be undone.').css('color', 'black');
    $('#delete-member-button').html('Delete');
    $('#member-remove-modal').modal();
}

function remove_self() {
    remove_member_org_name = $('#org_name').val();
    remove_member_netid = $('#netid').val();
    remove_member_cont = () => location.replace('/');
    $('#delete-member-header').text('Are you sure you want to leave this organization?');
    $('#delete-member-message').text('This operation cannot be undone.').css('color', 'black');
    $('#delete-member-button').html('Leave');
    $('#member-remove-modal').modal();
}

function do_remove_member() {
    const req = {
	'name': remove_member_org_name,
	'netid': remove_member_netid
    };
    $.ajax({
	type: 'POST',
	url: '/orgs/remove_member',
	data: req,
	error: (jqXHR, textStatus, errorThrown) => remove_member_error(jqXHR),
	success: remove_member_cont
    });
}

function remove_member_error(jqXHR) {
    const err = jQuery.parseJSON(jqXHR.responseText)['error'];
    $('#delete-member-message').text(err).css('color', 'red');
}
