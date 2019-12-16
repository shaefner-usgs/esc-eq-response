<?php

/**
 * Create an RTF file using json data sent via Ajax in Rtf.js
 *
 * Sends back a json response with the full path to the local (temporary) RTF file
 */

include_once '../lib/PHPRtfLite.php';
PHPRtfLite::registerAutoloader();

date_default_timezone_set('America/Los_Angeles');

// Read in raw data from the Ajax request body and convert it to an object
$data = json_decode(file_get_contents('php://input'));

/**
 * ------------------------------------------------------------------
 * Begin RTF file creation
 * ------------------------------------------------------------------
 */

// Create RTF document instance
$rtf = new PHPRtfLite();

// Set margins (unit is centimeters)
$rtf->setMarginBottom(2);
$rtf->setMarginLeft(2.5);
$rtf->setMarginRight(2.5);
$rtf->setMarginTop(2);

// Set up formatting
$bodyFont = new PHPRtfLite_Font(14, 'Arial', '#000000', '#FFFFFF');
$bodyFormat = new PHPRtfLite_ParFormat('left');
$bodyFormat->setSpaceBefore(10);
$bodyFormat->setSpaceAfter(10);
$bodyFormat->setSpaceBetweenLines(1.75);

$imageFormat = new PHPRtfLite_ParFormat('center');

$headerFont = new PHPRtfLite_Font(18, 'Arial', '#000000', '#FFFFFF');
$headerFormat = new PHPRtfLite_ParFormat('center');
$headerFormat->setSpaceBefore(10);
$headerFormat->setSpaceAfter(10);
$headerFormat->setSpaceBetweenLines(2);

// Create RTF document
$section1 = $rtf->addSection();

$section1->writeText($data->title, $headerFont, $headerFormat);

if ($data->dyfi) {
  $localImg = getRemoteImage($data->dyfi->map);
  $section1->addImage($localImg, $imageFormat, 16, 16);
}
if ($data->shakemap) {
  $localImg = getRemoteImage($data->shakemap);
  $section1->addImage($localImg, $imageFormat, 16, 16);
}

/**
 * ------------------------------------------------------------------
 * End RTF file creation
 * ------------------------------------------------------------------
 */

$file = saveFile();
sendResponse(array(
  'file' => $file
));

/**
 * Create a local (temporary) copy of an image from a remote image
 *
 * @param $url {String}
 *     URL of remote image
 *
 * @return $img {String}
 *     path of local image
 */
function getRemoteImage($url) {
  global $data;
  static $count = 0;

  $count ++;
  $img = "/tmp/{$data->eqid}-$count.jpg";
  $remoteImg = fopen($url, 'rb') or die(http_response_code(500));
  $tempImg = fopen($img, 'wb');

  while (!feof($remoteImg)) { // write contents of remote img to tmp img
    $contents = fread($remoteImg, 4096);
    fwrite($tempImg, $contents);
  }

  fclose($remoteImg);
  fclose($tempImg);

  return $img;
}

/**
 * Save a local (temporary) copy of the event summary RTF file
 *
 * @return $file {String}
 *     path of rtf file
 */
function saveFile() {
  global $data, $rtf;

  $timestamp = date('YmdHis'); // e.g. 20191024093156 (ensures unique name)
  $file = "/tmp/{$data->eqid}-$timestamp.rtf";

  $rtf->save($file);

  return $file;
}

/**
 * Send response json, which contains the path to the temporary RTF file
 *
 * @param $data {Array}
 */
function sendResponse($data) {
  header('Content-Type: application/json');
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: *');
  header('Access-Control-Allow-Headers: accept,origin,authorization,content-type');

  $json = json_encode($data);
  print $json;
}
