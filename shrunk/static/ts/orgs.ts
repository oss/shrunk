import * as $ from 'jquery';
import 'bootstrap';
import '../scss/orgs.scss';
import './ajax_form';

$('.delete-button').click((event) => {
    const org_name = $(event.target).closest('.org-row').attr('data-org-name') as string;
    $('#org-delete-name').val(org_name);
    $('#org-delete-modal').modal();
});
