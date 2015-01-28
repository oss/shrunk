function toggleLinks(cb, netid) {
    $("article.link-group").each(function() {
        if(cb.checked)
            $(this).css("display", "block");
        else {
            if($(this).children(".owner").attr("netid") != netid)
                $(this).css("display", "none");
        }
    });
}
