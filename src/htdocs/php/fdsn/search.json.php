<?php

include_once '../_functions.inc.php';
include_once 'Ncedc.class.php';

search();


/**
 * Get the (sanitized) URL parameters from the query string.
 *
 * @return $params {Array}
 */
function getParams() {
  $pairs = explode('&', $_SERVER['QUERY_STRING']);
  $params = [];

  foreach($pairs as $pair) {
    list($name, $value) = explode('=', $pair);

    $params[$name] = safeParam($name);
  }

  return $params;
}

/**
 * Search the NCEDC catalog and output the results as GeoJSON.
 */
function search() {
  $params = getParams();

  setHeaders();

  try {
    $ncedc = new Ncedc($params, $_SERVER['REQUEST_URI']);

    $ncedc->search();

    print $ncedc->json;
  } catch (Exception $e) {
    setHeaders('HTTP/1.0 500 Internal Server Error');

    print $e;
  }
}
