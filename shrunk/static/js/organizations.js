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
