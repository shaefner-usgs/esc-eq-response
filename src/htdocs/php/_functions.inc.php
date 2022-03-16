<?php

/**
 * Get a request parameter from $_GET or $_POST
 *
 * @param $name {String}
 *     The parameter name
 * @param $default {?} default is NULL
 *     Optional default value if the parameter was not set.
 *
 * @return $value {String}
 */
function safeParam ($name, $default=NULL) {
  if (isset($_POST[$name]) && $_POST[$name] !== '') {
    $value = strip_tags(trim($_POST[$name]));
  } else if (isset($_GET[$name]) && $_GET[$name] !== '') {
    $value = strip_tags(trim($_GET[$name]));
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
