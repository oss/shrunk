var shrunk = shrunk || function() {

}

/**
 * Change the order in which links are sorted on the front page.
 *
 * Forces a redirect to the index.
 */
function change_sortby(sortby) {
    window.location.replace('/?sortby=' + sortby);
}

function change_all_users(all_users) {
    window.location.replace('/?all_users=' + all_users);
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
