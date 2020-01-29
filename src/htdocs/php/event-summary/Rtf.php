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
  private $_data,
          $_font,
          $_format,
          $_now,
          $_rtf;

  public $file;

  public function __construct ($data) {
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

    while (preg_match($regex, $int)) {
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
    $this->_data->summary = trim($this->_data->summary);

    // Remove header from summary if it exists
    $this->_data->summary = preg_replace('/^tectonic summary ?/i', '',
      $this->_data->summary
    );

    // Strip extra whitespace from PAGER summary
    if (property_exists($this->_data, 'pager-comments')) {
      $this->_data->{'pager-comments'}->struct_comment = preg_replace(
        '/\s+/', ' ', $this->_data->{'pager-comments'}->struct_comment
      );
    }

    // Clean up / remove null values from historical events list
    if (property_exists($this->_data, 'historical-events')) {
      foreach ($this->_data->{'historical-events'} as $key => $event) {
        if (!$event) { // NULL
          unset($this->_data->{'historical-events'}[$key]);
        } else { // clean up slashes/extra quotes on name prop
          $event->Name = trim(stripslashes($event->Name), '"');
        }
      }
      if (count($this->_data->{'historical-events'}) === 0) {
        unset($this->_data->{'historical-events'});
      }
    }
  }

  /**
   * Create the RTF document
   */
  private function _createRtf() {
    $this->_setMargins();
    $this->_setStyles();

    $this->_createSection1();
    $this->_createSection2();
    $this->_createSection3();
    $this->_createSection4();
    $this->_createSection5();
    $this->_createSection6();
    $this->_createSection7();
    $this->_createSection8();
    $this->_createSection9();
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
   * Get a roman numeral from number
   *
   * @param $number {Number}
   *
   * @return $r {String}
   */
  private function _numberToRoman($number) {
    $num = intVal($number);
    $lookup = array('M' => 1000, 'CM' => 900, 'D' => 500, 'CD' => 400,
      'C' => 100, 'XC' => 90, 'L' => 50, 'XL' => 40, 'X' => 10, 'IX' => 9,
      'V' => 5, 'IV' => 4, 'I' => 1);
    $r = '';

    while ($num > 0) {
      foreach ($lookup as $roman => $int) {
        if ($num >= $int) {
          $num -= $int;
          $r .= $roman;
          break;
        }
      }
    }

    return $r;
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

    $datetime = $this->_data->time->utc . ' (UTC)';
    if (property_exists($this->_data->time, 'local')) {
      $datetime .= '<br>' . $this->_data->time->local . ' (local time at epicenter)';
    }

    $nearbyCitiesList = '';
    if (property_exists($this->_data, 'nearby-cities')) {
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
      $datetime,
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
    if (!empty(get_object_vars($this->_data->pager))) {
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

      if (property_exists($this->_data->pager, 'alert')) {
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
      }

      if (property_exists($this->_data, 'pager-comments')) {
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

      if (property_exists($this->_data->pager, 'economic')) {
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

      if (property_exists($this->_data->pager, 'fatalities')) {
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

      if (property_exists($this->_data->pager, 'exposure')) {
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

      if (
        !empty($this->_data->{'pager-cities'}) &&
        !empty(get_object_vars($this->_data->{'pager-exposures'}))
      ) {
        $this->_createTableExposure($section3);
      }
    }
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

    if (property_exists($this->_data, 'shakemap-info')) {
      $motions = $this->_data->{'shakemap-info'}->output->ground_motions;

      if (property_exists($motions, 'intensity')) {
        $mmi = round($motions->intensity->max, 1) . ' (bias: ' .
          round($motions->intensity->bias, 3) . ')';
        $section5->writeText(
          'Max MMI: ' . $mmi,
          $this->_font->body,
          $this->_format->body
        );
      }
      if (property_exists($motions, 'pga')) {
        $pga = round($motions->pga->max) . ' %g (bias: ' .
          round($motions->pga->bias, 3) . ')';
        $section5->writeText(
          'Max PGA: ' . $pga,
          $this->_font->body,
          $this->_format->body
        );
      }
      if (property_exists($motions, 'pgv')) {
        $pgv = round($motions->pgv->max) . ' cm/s (bias: ' .
          round($motions->pgv->bias, 3) . ')';
        $section5->writeText(
          'Max PGV: ' . $pgv,
          $this->_font->body,
          $this->_format->body
        );
      }
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

      if (property_exists($this->_data->dyfi, 'map')) {
        $section5->addImage(
          $this->_getRemoteImage($this->_data->dyfi->map),
          $this->_format->image,
          12
        );
      }
      if (property_exists($this->_data->dyfi, 'plot')) {
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
   * RTF Document, Section 6: Aftershocks
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
      $this->_format->body
    );

    if (empty(get_object_vars($this->_data->aftershocks->bins))) {
      $section6->writeText(
        'None',
        $this->_font->h3,
        $this->_format->h3
      );
    } else {
      $this->_createTableBinnedData($section6, 'aftershocks', 'first');
      $this->_createTableBinnedData($section6, 'aftershocks', 'past');
    }

    $section6->writeText(
      '[EQ LIST PLACEHOLDER]',
      $this->_font->body,
      $this->_format->p
    );

    if (!empty($this->_data->aftershocks->forecast)) {
      $section6->writeText(
        'Aftershock Forecast',
        $this->_font->h3,
        $this->_format->h3
      );

      $section6->writeText(
        'The probability of one or more aftershocks of at least magnitude M ' .
          'within the given time frame:',
        $this->_font->body,
        $this->_format->body
      );
      $this->_createTableForecast($section6, 'probability');

      $section6->writeText(
        'The likely number of aftershocks of at least magnitude M within the ' .
          'given time frame (95% confidence range):',
        $this->_font->body,
        $this->_format->body
      );
      $this->_createTableForecast($section6, 'number');

      $section6->writeText(
        '* = An earthquake is possible, but the probability is low.',
        $this->_font->body,
        $this->_format->p
      );

      $datetime = date(
        'Y-m-d g:ia \(T\)',
        $this->_data->aftershocks->forecast[0]->timeStart / 1000
      );
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
  }

  /**
   * RTF Document, Section 7: Foreshocks
   */
  private function _createSection7() {
    $section7 = $this->_rtf->addSection();

    $section7->writeText(
      'Foreshocks',
      $this->_font->h2,
      $this->_format->h2
    );

    $section7->writeText(
      strip_tags($this->_data->foreshocks->description),
      $this->_font->body,
      $this->_format->body
    );

    if (empty(get_object_vars($this->_data->foreshocks->bins))) {
      $section7->writeText(
        'None',
        $this->_font->h3,
        $this->_format->h3
      );
    } else {
      $this->_createTableBinnedData($section7, 'foreshocks', 'prior');
    }

    $section7->writeText(
      '[EQ LIST PLACEHOLDER]',
      $this->_font->body,
      $this->_format->p
    );
  }

  /**
   * RTF Document, Section 8: Historical Seismicity
   */
  private function _createSection8() {
    $section8 = $this->_rtf->addSection();

    $section8->writeText(
      'Historical Seismicity',
      $this->_font->h2,
      $this->_format->h2
    );

    $section8->writeText(
      strip_tags($this->_data->historical->description),
      $this->_font->body,
      $this->_format->body
    );

    if (empty(get_object_vars($this->_data->historical->bins))) {
      $section8->writeText(
        'None',
        $this->_font->h3,
        $this->_format->h3
      );
    } else {
      $this->_createTableBinnedData($section8, 'historical', 'prior');
    }

    $section8->writeText(
      '[EQ LIST PLACEHOLDER]',
      $this->_font->body,
      $this->_format->p
    );

    if (property_exists($this->_data, 'historical-events')) {
      $events = $this->_data->{'historical-events'};

      // Get sort order based on event date/time
      $dates = array();
      foreach ($events as $key => $event) {
        $dates[$key] = $event->Time;
      }
      arsort($dates);
      $sortKeys = array_keys($dates);

      $section8->writeText(
        'Previous Significant Earthquakes',
        $this->_font->h3,
        $this->_format->h3
      );

      foreach ($sortKeys as $key) {
        $event = $events[$key];

        $section8->writeText(
          $event->Name,
          $this->_font->h4,
          $this->_format->h4
        );
        $section8->writeText(
          'M ' . $event->Magnitude . ', ' . $event->Time . ' (UTC)',
          $this->_font->body,
          $this->_format->body
        );
        $section8->writeText(
          round($event->Distance) . ' km away',
          $this->_font->body,
          $this->_format->body
        );

        $effects = '';
        if (!is_null($event->ShakingDeaths)) {
          $effects = $event->ShakingDeaths . ' shaking fatalities';
        }
        if (!is_null($event->Injured)) {
          if ($effects) {
            $effects .= '; ';
          }
          $effects .= $event->Injured . ' injured';
        }
        if ($effects) {
          $section8->writeText(
            $effects,
            $this->_font->body,
            $this->_format->body
          );
        }

        $section8->writeText(
          'Max MMI: ' . $this->_numberToRoman($event->MaxMMI) . ' (pop ' .
            $this->_addCommas($event->NumMaxMMI) . ')',
          $this->_font->body,
          $this->_format->body
        );
      }
    }
  }

  /**
   * RTF Document, Section 9: ShakeAlert
   */
  private function _createSection9() {
    $section9 = $this->_rtf->addSection();

    $section9->writeText(
      'ShakeAlert',
      $this->_font->h2,
      $this->_format->h2
    );
    $section9->writeText(
      '[PLACEHOLDER]',
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

    $section->writeText(
      '<br>',
      $this->_font->body,
      $this->_format->table // sets paragraph formatting in table that follows
    );

    $table = $section->addTable();
    $table->addRows($numRows);
    $table->addColumnsList(array(1.65, 1.65, 1.65, 1.65, 1.65, 1.65));
    $table->setBackgroundForCellRange('#F7F7F7', $numRows, 2, $numRows, 6);
    $table->setBackgroundForCellRange('#F7F7F7', 2, 6, $numRows, 6);
    $table->setBordersForCellRange(
      $this->_format->borderLighter,
      1, 1, $numRows, 6,
      false, false, false, true
    );
    $table->setBordersForCellRange(
      $this->_format->border,
      1, 2, 1, 6,
      false, false, false, true
    );
    $table->setBordersForCellRange(
      $this->_format->border,
      2, 1, $numRows, 1,
      false, false, true, false
    );
    $table->setFontForCellRange($this->_font->th, 1, 2, 1, 6);
    $table->setFontForCellRange($this->_font->th, 2, 1, $numRows, 1);
    $table->setFontForCellRange($this->_font->tdBg, $numRows, 2, $numRows, 6);
    $table->setFontForCellRange($this->_font->tdBg, 2, 6, $numRows, 6);
    $table->setFontForCellRange($this->_font->td, 2, 2, $numRows - 1, 5);
    $table->setTextAlignmentForCellRange('center', 1, 2, 1, 6);
    $table->setTextAlignmentForCellRange('center', 2, 1, $numRows, 1);
    $table->setTextAlignmentForCellRange('right', 2, 2, $numRows, 6);

    // Header row
    $cell = $table->getCell(1, 1);
    $cell->setTextAlignment('right');
    $cell->writeText(ucfirst($type) . ':');

    $ths = array_keys(get_object_vars($rows['total']));
    foreach ($ths as $key => $th) {
      $cell = $table->getCell(1, $key + 2);
      $cell->writeText(ucfirst($th));
    }

    // Data rows
    $row = 1;
    foreach ($rows as $th => $tds) {
      $row ++;
      $cell = $table->getCell($row, 1);
      $cell->setCellPaddings(0.1, 0.15, 0.1, 0.15);
      $cell->writeText(ucfirst($th)); // row header

      $col = 1;
      foreach ($tds as $td) {
        $col ++;
        $cell = $table->getCell($row, $col);
        $cell->setCellPaddings(0.1, 0.15, 0.1, 0.15);
        $cell->writeText($td); // row data
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
    $cities = array_filter( // keep values where mmi >=2
      $this->_data->{'pager-cities'},
      function($value) {
        if (intVal(round($value->mmi)) >= 2) {
          return $value;
        }
      }
    );
    $mmis = array_filter( // keep values where mmi >=2
      $this->_data->{'pager-exposures'}->mmi,
      function($value) {
        if ($value >= 2) {
          return $value;
        }
      }
    );
    $population = array_filter( // keep values where population > 0 and mmi >=2
      $this->_data->{'pager-exposures'}->population,
      function($value, $key) {
        if ($value > 0 && $this->_data->{'pager-exposures'}->mmi[$key] >= 2) {
          return $value;
        }
      },
      ARRAY_FILTER_USE_BOTH
    );
    $shaking = $this->_data->{'pager-exposures'}->shaking;
    $numRows = count($cities) + count($population)  + 1; // data rows + 1 header row

    if ($numRows > 1) { // table contains data (and not just a header row)
      $section->writeText(
        '<br>',
        $this->_font->body,
        $this->_format->table // sets formatting in table that follows
      );

      $table = $section->addTable();
      $table->addRows($numRows);
      $table->addColumnsList(array(2, 5, 3));
      $table->setBackgroundForCellRange('#000000', 1, 1, 1, 3);
      $table->setBordersForCellRange(
        $this->_format->borderDarker,
        $numRows, 1, $numRows, 3,
        false, false, false, true
      );
      $table->setFontForCellRange($this->_font->thBg, 1, 1, 1, 3);
      $table->setFontForCellRange($this->_font->td, 2, 1, $numRows, 3);
      $table->setTextAlignmentForCellRange('center', 1, 1, 1, 3);
      $table->setTextAlignmentForCellRange('center', 2, 1, $numRows, 1);
      $table->setTextAlignmentForCellRange('left', 2, 2, $numRows, 2);
      $table->setTextAlignmentForCellRange('right', 2, 3, $numRows, 3);

      // Header row
      foreach (['MMI', 'Level / Selected Cities', 'Population'] as $key => $th) {
        $cell = $table->getCell(1, $key + 1);
        $cell->writeText($th);
      }

      // Data rows
      $row = 1;
      foreach ($mmis as $i => $mmi) {
        if (array_key_exists($i, $population)) { // value was not filtered out
          $row ++;
          $tds = [
            $shaking[$i]->intensity,
            $shaking[$i]->level,
            $this->_addCommas($population[$i])
          ];

          foreach ($tds as $key => $td) {
            $col = $key + 1;
            $cell = $table->getCell($row, $col);
            $cell->setCellPaddings(0, 0.025, 0, 0.125);
            $cell->writeText($td);
          }

          foreach ($cities as $city) {
            $cityMmi = intVal(round($city->mmi));
            if ($cityMmi === $mmi) {
              $row ++;
              $tds = [
                $city->name,
                $this->_addCommas($city->pop)
              ];

              $table->getRow($row)->setFont($this->_font->tdLighter);

              foreach ($tds as $key => $td) {
                $col = $key + 2;
                $cell = $table->getCell($row, $col);
                $cell->setCellPaddings(0, 0.025, 0, 0.125);
                $cell->writeText($td);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Create Aftershocks forecast table
   *
   * @param $section {Object}
   *     RTF Document section
   * @param $type {String <number | probability>}
   */
  private function _createTableForecast($section, $type) {
    $forecasts = $this->_data->aftershocks->forecast;
    $numCols = count($forecasts) + 1; // data cols + 1 header col
    $numRows = count($forecasts[0]->bins) + 1; // data rows + 1 header row

    $columns = array(2, 2, 2, 2, 2);
    if ($type === 'number') {
      $columns = array(2.5, 2.5, 2.5, 2.5, 2.5);
    }

    $section->writeText(
      '<br>',
      $this->_font->body,
      $this->_format->table // sets paragraph formatting in table that follows
    );

    $table = $section->addTable();
    $table->addRows($numRows);
    $table->addColumnsList($columns);
    $table->setBordersForCellRange(
      $this->_format->borderLighter,
      1, 1, $numRows, $numCols,
      false, false, true, true
    );
    $table->setFontForCellRange($this->_font->td, 2, 2, $numRows, $numCols);
    $table->setFontForCellRange($this->_font->th, 1, 2, 1, $numCols);
    $table->setFontForCellRange($this->_font->th, 2, 1, $numRows, 1);
    $table->setTextAlignmentForCellRange('right', 2, 2, $numRows, $numCols);
    $table->setTextAlignmentForCellRange('center', 1, 2, 1, $numCols);
    $table->setTextAlignmentForCellRange('center', 2, 1, $numRows, 1);

    $col = 1;
    foreach ($forecasts as $forecast) {
      $col ++;

      // Header row
      $cell = $table->getCell(1, $col);
      $cell->setCellPaddings(0.1, 0.15, 0.1, 0.15);
      $cell->writeText($forecast->label);

      // Data rows
      $row = 1;
      foreach ($forecast->bins as $bin) {
        $row ++;

        if ($col === 2) { // first pass, render magnitude headers
          $cell = $table->getCell($row, 1);
          $cell->setCellPaddings(0.1, 0.15, 0.1, 0.15);
          $cell->writeText('M ' . $bin->magnitude . '+');
        }

        $cell = $table->getCell($row, $col);
        $cell->setCellPaddings(0.1, 0.15, 0.1, 0.15);

        if ($type === 'number') {
          if ($bin->p95minimum === 0 && $bin->p95maximum === 0) {
            $number = '*';
          } else {
            $number = $bin->p95minimum . ' to ' . $bin->p95maximum;
          }
          $cell->writeText($number);
        } else {
          if ($bin->probability < .01) {
            $probability = '< 1';
          } else if ($bin->probability > .99) {
            $probability = '> 99';
          } else {
            $probability = round($bin->probability * 100);
          }
          $cell->writeText($probability . '%');
        }
      }
    }
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
    $this->_font->body = new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#FFFFFF');

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

    $this->_font->td = new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#FFFFFF');
    $this->_font->tdBg = new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#F7F7F7');
    $this->_font->tdLighter = new PHPRtfLite_Font(12, 'Helvetica', '#999999', '#FFFFFF');

    $this->_font->th = new PHPRtfLite_Font(12, 'Helvetica', '#444444', '#FFFFFF');
    $this->_font->th->setBold();
    $this->_font->thBg = new PHPRtfLite_Font(12, 'Helvetica', '#FFFFFF', '#000000');

    $this->_format->body = new PHPRtfLite_ParFormat('left');
    $this->_format->body->setSpaceAfter(0);
    $this->_format->body->setSpaceBefore(0);
    $this->_format->body->setSpaceBetweenLines(1.5);

    $this->_format->border = new PHPRtfLite_Border_Format(1, '#DDDDDD');
    $this->_format->borderDarker = new PHPRtfLite_Border_Format(1, '#000000');
    $this->_format->borderLighter = new PHPRtfLite_Border_Format(1, '#EFEFEF');

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

    $this->_format->p = new PHPRtfLite_ParFormat('left'); // same as body but w/ bottom margin
    $this->_format->p->setSpaceAfter(12);
    $this->_format->p->setSpaceBefore(0);
    $this->_format->p->setSpaceBetweenLines(1.5);

    $this->_format->table = new PHPRtfLite_ParFormat('left'); // attach to <br> before table
  }
}
