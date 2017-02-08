$(function() { //Document is ready
    var html = $("html");
    var body = $("body");
    var drawerLayout = $("app-drawer-layout");
    var drawer = drawerLayout.find("app-drawer");

    drawerLayout.get(0).responsiveWidth = "1440px";

    //App layout is narrow?
    updateDrawerLayoutNarrowClass();
    drawerLayout.on("narrow-changed", function () {
        updateDrawerLayoutNarrowClass();
    });

    //App layout is narrow?
    function updateDrawerLayoutNarrowClass() {
        if (drawerLayout.get(0).narrow) {
            drawerLayout.addClass("narrow");
        }
        else {
            drawerLayout.removeClass("narrow");
        }
    }

    //Scroll-to links
    function scrollTo(reference) {
        window.history.pushState(reference, document.title, reference);
        $("html").scrollTo(reference);
    }

    var linkSelector = "a[href^='#']" + (body.hasClass("page-index") ? ", a[href^='/#'], a[href^='/index.html#']" : "");
    $(linkSelector).each(function () {
        $(this).click(function(event) {
            var href = $(this).attr("href").replace("/", "").replace("/index.html", "");
            scrollTo(href);
            event.preventDefault();
        });
    });
    var hash = window.location.hash.slice(1);
    if (hash && hash.length > 0) {
        scrollTo("#" + hash);
    }
    
    //Close drawer when user clicks a link
    drawer.find("paper-item").click(function () {
        if (drawerLayout.get(0).narrow) {
            drawer.get(0).close();
        }
    });
});