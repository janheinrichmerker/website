<?php
/**
 * Allowed external origin URLs
 */
$http_origin = $_SERVER['HTTP_ORIGIN'];
$allowed_domains = array(
    "https://heinrichreimer.com",
    "https://heinrichreimersoftware.com",
    "https://heinrichreimer.github.io"
);
if (in_array($http_origin, $allowed_domains)){
    header("Access-Control-Allow-Origin: $http_origin");
}


/**
 * Configuration
 */
$recaptcha_public_key = "6LenfOESAAAAAOXEwnOWBUm49toxM3JMDqy9QREX";     // ReCaptcha public key
$recaptcha_private_key = "6LenfOESAAAAAIF2sgk230B4SGT6WIuyCuxYWeJH";    // ReCaptcha private key
$email = "heinrich@heinrichreimer.com";                                 // Email used for contact form

/**
 * Dependencies
 */
require('recaptcha.php');
$recaptcha = new \ReCaptcha\ReCaptcha($recaptcha_private_key);

/**
 * Contact form
 */
$name = $_POST["name"];
$email = $_POST["email"];
$subject = $_POST["subject"];
$message = $_POST["message"];
$captcha = $_POST["g-recaptcha-response"];

if(empty($name) || empty($email) || empty($subject) || empty($message)) {
    fail("Please fill in all fields.");
}

if(empty($captcha)) {
    fail("Please check the captcha.");
}

$captcha_response = $recaptcha->verify($captcha, $_SERVER['REMOTE_ADDR']);
if(!$captcha_response->isSuccess()) {
    fail("Oh, you're not a human?");
}

$headers = "From: $name<$email>\r\n" .
    "Return-path: $email";

$subject = "Contact: " . $subject;
$message = "A user sent a message via heinrichreimer.com:\n\n" . $message;

if (mail($email, $subject, $message, $headers)) {
    success("Thanks for your message!");
}
else {
    fail("Error while sending email.");
}


function fail($message) {
    http_response_code(400);
    exit($message);
}

function success($message) {
    http_response_code(200);
    exit($message);
}