const ADD_LINK_FORM = {
    'endpoint': '/add',
    'field_element_prefix': '#add-link-',
    'fields': ['title', 'long_url', 'short_url'],
    'fields_clear': ['title', 'long_url', 'short_url']
};

const EDIT_LINK_FORM = {
    'endpoint': '/edit',
    'field_element_prefix': '#edit-link-',
    'fields': ['title', 'long_url', 'short_url', 'old_short_url'],
    'fields_clear': ['title', 'long_url', 'short_url']
};

function copy_short_url(ev) {
    var parent = ev.target.parentElement;
    if (parent.tagName == 'BUTTON')
	parent = parent.parentElement;
    const link = parent.querySelector('.short-url');
    var text_area = document.createElement('textarea');
    text_area.value = link.href;
    document.body.appendChild(text_area);
    text_area.select();
    document.execCommand('Copy');
    text_area.remove();
}

function delete_link(ev) {
    var parent = ev.target.parentElement;
    if (parent.tagName == 'BUTTON')
	parent = parent.parentElement;
    const link_id = parent.querySelector('.link-id').value;
    $('#link-delete-id').val(link_id);
    $('#link-delete-modal').modal();
}

function do_delete_link() {
    const link_id = $('#link-delete-id').val();
    $('#link-delete-id').val();
    const req = { 'short_url': link_id };
    $.post('/delete', req, function () { location.reload(); });
}

function edit_link(ev) {
    var parent = ev.target.parentElement;
    if (parent.tagName == 'BUTTON')
	parent = parent.parentElement;
    const link_id = parent.querySelector('.link-id').value;
    const title = parent.querySelector('.link-title').value;
    const long_url = parent.querySelector('.link-url').value;
    $('#link-edit-modal-title').html('Editing <em>' + link_id + '</em>');
    $('#edit-link-old_short_url').val(link_id);
    $('#edit-link-title').val(title);
    $('#edit-link-long_url').val(long_url);
    $('#edit-link-short_url').val(link_id);
    $('#link-edit-modal').modal();
}

function change_sortby(sortby) {
    window.location.replace('/?sortby=' + sortby);
}

function change_links_set(new_set) {
    window.location.replace('/?links_set=' + new_set);
}
