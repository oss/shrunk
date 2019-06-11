var shrunk = shrunk || function() {

}

/**
 * Change the order in which links are sorted on the front page.
 *
 * Forces a redirect to the index.
 */
var requery = function(sortby) {
    var url = new URL(window.location.href);

    var all_users = url.searchParams.get("all_users");
    if (all_users == null) {
	all_users = "0";
    }

    var query = url.searchParams.get("search");
    if (query == null) {
	query = "";
    }

    window.location.replace("/?all_users=" + all_users + "&search=" + query + "&sortby=" + sortby);
}

var requery_au = function(all_users) {
    var url = new URL(window.location.href);

    var query = url.searchParams.get("search");
    if (query == null) {
	query = "";
    }

    var sortby = url.searchParams.get("sortby");
    if (sortby == null) {
	sortby = "0";
    }

    window.location.replace("/?all_users=" + all_users + "&search=" + query + "&sortby=" + sortby);
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
