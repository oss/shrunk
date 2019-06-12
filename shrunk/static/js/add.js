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

document.getElementById("submit_form").addEventListener("click", send_add_request);

function send_add_request() {
    var title = $("#title").val();
    var url = $("#url").val();
    if ($("alias")) {
	var alias = $("#alias").val();
    } else {
	var alias = "";
    }
    $("#shortened_url_col").addClass("invisible");
    $.post("/add",
	   {"title": title,
	    "long_url": url,
	    "short_url": alias},
	   process_add_response, "json");
}

function process_add_response(resp) {
    if (resp.hasOwnProperty("created")) {
	var short_url = resp["created"]["short_url"];
	$("#shortened_url").text(short_url);
	$("#shortened_url_col").removeClass("invisible");
	$("#title").removeClass("is-invalid").val("");
	$("#url").removeClass("is-invalid").val("");
	if ($("#alias")) {
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
