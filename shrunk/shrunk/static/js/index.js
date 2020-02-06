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

function show_qr_code(ev) {
    var parent = ev.target.parentElement;
    if (parent.tagName == 'BUTTON')
	parent = parent.parentElement;
    const short_url = parent.querySelector('.short-url').value;
    const our_url = new URL(document.location);
    const dest_url = our_url.origin + '/' + short_url;

    const qr_div = document.getElementById('qr-code');
    const qr = new QRCode(qr_div, dest_url);

    $('#qr-url').html(short_url);

    let download_btn = document.getElementById('qr_download');
    download_btn.onclick = function() {
	const img_tag = qr_div.getElementsByTagName('img')[0];
	let download_link = document.createElement('a');
	download_link.download = short_url + '.png';
	download_link.href = img_tag.src;
	document.body.appendChild(download_link);
	download_link.click();
    };
    $('#qr-modal').modal('show');
}

function hide_qr_code() {
    $('#qr-modal').modal('hide');
    setTimeout(function() { $('#qr-code').empty() }, 200);
}

function print_qr_code() {
    const short_url = $('#qr-url').html();
    window.open(new URL(document.location).origin + '/print_qr?url=' + short_url);
}
