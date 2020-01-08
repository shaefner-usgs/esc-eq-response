<?php

include_once 'Rtf.php';

// Read in raw data from the Ajax request body and store it as an object
$data = json_decode(file_get_contents('php://input'));

$jsonParams = [
  'error' => '',
  'file' => ''
];

// $file = fopen('/tmp/error.txt', 'w');
// $output = print_r($data, true);
// fwrite($file, $output);
// fclose($file);

// Create RTF file
try {
  $rtf = new Rtf($data);
  $jsonParams['file'] = $rtf->file;
} catch (Exception $e) {
  $jsonParams['error'] = $e->getMessage();
} finally {
  setHeaders($jsonParams);
  sendResponse($jsonParams);
}

/**
 * Return response json, which contains the path to the temporary RTF file
 *
 * @param $params {Array}
 */
function sendResponse($params) {
  $json = json_encode($params, JSON_UNESCAPED_SLASHES);

  print $json;
}

/**
 * Set HTTP Headers for CORS-compatible json response
 *
 * @param $params {Array}
 */
function setHeaders($params) {
  header('Content-Type: application/json');
  header('Access-Control-Allow-Headers: Accept, Authorization, Content-Type, Origin');
  header('Access-Control-Allow-Methods: *');
  header('Access-Control-Allow-Origin: *');

  if ($params['error']) {
    header('HTTP/1.0 500 Internal Server Error');
  }
}
