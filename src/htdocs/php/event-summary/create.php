<?php

include_once 'Rtf.class.php';

$jsonParams = [
  'error' => '',
  'file' => ''
];

setHeaders();

// Create RTF file.
try {
  // Read raw data from the Ajax request body and store it as an object
  $data = json_decode(file_get_contents('php://input'));
  $rtf = new Rtf($data);
  $jsonParams['file'] = $rtf->file;
} catch (Exception $e) {
  $jsonParams['error'] = $e->getMessage();

  setHeaders('HTTP/1.0 500 Internal Server Error');
} finally {
  sendResponse($jsonParams);
}

/**
 * Return response JSON, which contains the path to the temporary RTF file.
 *
 * @param $params {Array}
 */
function sendResponse($params) {
  $json = json_encode($params, JSON_UNESCAPED_SLASHES);

  print $json;
}

/**
 * Set HTTP Headers.
 *
 * @param $header {String}
 *     optional specific header to set
 */
function setHeaders($header = '') {
  if ($header) {
    header($header);
  } else { // set general headers for all responses
    header('Cache-control: no-cache, must-revalidate');
    header('Content-Type: application/json');
    header('Expires: ' . date(DATE_RFC2822));
  }
}
