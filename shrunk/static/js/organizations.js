function clear_create_org() {
    $("#create_org_name").removeClass("is-invalid");
    $("#create-org-name-feedback").hide();
    $("#create_org_name").val("");
}

function create_org() {
    var req = {};
    req["name"] = $("#create_org_name").val();
    $.post('create_organization', req, process_create_response, 'json');
}

function process_create_response(resp) {
    if (resp.hasOwnProperty("success")) {
	location.reload();
    } else {
	var errors = resp["errors"];
	if (errors.hasOwnProperty("name")) {
	    $("#create_org_name").addClass("is-invalid");
	    $("#create-org-name-feedback").html(errors["name"]);
	    $("#create-org-name-feedback").show();
	}
    }
}

function clear_add_user() {
    $("#add_user_netid").removeClass("is-invalid");
    $("#add_user_netid").val("");
}

function add_user_enter(ev) {
    if (ev.keyCode == 13) {
	ev.preventDefault();
	add_user(ev);
    }
}

// XXX broken

function add_user(event) {
    var req = {};
    var gp = event.target.parentElement.parentElement;
    req["name"] = gp.querySelector('.org-name-container').value;
    req["netid"] = gp.querySelector('.netid-input').value;
    console.log('sent req');
    console.log(req["name"]);
    console.log(req["netid"]);
    $.post('add_organization_user', req, process_add_response, 'json');
}

function process_add_response(resp) {
    if (resp.hasOwnProperty("success")) {
	location.reload();
    } else {
	var errors = resp["errors"];
	if (errors.hasOwnProperty("name")) {
	    netid_inp.addClass("is-invalid");
	    $("#add-user-netid-feedback").html(errors["name"]);
	    $("#add-user-netid-feedback").show();
	}
    }
}
