function send_request() {
    var req = {};
    req["title"] = $("#title").val();
    req["long_url"] = $("#url").val();
    req["old_short_url"] = $("#old_short_url").val();
    if ($("#alias").length) {
	req["short_url"] = $("#alias").val();
    }

    $.post('edit', req, process_response, "json");
}

function process_response(resp) {
    if (resp.hasOwnProperty("success")) {
	$("#submit_form").popover("show");
	$("#old_short_url").val(resp["success"]["new_short_url"]);
	$("#title").val(resp["success"]["new_title"]);
	$("#title").removeClass("is-invalid");
	$("#url").removeClass("is-invalid");
	if ($("#alias").length) {
	    $("#alias").removeClass("is-invalid");
	}
    } else {
	var errors = resp["errors"];

	if (errors.hasOwnProperty("title")) {
	    $("#title").addClass("is-invalid");
	    $("#title-feedback").html(errors["title"]);
	} else {
	    $("#title").removeClass("is-invalid")
	}

	if (errors.hasOwnProperty("long_url")) {
	    $("#url").addClass("is-invalid");
	    $("#url-feedback").html(errors["long_url"]);
	} else {
	    $("#url").removeClass("is-invalid")
	}

	if ($("alias")) {
	    if (errors.hasOwnProperty("short_url")) {
		$("#alias").addClass("is-invalid");
		$("#alias-feedback").html(errors["short_url"]);
	    } else {
		$("#alias").removeClass("is-invalid")
	    }
	}
    }
}

$("html").on("click", function(e) {
    if ($(e.target).data('toggle') !== 'popover'
	&& $(e.target).parents('.popover.in').length === 0) {
	$('[data-toggle="popover"]').popover('hide');
    }
});
