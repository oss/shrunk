import './ajax_form';
import './style';
import 'bootstrap';
import '../scss/manage_org.scss';

import * as $ from 'jquery';

$('.remove-member-button').click((event) => {
  const member_netid =
      $(event.target).closest('.member-row').attr('data-member-netid') as
      string;
  $('#delete-member-netid').val(member_netid);
  $('#member-remove-modal').modal();
});

$('.toggle-admin-button').click((event) => {
  const csrf_token = $('html').attr('data-csrf-token') as string;
  const org_name = $(event.target).closest('.member-row').attr('data-org-name');
  const member_netid =
      $(event.target).closest('.member-row').attr('data-member-netid');
  const member_is_admin =
      $(event.target).closest('.member-row').attr('data-member-is-admin');
  const endpoint = (member_is_admin == 'True') ?
      $('#endpoints').attr('data-remove-admin') as string :
      $('#endpoints').attr('data-grant-admin') as string;
  const req = new URLSearchParams();
  req.set('name', org_name as string);
  req.set('netid', member_netid as string);
  fetch(
      endpoint,
      {method: 'post', body: req, headers: {'X-CSRFToken': csrf_token}})
      .then((resp) => resp.json())
      .then((resp: {ok: boolean}) => {
        if (resp.ok) {
          location.reload();
        } else {
          $('#revoke-admin-modal').modal();
        }
      });
});

$('.delete-button').click((_) => {
  const org_name = $('#endpoints').attr('data-org-name') as string;
  $('#org-delete-name').val(org_name);
  $('#org-delete-modal').modal();
});

$('.remove-self-button').click((_) => {
  const member_netid = $('#endpoints').attr('data-netid') as string;
  $('#delete-member-netid').val(member_netid);
  $('#member-remove-modal').modal();
});
