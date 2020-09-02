import './ajax_form';
// We don't import './style' here because webpack for some reason refuses to
// split the chunk and produces a huge index.css file containing all of
// bootstrap. Instead, we have a separate webpack entrypoint for './style' that
// we include in the index.html template.
import 'bootstrap';
import '../scss/index.scss';

import * as $ from 'jquery';
import {toDataURL} from 'qrcode';

// Configure copy button

$('.copy-button').click((event) => {
  const short_url = $(event.target).closest('.link-row').attr('data-short-url');
  const dest_url = `${location.origin}/${short_url}`;

  const text_area = document.createElement('textarea');
  text_area.value = dest_url;
  document.body.appendChild(text_area);
  text_area.select();
  document.execCommand('Copy');
  text_area.remove();
});

// Configure the QR code modal

$('.qr-button').click((event) => {
  const short_url =
      $(event.target).closest('.link-row').attr('data-short-url') as string;
  const dest_url = `${location.origin}/${short_url}`;
  $('#qr-url').html(short_url);
  toDataURL($('#qr-canvas').get(0), dest_url, {margin: 0, width: 256});
  $('#qr-modal').modal();
});

function get_qr_data_url(): string {
  return ($('#qr-canvas').get(0) as HTMLCanvasElement).toDataURL('image/png');
}

$('#qr-print').click(() => {
  const popup = window.open()!;
  popup.document.write(`
<!DOCTYPE html>
<html>
  <body>
    <img src="${get_qr_data_url()}"/>
  </body>
</html>`);
  popup.focus();
  popup.print();
});

$('#qr-download').click((_) => {
  const short_url = $('#qr-url').html();
  const dl_link = document.createElement('a');
  dl_link.download = `${short_url}.png`;
  dl_link.href = get_qr_data_url();
  document.body.appendChild(dl_link);
  dl_link.click();
});

// Configure the delete link modal

$('.delete-button').click((event) => {
  const short_url =
      $(event.target).closest('.link-row').attr('data-short-url')!;
  $('#delete-short-url').val(short_url);
  $('#delete-modal').modal();
});

// Configure the edit link modal

$('.edit-button').click((event) => {
  const ancestor = $(event.target).closest('.link-row');
  const link_title = ancestor.attr('data-link-title')!;
  const long_url = ancestor.attr('data-long-url')!;
  const short_url = ancestor.attr('data-short-url')!;

  $('#edit-modal .modal-header > h4').html(`Editing <em>${short_url}</em>`);
  $('#edit-modal input[name=old_short_url]').val(short_url);
  $('#edit-modal input[name=title]').val(link_title);
  $('#edit-modal input[name=long_url]').val(long_url);
  $('#edit-modal input[name=short_url]').val(short_url);
  $('#edit-modal').modal();
});
