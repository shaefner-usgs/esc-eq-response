<?php

downloadFile();

/**
 * Trigger download of RTF file created by rtf.php
 */
function downloadFile() {
  $path = $_GET['file'];
  $filename = preg_replace('/-\d+/', '', basename($path)); // filename sans path/timestamp

  header('Content-Type: application/rtf');
  header('Content-Disposition: attachment; filename="' . $filename . '"');
  header('Content-Length: ' . filesize($path));
  header('Connection: close');

  readfile($path);
}
