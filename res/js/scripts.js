$(function() { //Document is ready
    var drawer = $("app-drawer").get(0);

    //Scroll-to links
    $("a[href^='#'], a[href^='/#']").each(function () {
        $(this).click(function(event) {
            scrollTo($(this).attr("href").replace("/", ""));
            event.preventDefault();
        });
    });
    
    //Close drawer when user clicks a link
    $("app-drawer paper-item").click(function () {
        if (drawer.narrow) {
            drawer.close();
        }
    });
});

function scrollTo(reference) {
    $("body").scrollTo(reference);
}