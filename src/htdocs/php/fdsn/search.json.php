<?php

include_once '../_functions.inc.php';
include_once 'Ncedc.class.php';

search();


/**
 * Get the (sanitized) URL parameters.
 *
 * @return $params {Array}
 */
function getParams() {
  $queryString = $_SERVER['QUERY_STRING'];
  $pairs = explode('&', $queryString);
  $params = [];

  foreach($pairs as $pair) {
    list($name, $value) = explode('=', $pair);

    $params[$name] = safeParam($name);
  }

  return $params;
}

/**
 * Search the NCEDC catalog and output the results as GeoJSON conforming to
 * ComCat's syntax.
 */
function search() {
  $params = getParams();
  $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");
  $url = "$protocol://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];

  setHeaders();

  try {
    $ncedc = new Ncedc($params, $url);

    $ncedc->search();

    print $ncedc->json;
  } catch (Exception $e) {
    setHeaders('HTTP/1.0 500 Internal Server Error');
  }
}
