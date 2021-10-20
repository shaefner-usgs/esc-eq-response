<?php

include_once 'Rtf.class.php';

create();


/**
 * Create the RTF file.
 */
function create() {
  $jsonParams = [
    'error' => '',
    'file' => ''
  ];

  setHeaders();

  try {
    // Read the raw data from the Ajax request body and store it as an object
    $data = json_decode(file_get_contents('php://input'));

    $rtf = new Rtf($data);
    $jsonParams['file'] = $rtf->file;
  } catch (Exception $e) {
    $jsonParams['error'] = $e->getMessage();

    setHeaders('HTTP/1.0 500 Internal Server Error');
  } finally {
    sendResponse($jsonParams);
  }
}

/**
 * Return the JSON response, which contains the path to the temporary RTF file
 * upon success.
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
 *     optional header to set
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
