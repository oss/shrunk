import './ajax_form';
import './style';
import 'bootstrap';
import '../scss/orgs.scss';

import * as $ from 'jquery';

$('.delete-button').click((event) => {
  const org_name =
      $(event.target).closest('.org-row').attr('data-org-name') as string;
  $('#org-delete-name').val(org_name);
  $('#org-delete-modal').modal();
});
