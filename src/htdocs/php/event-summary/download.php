<?php

date_default_timezone_set('America/Los_Angeles');

downloadFile($_GET['file']);

/**
 * Trigger download of the (temporary) RTF file created by rtf.php
 *
 * @param file {String}
 *     full path of RTF file
 */
function downloadFile($file) {
  $filename = preg_replace('/-\d+/', '', basename($file)); // strip path/timestamp

  header('Cache-control: no-cache, must-revalidate');
  header('Content-Disposition: attachment; filename="' . $filename . '"');
  header('Content-Length: ' . filesize($file));
  header('Content-Type: application/rtf');
  header('Expires: ' . date(DATE_RFC2822));
  header('Connection: close');

  readfile($file);
}
