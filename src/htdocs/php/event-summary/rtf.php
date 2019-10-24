<?php

include_once '../lib/PHPRtfLite.php';
PHPRtfLite::registerAutoloader();

date_default_timezone_set('America/Los_Angeles');

$eqid = $_POST['eqid'];

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

$section1->writeText($_POST['title'], $headerFont, $headerFormat);

if ($_POST['summary']) {
  $section1->writeText($_POST['summary'], $bodyFont, $bodyFormat);
}
if ($_POST['dyfi']) {
  $localImgPath = getRemoteImage($_POST['dyfi']);
  $section1->addImage($localImgPath, $imageFormat, 16, 16);
}
if ($_POST['shakemap']) {
  $localImgPath = getRemoteImage($_POST['shakemap']);
  $section1->addImage($localImgPath, $imageFormat, 16, 16);
}

$file = saveFile();
sendResponse(array(
  'file' => $file
));

/*
 * Create a local (temporary) image from a remote image
 *
 * @param $url {String}
 *     URL of remote image
 *
 * @return $path {String}
 *     path of local image
 */
function getRemoteImage($url) {
  global $eqid;
  static $count = 0;

  $count ++;
  $path = "/tmp/$eqid-$count.jpg";
  $remoteImg = fopen($url, 'rb') or die(http_response_code(500));
  $tempImg = fopen($path, 'wb');

  while (!feof($remoteImg)) { // write contents of remote img to tmp img
    $contents = fread($remoteImg, 4096);
    fwrite($tempImg, $contents);
  }

  fclose($remoteImg);
  fclose($tempImg);

  return $path;
}

/**
 * Save a local (temporary) event summary RTF file
 *
 * @return $path {String}
 *     path of rtf file
 */
function saveFile() {
  global $eqid, $rtf;

  $timestamp = date('YmdHis'); // e.g. 20191024093156
  $path = "/tmp/$eqid-$timestamp.rtf";

  $rtf->save($path);

  return $path;
}

/**
 * Send json response data
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
