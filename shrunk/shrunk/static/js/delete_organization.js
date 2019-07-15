var org_delete_name;
var org_delete_fn;

function delete_org_list(ev) {
    var parent = ev.target.parentElement;
    if (parent.tagName == 'BUTTON')
	parent = parent.parentElement;
    org_delete_name = parent.querySelector('.org-name').value;
    org_delete_fn = function () { location.reload(); };
    $('#org-delete-modal').modal();
}

function delete_org_manage(name) {
    org_delete_name = name;
    org_delete_fn = function () { window.location.replace('/orgs'); };
    $('#org-delete-modal').modal();
}

function do_delete_org() {
    const req = { 'name': org_delete_name };
    org_delete_name = '';
    $.post('/orgs/delete', req, org_delete_fn);
}
