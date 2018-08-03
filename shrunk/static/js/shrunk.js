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
 * shows the link in the stats viewer
 */

var view_stats = function(short_url){
    window.location.replace("/stats?url="+short_url)
}

/**
 * Change the order in which links are sorted on the front page.
 *
 * Forces a redirect to the index.
 */
var sort_links = function() {
    var sel = document.getElementById("sortby");
}


var sortby = function() {
    var sel = document.getElementById("sortby");
    var url = new URL(window.location.href);
    var all_users = url.searchParams.get("all_users")
    var query = url.searchParams.get("search");

    if(query === null){
        query = "";
    }
    if(all_users === null){
        all_users = 0;
    }
    window.location.replace("/?all_users=" + all_users + "&search=" + query + "&sortby=" + sel.selectedIndex);
}

var clear_search = function(){
    var url = new URL(window.location.href);

    var sortBy = url.searchParams.get("sortby");
    var all_users = url.searchParams.get("all_users");
    if(sortBy === null){
        sortBy = "0"
    }
    if(all_users === null){
        all_users = 1;
    }

    window.location.replace("/?all_users=" + all_users + "&search=&sortby=" + sortBy);
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

