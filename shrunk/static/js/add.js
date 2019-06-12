document.getElementById("copy_shortened_url").addEventListener("click", copy_shortened_url);

function copy_shortened_url() {
    var copyText = document.getElementById("shortened_url");
    var textArea = document.createElement("textarea");
    textArea.value = copyText.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    textArea.remove();
}

function send_request() {
    var req = {};
    req["title"] = $("#title").val();
    req["long_url"] = $("#url").val();
    if ($("#alias").length) {
	req["short_url"] = $("#alias").val();
    }

    if ($("#shortened_url_col").length) {
	$("#shortened_url_col").addClass("invisible");
    }

    $.post('add', req, process_response, "json");
}

function process_response(resp) {
    if (resp.hasOwnProperty("success")) {
	var short_url = resp["success"]["short_url"];
	$("#shortened_url").text(short_url);
	$("#shortened_url_col").removeClass("invisible");
	$("#title").removeClass("is-invalid").val("");
	$("#url").removeClass("is-invalid").val("");
	if ($("#alias").length) {
	    $("#alias").removeClass("is-invalid").val("");
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

	if ($("#alias").length) {
	    if (errors.hasOwnProperty("short_url")) {
		$("#alias").addClass("is-invalid");
		$("#alias-feedback").html(errors["short_url"]);
	    } else {
		$("#alias").removeClass("is-invalid")
	    }
	}
    }
}