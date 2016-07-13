$(function() { //Document is ready
    //Scroll-to links
    $("a[href^='#']").each(function() {
        $(this).click(function(event) {
            scrollTo($(this).attr("href"));
            event.preventDefault();
        });
    });
    
    //Close drawer when user clicks a link
    $(".mdl-layout__drawer .mdl-navigation__link").click(function() {
        $(".mdl-layout").get(0).MaterialLayout.toggleDrawer();
    });

    //Contact form
    var contactForm = $("#contact_form");
    var contactSnackbar = $("#contact_snackbar");
    contactForm.submit(function(event) {
        $.post("res/php/contact.php", contactForm.serialize())
            .done(function(data) {
                contactForm.find(":input").attr("disabled", true);
                var button = contactForm.find("button[name='submit']");
                button.html(button.data("success"));
                contactSnackbar.get(0).MaterialSnackbar.showSnackbar({
                    message: data,
                    timeout: 4000
                });
            })
            .fail(function(jqXHR) {
                contactSnackbar.get(0).MaterialSnackbar.showSnackbar({
                    message: jqXHR.responseText,
                    timeout: 4000
                });
            });
        event.preventDefault();
    });
});

function scrollTo(reference) {
    $(".mdl-layout__content").scrollTo(reference);
}