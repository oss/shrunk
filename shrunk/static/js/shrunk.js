var shrunk = shrunk || function() {

}

var delete_link = function(short_url) {
    /* Might have trailing whitespace */
    short_url = short_url.trim();

    /* Create a fake form */
    var form = document.createElement("form");
        form.setAttribute("action", "/delete");
        form.setAttribute("method", "POST");

    var hiddenField = document.createElement("input");
        hiddenField.setAttribute("type", "hidden");
        hiddenField.setAttribute("name", "short_url");
        hiddenField.setAttribute("id", "short_url");
        hiddenField.setAttribute("value", short_url);

    form.appendChild(hiddenField);
        form.appendChild(document.createElement("input", {type: "submit"}))

    /* Submit the form */
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}
