<?php

include_once 'Rtf.php';

// Read in raw data from the Ajax request body and store it as an object
$data = json_decode(file_get_contents('php://input'));

// Create RTF file
$rtf = new Rtf($data);

sendResponse($rtf->file);

/**
 * Return response json, which contains the path to the temporary RTF file
 *
 * @param $file {String}
 *    full path of RTF file
 */
function sendResponse($file) {
  header('Content-Type: application/json');
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: *');
  header('Access-Control-Allow-Headers: accept,origin,authorization,content-type');

  $json = json_encode([
    'file' => $file
  ]);

  print $json;
}
