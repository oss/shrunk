import * as $ from 'jquery';

interface AJAXResponse {
  ok: boolean;
  errors?: [{
    name: string;
    error: string
  }];
}

function submit_ajax_form(form: any): void {
  const csrf_token = $('html').attr('data-csrf-token') as string;
  const endpoint = form.attr('data-ajax-endpoint');
  const inputs = form.find('input');
  const req = new URLSearchParams();
  for (const input of inputs) {
    const name = $(input).attr('name') as string;
    if ($(input).is(':checkbox')) {
      req.append(name, $(input).is(':checked') ? 'true' : 'false');
    } else {
      req.append(name, $(input).val() as string);
    }
  }

  form.find('input.is-invalid').removeClass('is-invalid');

  fetch(
      endpoint,
      {method: 'post', body: req, headers: {'X-CSRFToken': csrf_token}})
      .then((resp) => resp.json())
      .then((resp: AJAXResponse) => {
        if (resp.ok) {
          location.reload();
        } else {
          for (const err of resp.errors!) {
            const bad_input = form.find(`input[name=${err.name}]`);
            bad_input.addClass('is-invalid');

            let feedback = bad_input.siblings('div.invalid-feedback');
            const feedback_sel = bad_input.attr('data-invalid-feedback');
            if (feedback_sel) {
              feedback = $(feedback_sel);
            }

            if (feedback) {
              feedback.html(err.error);
            }
          }
        }
      });
}

$('form.ajax-form input').on('keypress', (event) => {
  if (event.which == 13) {
    const form = $(event.target).closest('form.ajax-form');
    submit_ajax_form(form);
  }
});

$('form.ajax-form button').click((event) => {
  const form = $(event.target).closest('form.ajax-form');
  submit_ajax_form(form);
});
