$(function() { //Document is ready
    var drawerLayout = $("app-drawer-layout");
    var drawer = drawerLayout.find("app-drawer");
    var headerLayout = drawerLayout.find("app-header-layout");

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
    $("a[href^='#'], a[href^='/#']").each(function () {
        $(this).click(function(event) {
            scrollTo($(this).attr("href").replace("/", ""));
            event.preventDefault();
        });
    });
    
    //Close drawer when user clicks a link
    drawer.find("paper-item").click(function () {
        if (drawerLayout.get(0).narrow) {
            drawer.get(0).close();
        }
    });

    function scrollTo(reference) {
        headerLayout.scrollTo(reference);
    }
});