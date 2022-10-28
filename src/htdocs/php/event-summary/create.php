<?php

include_once '../_functions.inc.php';
include_once 'Rtf.class.php';

create();


/**
 * Create the RTF file.
 */
function create() {
  $response = [
    'error' => '',
    'file' => ''
  ];

  setHeaders();

  try {
    // Read the raw data from the Ajax request body and store it as an object
    $data = json_decode(file_get_contents('php://input'));

    $rtf = new Rtf($data);
    $response['file'] = $rtf->file;
  } catch (Exception $e) {
    $response['error'] = $e->getMessage();

    http_response_code($e->getCode());
  } finally {
    sendResponse($response);
  }
}

/**
 * Return the JSON response, which contains the path to the temporary RTF file
 * upon success.
 *
 * @param $response {Array}
 */
function sendResponse($response) {
  $json = json_encode($response, JSON_UNESCAPED_SLASHES);

  print $json;
}
