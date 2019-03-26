var shrunk = shrunk || function() {

}

/**
 * Fake a form to delete a link.
 */
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

/**
 * Change the order in which links are sorted on the front page.
 *
 * Forces a redirect to the index.
 */
var sort_links = function() {
    var sel = document.getElementById("sortby");
}

/**
 * Changes what links to display: links owned by all users, or only the user who
 * is currently logged in.
 *
 * This only has an effect on administrators.
 */
var display_all = function() {
    var sel = document.getElementById("display-all");
    var choice = sel.options[sel.selectedIndex].value;
    if (choice === "all-users") {
        window.location.replace("/?all_users=1");
    }
    else {
        window.location.replace("/?all_users=0");
    }
}

var sortby = function() {
    var sel = document.getElementById("sortby");
    window.location.replace("/?sortby=" + sel.selectedIndex)
}

function toggleLinks(cb, netid) {
    $("article.link-group").each(function() {
        if(cb.checked)
            $(this).css("display", "block");
        else {
            link_info = $(this).children(".link-info");
            if($(link_info).children(".owner").attr("netid") != netid)
                $(this).css("display", "none");
        }
    });
}
