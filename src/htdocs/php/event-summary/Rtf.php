<?php

// Load php RTF library/API (https://github.com/phprtflite/PHPRtfLite)
include_once '../lib/PHPRtfLite.php';
PHPRtfLite::registerAutoloader();

date_default_timezone_set('America/Los_Angeles');

/**
 * Using the PHPRtfLite library, create an Event Summary RTF file and save it
 *   to a local (temp) directory
 *
 * @param $data {Object}
 *     key-value pairs for populating content of RTF document
 *
 * @return {Object}
 *     {
 *       file: {String} full path of generated RTF file
 *     }
 */
class Rtf {
  private $_bodyFont;
  private $_bodyFormat;
  private $_data;
  private $_headerFont;
  private $_headerFormat;
  private $_imageFormat;
  private $_rtf;

  public $file;

  public function __construct ($data) {
    $this->_data = $data;
    $this->_rtf = new PHPRtfLite(); // create RTF document instance

    $this->_createRtf();
  }

  /**
   * Create the RTF document and store its path in public 'file' prop
   */
  private function _createRtf() {
    $this->_setMargins();
    $this->_setFormatting();

    $section1 = $this->_rtf->addSection();

    $section1->writeText(
      $this->_data->title,
      $this->_headerFont,
      $this->_headerFormat
    );

    if ($this->_data->dyfi) {
      $img = $this->_getRemoteImage($this->_data->dyfi->map);
      $section1->addImage(
        $img,
        $this->_imageFormat,
        16, 16
      );
    }
    if ($this->_data->shakemap) {
      $img = $this->_getRemoteImage($this->_data->shakemap);
      $section1->addImage(
        $img,
        $this->_imageFormat,
        16, 16
      );
    }

    $this->file = $this->_saveFile();
  }

  /**
   * Create a local (temporary) copy of an image from a remote image
   *
   * @param $url {String}
   *     URL of remote image
   *
   * @return $path {String}
   *     path of local image
   */
  private function _getRemoteImage($url) {
    static $count = 0;

    $count ++;
    $path = "/tmp/{$this->_data->eqid}-$count.jpg";
    $remoteImg = fopen($url, 'rb') or die(http_response_code(500));
    $tempImg = fopen($path, 'wb');

    while (!feof($remoteImg)) { // write contents of remote img to local tmp img
      $contents = fread($remoteImg, 4096);
      fwrite($tempImg, $contents);
    }

    fclose($remoteImg);
    fclose($tempImg);

    return $path;
  }

  /**
   * Save a local (temporary) copy of the RTF file
   *
   * @return $file {String}
   *     path of file
   */
  private function _saveFile() {
    $timestamp = date('YmdHis'); // e.g. 20191024093156 (ensures unique name)
    $file = "/tmp/{$this->_data->eqid}-$timestamp-event-summary.rtf";

    $this->_rtf->save($file);

    return $file;
  }

  /**
   * Set up formatting for images, typography, etc.
   */
  private function _setFormatting() {
    $this->_bodyFont = new PHPRtfLite_Font(14, 'Arial', '#000000', '#FFFFFF');
    $this->_headerFont = new PHPRtfLite_Font(18, 'Arial', '#000000', '#FFFFFF');

    $this->_bodyFormat = new PHPRtfLite_ParFormat('left');
    $this->_bodyFormat->setSpaceBefore(10);
    $this->_bodyFormat->setSpaceAfter(10);
    $this->_bodyFormat->setSpaceBetweenLines(1.75);

    $this->_imageFormat = new PHPRtfLite_ParFormat('center');

    $this->_headerFormat = new PHPRtfLite_ParFormat('center');
    $this->_headerFormat->setSpaceBefore(10);
    $this->_headerFormat->setSpaceAfter(10);
    $this->_headerFormat->setSpaceBetweenLines(2);
  }

  /**
   * Set page margins (unit is centimeters)
   */
  private function _setMargins() {
    $this->_rtf->setMarginBottom(2);
    $this->_rtf->setMarginLeft(2.5);
    $this->_rtf->setMarginRight(2.5);
    $this->_rtf->setMarginTop(2);
  }
}
