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
  private $_border;
  private $_data;
  private $_font;
  private $_format;
  private $_now;
  private $_rtf;

  public $file;

  public function __construct ($data) {
    $this->_border = new stdClass;
    $this->_data = $data;
    $this->_font = new stdClass;
    $this->_format = new stdClass;
    $this->_now = date('Y-m-d g:ia \(T\)');
    $this->_rtf = new PHPRtfLite(); // create RTF document instance

    if ($this->_data) {
      $this->_cleanData();
      $this->_createRtf();
      $this->_saveFile();
    }
  }

  /**
  * Add commas to large numbers
  *
  * @param $num {Number}
  *
  * @return {String}
   */
  private function _addCommas($num) {
    $dec = '';
    $num .= ''; // convert to string
    $parts = explode('.', $num);
    $int = $parts[0];
    $regex = '/(\d+)(\d{3})/';

    if (count($parts) > 1) {
      $dec = '.' . $parts[1];
    }

    //while (regex.test(int)) {
    while (preg_match($regex, $int)) {
      //int = int.replace(regex, '$1' + ',' + '$2');
      $int = preg_replace($regex, "$1,$2", $int);
    }

    return $int . $dec;
  }

  /**
   * Sanitize data from external json feeds for known issues
   */
  private function _cleanData() {
    // Strip HTML tags, extra whitespace from summary
    $this->_data->summary = preg_replace('/\s+/', ' ',
      strip_tags($this->_data->summary)
    );
    $this->_data->summary = preg_replace('/^ /', '', $this->_data->summary);
  }

  /**
   * Create the RTF document
   */
  private function _createRtf() {
    $this->_setMargins();
    $this->_setStyles();

    $this->_createSection1();
    $this->_createSection2();

    if (!empty(get_object_vars($this->_data->pager))) {
      $this->_createSection3();
    }

    $this->_createSection4();
    $this->_createSection5();
    $this->_createSection6();
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
   * Save a local (temporary) copy of the RTF file and store its path in $file
   */
  private function _saveFile() {
    $timestamp = date('YmdHis'); // e.g. 20191024093156 (ensures unique name)
    $this->file = "/tmp/{$this->_data->eqid}-$timestamp-event-summary.rtf";

    $this->_rtf->save($this->file);
  }

  // ---------------------------------------------------------------------
  // Utility methods for creating RTF file using PHPRtfLite library follow
  // ---------------------------------------------------------------------

  /**
   * RTF Document, Section 1: Basic earthquake details
   */
  private function _createSection1() {
    $section1 = $this->_rtf->addSection();

    $nearbyCitiesList = '';
    if ($this->_data->{'nearby-cities'}) {
      foreach ($this->_data->{'nearby-cities'} as $city) {
        $nearbyCitiesList .= $city->distance . ' km ' . $city->direction .
          ' of ' . $city->name . '<br>';
      }
      $nearbyCitiesList = substr($nearbyCitiesList, 0, -4); // remove final <br>
    }

    $section1->writeText(
      $this->_data->title,
      $this->_font->h1,
      $this->_format->h1
    );
    $section1->writeText(
      '<b>Version 1</b>, ' . $this->_now,
      $this->_font->body,
      $this->_format->center
    );

    $section1->writeText(
      'Date and Time',
      $this->_font->h4,
      $this->_format->h4
    );
    $section1->writeText(
      $this->_data->time->utc . ' (UTC)<br>' . $this->_data->time->local .
        ' (local time at epicenter)',
      $this->_font->body,
      $this->_format->body
    );

    $section1->writeText(
      'Magnitude',
      $this->_font->h4,
      $this->_format->h4
    );
    $section1->writeText(
      $this->_data->magType . ' ' . $this->_data->mag,
      $this->_font->body,
      $this->_format->body
    );

    $section1->writeText(
      'Depth',
      $this->_font->h4,
      $this->_format->h4
    );
    $section1->writeText(
      $this->_data->depth . ' km',
      $this->_font->body,
      $this->_format->body
    );

    if ($nearbyCitiesList) {
      $section1->writeText(
        'Nearby Cities',
        $this->_font->h4,
        $this->_format->h4
      );
      $section1->writeText(
        $nearbyCitiesList,
        $this->_font->body,
        $this->_format->body
      );
    }

    $section1->writeText(
      'ComCat Event ID',
      $this->_font->h4,
      $this->_format->h4
    );
    $section1->writeText(
      $this->_data->eqid,
      $this->_font->body,
      $this->_format->body
    );

    $section1->writeText(
      'Resources',
      $this->_font->h4,
      $this->_format->h4
    );
    $section1->writeHyperLink(
      $this->_data->urls->eventPage,
      'Event Page',
      $this->_font->link,
      $this->_format->body
    );
    $section1->writeHyperLink(
      $this->_data->urls->app,
      'Earthquake Response App',
      $this->_font->link,
      $this->_format->body
    );
  }

  /**
   * RTF Document, Section 2: Talking Points
   */
  private function _createSection2() {
    $section2 = $this->_rtf->addSection();

    $section2->writeText(
      'Talking Points',
      $this->_font->h2,
      $this->_format->h2
    );

    $section2->writeText(
      'Date, Time, Location',
      $this->_font->h4,
      $this->_format->h4
    );
    $section2->writeText(
      '[PLACEHOLDER]',
      $this->_font->body,
      $this->_format->body
    );

    $section2->writeText(
      'Fault',
      $this->_font->h4,
      $this->_format->h4
    );
    $section2->writeText(
      '[PLACEHOLDER]',
      $this->_font->body,
      $this->_format->body
    );

    $section2->writeText(
      'Historical Seismicity',
      $this->_font->h4,
      $this->_format->h4
    );
    $section2->writeText(
      '[PLACEHOLDER]',
      $this->_font->body,
      $this->_format->body
    );

    $section2->writeText(
      'Aftershock Forecast',
      $this->_font->h4,
      $this->_format->h4
    );
    $section2->writeText(
      '[PLACEHOLDER]',
      $this->_font->body,
      $this->_format->body
    );

    $section2->writeText(
      'ShakeMap/DYFI',
      $this->_font->h4,
      $this->_format->h4
    );
    $section2->writeText(
      '[PLACEHOLDER]',
      $this->_font->body,
      $this->_format->body
    );

    $section2->writeText(
      'Long-term Probabilities',
      $this->_font->h4,
      $this->_format->h4
    );
    $section2->writeText(
      '[PLACEHOLDER]',
      $this->_font->body,
      $this->_format->body
    );

    $section2->writeText(
      'Earthquake Preparedness',
      $this->_font->h4,
      $this->_format->h4
    );
    $section2->writeText(
      'We should all prepare and be certain the buildings we occupy are safe (see ',
      $this->_font->body,
      $this->_format->body
    );
    $section2->writeHyperLink(
      'https://www.earthquakeauthority.com/California-Earthquake-Risk/Personal-Preparedness/Seven-Steps-to-Earthquake-Safety',
      'The Seven Steps to Earthquake Safety',
      $this->_font->link
    );
    $section2->writeText(
      ').',
      $this->_font->body
    );
  }

  /**
   * RTF Document, Section 3: Impact
   */
  private function _createSection3() {
    $section3 = $this->_rtf->addSection();

    $section3->writeText(
      'Impact',
      $this->_font->h2,
      $this->_format->h2
    );

    $section3->writeText(
      'PAGER',
      $this->_font->h3,
      $this->_format->h3
    );

    $section3->writeText(
      'Alert Level',
      $this->_font->h4,
      $this->_format->h4
    );
    $section3->writeText(
      ucfirst($this->_data->pager->alert),
      $this->_font->pagerAlert[$this->_data->pager->alert],
      $this->_format->body
    );

    if ($this->_data->{'pager-comments'}) {
      $section3->writeText(
        'Summary',
        $this->_font->h4,
        $this->_format->h4
      );
      $section3->writeText(
        $this->_data->{'pager-comments'}->impact1,
        $this->_font->body,
        $this->_format->p // margin below
      );
      $section3->writeText(
        $this->_data->{'pager-comments'}->struct_comment,
        $this->_font->body,
        $this->_format->body // no margin below (margins don't collapse)
      );
    }

    if ($this->_data->pager->economic) {
      $section3->writeText(
        'Estimated Economic Losses',
        $this->_font->h4,
        $this->_format->h4
      );
      $section3->addImage(
        $this->_getRemoteImage($this->_data->pager->economic),
        $this->_format->image,
        12
      );
    }

    if ($this->_data->pager->fatalities) {
      $section3->writeText(
        'Estimated Fatalities',
        $this->_font->h4,
        $this->_format->h4
      );
      $section3->addImage(
        $this->_getRemoteImage($this->_data->pager->fatalities),
        $this->_format->image,
        12
      );
    }

    if ($this->_data->pager->exposure) { // has exposure image
      $section3->insertPageBreak();
      $section3->writeText(
        'Population Exposure',
        $this->_font->h4,
        $this->_format->h4
      );
      $section3->writeText('<br>');
      $section3->addImage(
        $this->_getRemoteImage($this->_data->pager->exposure),
        $this->_format->image,
        10
      );
    }

    $this->_createTableExposure($section3);
  }

  /**
   * RTF Document, Section 4: Mechanism and Fault
   */
  private function _createSection4() {
    $section4 = $this->_rtf->addSection();

    $section4->writeText(
      'Mechanism and Fault',
      $this->_font->h2,
      $this->_format->h2
    );

    $section4->writeText(
      'Focal Mechanism',
      $this->_font->h4,
      $this->_format->h4
    );
    $section4->writeText(
      '[PLACEHOLDER]',
      $this->_font->body,
      $this->_format->body
    );

    $section4->writeText(
      'Moment Tensor',
      $this->_font->h4,
      $this->_format->h4
    );
    $section4->writeText(
      '[PLACEHOLDER]',
      $this->_font->body,
      $this->_format->body
    );

    $section4->writeText(
      'Fault',
      $this->_font->h4,
      $this->_format->h4
    );
    $section4->writeText(
      '[PLACEHOLDER]',
      $this->_font->body,
      $this->_format->body
    );

    if ($this->_data->summary) {
      $section4->writeText(
        'Tectonic Summary',
        $this->_font->h4,
        $this->_format->h4
      );
      $section4->writeText(
        $this->_data->summary,
        $this->_font->body,
        $this->_format->body
      );
    }
  }

  /**
   * RTF Document, Section 5: Ground Shaking
   */
  private function _createSection5() {
    $section5 = $this->_rtf->addSection();

    $section5->writeText(
      'Ground Shaking',
      $this->_font->h2,
      $this->_format->h2
    );

    if ($this->_data->shakemap) {
      $section5->writeText(
        'ShakeMap',
        $this->_font->h4,
        $this->_format->h4
      );
    }

    if ($this->_data->{'shakemap-info'}) {
      $motions = $this->_data->{'shakemap-info'}->output->ground_motions;

      $mmi = round($motions->intensity->max, 1) . ' (bias: ' .
        round($motions->intensity->bias, 3) . ')';
      $pga = round($motions->pga->max) . ' %g (bias: ' .
        round($motions->pga->bias, 3) . ')';
      $pgv = round($motions->pgv->max) . ' cm/s (bias: ' .
        round($motions->pgv->bias, 3) . ')';

      $section5->writeText(
        'Max MMI: ' . $mmi,
        $this->_font->body,
        $this->_format->body
      );
      $section5->writeText(
        'Max PGA: ' . $pga,
        $this->_font->body,
        $this->_format->body
      );
      $section5->writeText(
        'Max PGV: ' . $pgv,
        $this->_font->body,
        $this->_format->body
      );
    }

    if ($this->_data->shakemap) {
      $section5->addImage(
        $this->_getRemoteImage($this->_data->shakemap),
        $this->_format->image,
        12
      );
    }

    $section5->writeText(
      'Ground-Motion Analysis',
      $this->_font->h4,
      $this->_format->h4
    );
    $section5->writeText(
      '[PLACEHOLDER]',
      $this->_font->body,
      $this->_format->body
    );

    if (!empty(get_object_vars($this->_data->dyfi))) {
      $section5->writeText(
        'Did You Feel It?',
        $this->_font->h4,
        $this->_format->h4
      );
      $section5->writeText(
        $this->_data->dyfi->responses . ' responses as of ' . $this->_now,
        $this->_font->body,
        $this->_format->body
      );
      $section5->writeText(
        'Max MMI: ' . $this->_data->dyfi->maxmmi,
        $this->_font->body,
        $this->_format->body
      );

      if ($this->_data->dyfi->map) {
        $section5->addImage(
          $this->_getRemoteImage($this->_data->dyfi->map),
          $this->_format->image,
          12
        );
      }
      if ($this->_data->dyfi->plot) {
        $section5->addImage(
          $this->_getRemoteImage($this->_data->dyfi->plot),
          $this->_format->image,
          12
        );
      }
    }

    $section5->writeText(
      'Ground Failure',
      $this->_font->h4,
      $this->_format->h4
    );
    $section5->writeText(
      '[PLACEHOLDER]',
      $this->_font->body,
      $this->_format->body
    );
  }

  /**
   * RTF Document, Section 5: Aftershocks
   */
  private function _createSection6() {
    $section6 = $this->_rtf->addSection();

    $section6->writeText(
      'Aftershocks',
      $this->_font->h2,
      $this->_format->h2
    );

    $section6->writeText(
      strip_tags($this->_data->aftershocks->description),
      $this->_font->body,
      $this->_format->p
    );

    $this->_createTableBinnedData($section6, 'aftershocks', 'first');

    $section6->writeText(
      '[EQ LIST PLACEHOLDER]',
      $this->_font->body,
      $this->_format->p
    );

    $section6->writeText(
      'Aftershock Forecast',
      $this->_font->h3,
      $this->_format->h3
    );

    $section6->writeText(
      'The probability of one or more aftershocks of at least magnitude M within the given time frame:',
      $this->_font->body,
      $this->_format->p
    );

    $section6->writeText(
      'The likely number of aftershocks of at least magnitude M within the given time frame:',
      $this->_font->body,
      $this->_format->p
    );

    $datetime = date('Y-m-d g:ia \(T\)', $this->_data->aftershocks->forecast[0]->timeStart / 1000);
    $section6->writeText(
      '<strong>Forecast starts</strong>: ' . $datetime,
      $this->_font->body,
      $this->_format->p
    );

    $section6->writeText(
      '<strong>Model</strong>: ' . $this->_data->aftershocks->model->name,
      $this->_font->body,
      $this->_format->p
    );
  }

  /**
   * Create binned data table
   *
   * @param $section {Object}
   *     RTF Document section
   * @param $id {String}
   *     Feature id
   * @param $type {String <first | past | prior>}
   */
  private function _createTableBinnedData($section, $id, $type) {
    $data = $this->_data->{$id}->bins->{$type};

    // Convert table rows to an array and sort by key
    $rows = get_object_vars($data);
    ksort($rows);

    $numRows = count($rows) + 1; // data rows + 1 header row
    $table = $section->addTable();
    $table->addRows($numRows);
    $table->addColumnsList(array(1.5, 1.5, 1.5, 1.5, 1.5, 1.5));

    $headerCol1 = $table->getCell(1, 1);
    $headerCol1->setTextAlignment('center');
    $headerCol1->writeText(strtoupper($type));
    $headerCol2 = $table->getCell(1, 2);
    $headerCol2->setTextAlignment('center');
    $headerCol2->writeText('DAY');
    $headerCol3 = $table->getCell(1, 3);
    $headerCol3->setTextAlignment('center');
    $headerCol3->writeText('WEEK');
    $headerCol4 = $table->getCell(1, 4);
    $headerCol4->setTextAlignment('center');
    $headerCol4->writeText('MONTH');
    $headerCol5 = $table->getCell(1, 5);
    $headerCol5->setTextAlignment('center');
    $headerCol5->writeText('YEAR');
    $headerCol6 = $table->getCell(1, 6);
    $headerCol6->setTextAlignment('center');
    $headerCol6->writeText('TOTAL');

    //$table->setBackgroundForCellRange('#000000', 1, 1, 1, 3);
    $table->setFontForCellRange($this->_font->th, 1, 2, 1, 6);
    $table->setFontForCellRange($this->_font->th, 2, 1, $numRows, 1);
    $table->setFontForCellRange($this->_font->body, 2, 1, $numRows, 6);

    $row = 1;
    foreach ($rows as $th => $tds) {
      $row ++;
      $cell = $table->getCell($row, 1);
      $cell->writeText(strtoupper($th));
      $cell->setTextAlignment('center');

      $col = 1;
      foreach ($tds as $key => $value) {
        $col ++;
        $cell = $table->getCell($row, $col);
        $cell->writeText($value);
        $cell->setTextAlignment('right');
      }
    }
  }

  /**
   * Create population exposure table
   *
   * @param $section {Object}
   *     RTF Document section
   */
  private function _createTableExposure($section) {
    $cities = $this->_data->{'pager-cities'};
    $mmis = array_filter(
      $this->_data->{'pager-exposures'}->mmi,
      function($value) {
        if ($value >= 2) {
          return $value;
        }
      }
    );
    $population = array_filter(
      $this->_data->{'pager-exposures'}->population,
      function($value) {
        if ($value > 0) {
          return $value;
        }
      }
    );
    $shaking = $this->_data->{'pager-exposures'}->shaking;
    $numRows = count($cities) + count($population)  + 1; // data rows + 1 header row

    $section->writeText('<br>');
    $table = $section->addTable();
    $table->addRows($numRows);
    $table->addColumnsList(array(2, 5, 3));

    $headerCol1 = $table->getCell(1, 1);
    $headerCol1->setTextAlignment('center');
    $headerCol1->writeText('MMI');
    $headerCol2 = $table->getCell(1, 2);
    $headerCol2->setTextAlignment('center');
    $headerCol2->writeText('Level / Selected Cities');
    $headerCol3 = $table->getCell(1, 3);
    $headerCol3->setTextAlignment('center');
    $headerCol3->writeText('Population');

    $table->setBackgroundForCellRange('#000000', 1, 1, 1, 3);
    $table->setFontForCellRange($this->_font->th, 1, 1, 1, 3);
    $table->setFontForCellRange($this->_font->body, 2, 1, $numRows, 3);

    $row = 1;
    foreach ($mmis as $i => $mmi) {
      if (array_key_exists($i, $population) && $mmi >= 2 && $population[$i] > 0)
      { // skip mmi below 2 and when nobody affected
        $row ++;

        $cellIntensity = $table->getCell($row, 1);
        $cellIntensity->setCellPaddings(0, 0.05, 0, 0.05);
        $cellIntensity->setTextAlignment('center');
        $cellIntensity->writeText($shaking[$i]->intensity);
        $cellLevel = $table->getCell($row, 2);
        $cellLevel->setCellPaddings(0, 0.05, 0, 0.05);
        $cellLevel->setTextAlignment('left');
        $cellLevel->writeText($shaking[$i]->level);
        $cellPop = $table->getCell($row, 3);
        $cellPop->setCellPaddings(0, 0.05, 0, 0.05);
        $cellPop->setTextAlignment('right');
        $cellPop->writeText($this->_addCommas($population[$i]));

        foreach ($cities as $city) {
          $cityMmi = intVal(round($city->mmi, 0));
          if ($cityMmi === $mmi) {
            $row ++;
            $table->getRow($row)->setFont($this->_font->bodyLighter);

            $cellCity = $table->getCell($row, 2);
            $cellCity->setCellPaddings(0, 0.05, 0, 0.05);
            $cellCity->writeText($city->name);
            $cellPop = $table->getCell($row, 3);
            $cellPop->setCellPaddings(0, 0.05, 0, 0.05);
            $cellPop->setTextAlignment('right');
            $cellPop->writeText($this->_addCommas($city->pop));
          }
        }
      }
    }

    $table->setBorderForCellRange(
      $this->_border->tdLast,
      $row, 1, $row, 3
    );
  }

  /**
   * Set RTF Document page margins (unit is centimeters)
   */
  private function _setMargins() {
    $this->_rtf->setMarginBottom(2);
    $this->_rtf->setMarginLeft(2.5);
    $this->_rtf->setMarginRight(2.5);
    $this->_rtf->setMarginTop(2);
  }

  /**
   * Set styles for text, images, etc. in RTF Document
   */
  private function _setStyles() {
    $this->_border->tdLast = new PHPRtfLite_Border(
      $this->_rtf,
      new PHPRtfLite_Border_Format(),
      new PHPRtfLite_Border_Format(),
      new PHPRtfLite_Border_Format(),
      new PHPRtfLite_Border_Format(1, '#000000')
    );

    $this->_font->body = new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#FFFFFF');
    $this->_font->bodyLighter = new PHPRtfLite_Font(12, 'Helvetica', '#999999', '#FFFFFF');

    $this->_font->h1 = new PHPRtfLite_Font(18, 'Calibri', '#000000', '#FFFFFF');
    $this->_font->h1->setBold();

    $this->_font->h2 = new PHPRtfLite_Font(16, 'Calibri', '#313131', '#FFFFFF');
    $this->_font->h2->setBold();

    $this->_font->h3 = new PHPRtfLite_Font(14, 'Calibri', '#474747', '#FFFFFF');
    $this->_font->h3->setBold();

    $this->_font->h4 = new PHPRtfLite_Font(12, 'Calibri', '#5281c9', '#FFFFFF');
    $this->_font->h4->setBold();

    $this->_font->link = new PHPRtfLite_Font(12, 'Helvetica', '#0000CC', '#FFFFFF');
    $this->_font->link->setUnderline();

    $this->_font->pagerAlert = [
      'green' => new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#00b04f'),
      'orange' => new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#FF9900'),
      'red' => new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#FF0000'),
      'yellow' => new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#FFFF00')
    ];

    $this->_font->th = new PHPRtfLite_Font(12, 'Helvetica', '#FFFFFF', '#000000');

    $this->_format->body = new PHPRtfLite_ParFormat('left');
    $this->_format->body->setSpaceAfter(0);
    $this->_format->body->setSpaceBefore(0);
    $this->_format->body->setSpaceBetweenLines(1.5);

    $this->_format->center = new PHPRtfLite_ParFormat('center');
    $this->_format->center->setSpaceAfter(10);
    $this->_format->center->setSpaceBefore(0);

    $this->_format->h1 = new PHPRtfLite_ParFormat('center');
    $this->_format->h1->setSpaceBetweenLines(1.5);

    $this->_format->h2 = new PHPRtfLite_ParFormat('left');
    $this->_format->h2->setSpaceAfter(6);
    $this->_format->h2->setSpaceBefore(6);

    $this->_format->h3 = new PHPRtfLite_ParFormat('left');
    $this->_format->h3->setSpaceAfter(0);
    $this->_format->h3->setSpaceBefore(16);

    $this->_format->h4 = new PHPRtfLite_ParFormat('left');
    $this->_format->h4->setSpaceAfter(0);
    $this->_format->h4->setSpaceBefore(16);

    $this->_format->image = new PHPRtfLite_ParFormat('left');

    $this->_format->p = new PHPRtfLite_ParFormat('left');
    $this->_format->p->setSpaceAfter(12);
    $this->_format->p->setSpaceBefore(0);
    $this->_format->p->setSpaceBetweenLines(1.5);
  }
}
