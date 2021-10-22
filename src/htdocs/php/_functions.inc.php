<?php

/**
 * Get a request parameter from $_GET or $_POST and sanitize it.
 *
 * @param $name {String}
 *     The parameter name
 * @param $default {?} default is NULL
 *     Optional default value if the parameter was not provided.
 * @param $filter {PHP Sanitize filter} default is FILTER_SANITIZE_STRING
 *     Optional sanitizing filter to apply
 *
 * @return $value {String}
 */
function safeParam($name, $default=NULL, $filter=FILTER_SANITIZE_STRING) {
  $value = NULL;

  if (isset($_POST[$name]) && $_POST[$name] !== '') {
    $value = filter_input(INPUT_POST, $name, $filter);
  } else if (isset($_GET[$name]) && $_GET[$name] !== '') {
    $value = filter_input(INPUT_GET, $name, $filter);
  } else {
    $value = $default;
  }

  return $value;
}

/**
 * Set HTTP Headers.
 *
 * @param $header {String}
 *     Optional header to set
 */
function setHeaders($header = '') {
  if ($header) {
    header($header);
  } else { // default headers (for all responses)
    header('Cache-control: no-cache, must-revalidate');
    header('Content-Type: application/json');
    header('Expires: ' . date(DATE_RFC2822));
  }
}
