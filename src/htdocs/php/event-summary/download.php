<?php

downloadFile($_GET['file']);

/**
 * Trigger download of the (temporary) RTF file created by rtf.php
 *
 * @param file {String}
 *     full path of RTF file
 */
function downloadFile($file) {
  $filename = preg_replace('/-\d+/', '', basename($file)); // strip path/timestamp

  header('Content-Type: application/rtf');
  header('Content-Disposition: attachment; filename="' . $filename . '"');
  header('Content-Length: ' . filesize($file));
  header('Connection: close');

  readfile($file);
}
