<?php

// Load the PHP RTF library/API (https://github.com/phprtflite/PHPRtfLite)
include_once '../../lib/PHPRtfLite.php';
PHPRtfLite::registerAutoloader();

date_default_timezone_set('America/Los_Angeles');

/**
 * Using the PHPRtfLite library, create an Event Summary RTF file and save it
 * to a local (temp) directory for downloading to the user's device.
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
          $_fields,
          $_font,
          $_format,
          $_now,
          $_rtf;

  public $file;

  public function __construct ($data) {
    $this->_data = $data;
    $this->_fields = $this->_getFields();
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
  * Add commas to large numbers.
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
   * Sanitize data from external JSON feeds for known issues.
   */
  private function _cleanData() {
    // Strip HTML tags, extra whitespace from tectonic summary
    $this->_data->tectonic = preg_replace('/\s+/', ' ',
      strip_tags($this->_data->tectonic)
    );
    $this->_data->tectonic = trim($this->_data->tectonic);

    // Remove header from tectonic summary if it exists
    $this->_data->tectonic = preg_replace('/^tectonic summary ?/i', '',
      $this->_data->tectonic
    );

    // Strip HTML tags, extra whitespace from notice
    $this->_data->notice = preg_replace('/\s+/', ' ',
      strip_tags($this->_data->notice)
    );
    $this->_data->notice = trim($this->_data->notice);

    // Strip extra whitespace from PAGER summary
    $this->_data->pagerComments->structComment = preg_replace(
      '/\s+/', ' ', $this->_data->pagerComments->structComment
    );

    // Clean up / remove NULL values from historical events list
    foreach ($this->_data->historicalEvents as $key => $event) {
      if (!$event) { // NULL
        unset($this->_data->historicalEvents[$key]);
      } else { // clean up slashes/extra quotes on name prop
        $event->Name = trim(stripslashes($event->Name), '"');
      }
    }
  }

  /**
   * Create the RTF document.
   */
  private function _createRtf() {
    $this->_setMargins();
    $this->_setStyles();

    $this->_createSection1(); // Basic earthquake details
    $this->_createSection2(); // Talking Points
    $this->_createSection3(); // Impact
    $this->_createSection4(); // Mechanism and Fault
    $this->_createSection5(); // Ground Shaking
    $this->_createSection6(); // Aftershocks
    $this->_createSection7(); // Foreshocks
    $this->_createSection8(); // Historical Seismicity
    $this->_createSection9(); // ShakeAlert
  }

  /**
   * Get the Mainshock's date and time formatted for display.
   *
   * @return $datetime {String}
   */
  private function _getDateTime() {
    $day = $this->_data->day;
    $time = $this->_data->time;
    $datetime = join(' ', [
      substr($day->utc, 0, 3),
      strip_tags($time->utc),
      '<br>'
    ]);
    $datetime .= join(' ', [
      substr($day->user, 0, 3),
      strip_tags($time->user)
    ]);

    if ($time->local) {
      $datetime .= '<br>' . strip_tags($time->local);
    }

    return $datetime;
  }

  /**
   * Get the field names for the earthquake list tables.
   *
   * @return $fields {Array}
   */
  private function _getFields() {
    $fields = [
      'magDisplay' => 'Mag',
      'utcTimeDisplay' => 'Time (UTC)',
      'depthDisplay' => 'Depth',
      'location' => 'Location',
      'distanceDisplay' => 'Distance',
      'id' => 'Event ID'
    ];
    $time = $this->_data->time;

    // Display user time (replace UTC time)
    if ($time->zone === 'user') {
      $fields = array_merge(
        array_slice($fields, 0, 1),
        ['userTimeDisplay' => "Time ($time->utcOffset)"],
        array_slice($fields, 2)
      );
    }

    return $fields;
  }

  /**
   * Create a local (temporary) image from a data URI.
   *
   * @param $data {String}
   *     image data URI base 64 encoded in .png format
   *
   * @return $path {String}
   *     path of new local image
   */
  private function _getImage($data) {
    $filtered = substr($data, strpos($data, ",") + 1); // remove encoding metadata
    $contents = base64_decode($filtered); // decode base 64 data
    $path = $this->_getPath('png');
    $img = fopen($path, 'wb');

    fwrite($img, $contents);
    fclose($img);

    return $path;
  }

  /**
   * Create a unique filename (full path) for attachments based on the eqid.
   *
   * @param $extension {String}
   *
   * @return {String}
   */
  private function _getPath($extension) {
    static $count = 0;
    $count ++;

    return "/tmp/{$this->_data->eqid}-$count.$extension";
  }

  /**
   * Create a local (temporary) copy of an image from a remote image.
   *
   * @param $url {String}
   *     URL of remote image
   *
   * @return $path {String}
   *     path of new local image
   */
  private function _getRemoteImage($url) {
    preg_match('/\.(\w+)$/', $url, $matches); // get image extension
    $extension = $matches[1];
    $path = $this->_getPath($extension);
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
   * Get a roman numeral from number.
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
   * Save a local (temporary) copy of the RTF file and store its path in $file.
   */
  private function _saveFile() {
    $timestamp = date('YmdHis'); // e.g. 20191024093156 (ensures unique name)
    $this->file = "/tmp/{$this->_data->eqid}-$timestamp-event-summary.rtf";

    $this->_rtf->save($this->file);
  }

  // ------------------------------------------------------------------
  // Utility methods for creating the RTF file using PHPRtfLite library
  // ------------------------------------------------------------------

  /**
   * Section 1: Basic earthquake details.
   */
  private function _createSection1() {
    $nearbyCitiesList = '';
    $section1 = $this->_rtf->addSection();

    foreach ($this->_data->nearbyCities as $city) {
      $nearbyCitiesList .= $city->distance . ' km ' . $city->direction .
        ' of ' . $city->name . '<br>';
    }
    $nearbyCitiesList = substr($nearbyCitiesList, 0, -4); // remove final <br>

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
      $this->_getDateTime(),
      $this->_font->body,
      $this->_format->body
    );

    $section1->writeText(
      'Magnitude',
      $this->_font->h4,
      $this->_format->h4
    );
    $section1->writeText(
      $this->_data->magType . ' ' . $this->_data->magDisplay,
      $this->_font->body,
      $this->_format->body
    );

    $section1->writeText(
      'Depth',
      $this->_font->h4,
      $this->_format->h4
    );
    $section1->writeText(
      strip_tags($this->_data->depthDisplay),
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
   * Section 2: Talking Points.
   */
  private function _createSection2() {
    $section2 = $this->_rtf->addSection();

    $section2->writeText(
      'Talking Points',
      $this->_font->h2,
      $this->_format->h2
    );

    if ($this->_data->notice) {
      $section2->writeText(
        $this->_data->notice,
        $this->_font->body,
        $this->_format->body
      );
    }

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
      'Fault and Tectonic Setting',
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
   * Section 3: Impact.
   */
  private function _createSection3() {
    $pager = $this->_data->pager;

    if (!empty(get_object_vars($pager))) {
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

      if (property_exists($pager, 'alert')) {
        $section3->writeText(
          'Alert Level',
          $this->_font->h4,
          $this->_format->h4
        );
        $section3->writeText(
          ucfirst($pager->alert),
          $this->_font->pagerAlert[$pager->alert],
          $this->_format->body
        );
      }

      $pagerComments = $this->_data->pagerComments;

      if ($pagerComments->impact1 || $pagerComments->structComment) {
        $section3->writeText(
          'Summary',
          $this->_font->h4,
          $this->_format->h4
        );
        $section3->writeText(
          $pagerComments->impact1,
          $this->_font->body,
          $this->_format->p // margin below
        );
        $section3->writeText(
          $pagerComments->structComment,
          $this->_font->body,
          $this->_format->body // no margin below (margins don't collapse)
        );
      }

      if (property_exists($pager, 'economic')) {
        $section3->writeText(
          'Estimated Economic Losses',
          $this->_font->h4,
          $this->_format->h4
        );
        $section3->addImage(
          $this->_getRemoteImage($pager->economic),
          $this->_format->image,
          12
        );
      }

      if (property_exists($pager, 'fatalities')) {
        $section3->writeText(
          'Estimated Fatalities',
          $this->_font->h4,
          $this->_format->h4
        );
        $section3->addImage(
          $this->_getRemoteImage($pager->fatalities),
          $this->_format->image,
          12
        );
      }

      if (property_exists($pager, 'exposure')) {
        $section3->insertPageBreak();
        $section3->writeText(
          'Population Exposure',
          $this->_font->h4,
          $this->_format->h4
        );
        $section3->writeText('<br>');
        $section3->addImage(
          $this->_getRemoteImage($pager->exposure),
          $this->_format->image,
          10
        );
      }

      if (!empty(get_object_vars($this->_data->pagerExposures))) {
        $this->_createTableExposure($section3);
      }
    }
  }

  /**
   * Section 4: Mechanism and Fault.
   */
  private function _createSection4() {
    $beachballs = $this->_data->beachballs;
    $section4 = $this->_rtf->addSection();

    $section4->writeText(
      'Mechanism and Fault',
      $this->_font->h2,
      $this->_format->h2
    );

    if (property_exists($beachballs, 'focal-mechanism')) {
      $beachball = $beachballs->{'focal-mechanism'};

      $section4->writeText(
        'Focal Mechanism',
        $this->_font->h4,
        $this->_format->h4
      );
      $section4->writeText('<br>');
      $section4->addImage(
        $this->_getImage($beachball->image),
        $this->_format->image,
        10
      );
      $section4->writeText(
        'Status: ' . ucfirst($beachball->status),
        $this->_font->body,
        $this->_format->body
      );
    }

    if (property_exists($beachballs, 'moment-tensor')) {
      $beachball = $beachballs->{'moment-tensor'};

      $section4->writeText(
        'Moment Tensor',
        $this->_font->h4,
        $this->_format->h4
      );
      $section4->writeText('<br>');
      $section4->addImage(
        $this->_getImage($beachball->image),
        $this->_format->image,
        10
      );
      $section4->writeText(
        'Status: ' . ucfirst($beachball->status),
        $this->_font->body,
        $this->_format->body
      );
    }

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

    if ($this->_data->tectonic) {
      $section4->writeText(
        'Tectonic Summary',
        $this->_font->h4,
        $this->_format->h4
      );
      $section4->writeText(
        $this->_data->tectonic,
        $this->_font->body,
        $this->_format->body
      );
    }
  }

  /**
   * Section 5: Ground Shaking.
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

    $smInfo = $this->_data->shakemapData;

    $section5->writeText(
      'Max MMI: ' . strip_tags($smInfo->mmi),
      $this->_font->body,
      $this->_format->body
    );
    $section5->writeText(
      'Max PGA: ' . strip_tags($smInfo->pga),
      $this->_font->body,
      $this->_format->body
    );
    $section5->writeText(
      'Max PGV: ' . strip_tags($smInfo->pgv),
      $this->_font->body,
      $this->_format->body
    );
    $section5->writeText(
      'Max SA (0.3s): ' . strip_tags($smInfo->sa03),
      $this->_font->body,
      $this->_format->body
    );
    $section5->writeText(
      'Max SA (1.0s): ' . strip_tags($smInfo->sa10),
      $this->_font->body,
      $this->_format->body
    );
    $section5->writeText(
      'Max SA (3.0s): ' . strip_tags($smInfo->sa30),
      $this->_font->body,
      $this->_format->body
    );

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

    $dyfi = $this->_data->dyfi;

    if (!empty(get_object_vars($dyfi))) {
      $section5->writeText(
        'Did You Feel It?',
        $this->_font->h4,
        $this->_format->h4
      );
      $section5->writeText(
        $dyfi->responses . ' responses as of ' . $this->_now,
        $this->_font->body,
        $this->_format->body
      );
      $section5->writeText(
        'Max MMI: ' . $dyfi->maxmmi,
        $this->_font->body,
        $this->_format->body
      );

      if (property_exists($dyfi, 'map')) {
        $section5->addImage(
          $this->_getRemoteImage($dyfi->map),
          $this->_format->image,
          12
        );
      }
      if (property_exists($dyfi, 'plot')) {
        $section5->addImage(
          $this->_getRemoteImage($dyfi->plot),
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
   * Section 6: Aftershocks.
   */
  private function _createSection6() {
    $aftershocks = $this->_data->aftershocks;
    $count = $aftershocks->count;
    $section6 = $this->_rtf->addSection();

    $section6->writeText(
      "Aftershocks ($count)",
      $this->_font->h2,
      $this->_format->h2
    );

    $section6->writeText(
      strip_tags($aftershocks->description),
      $this->_font->body,
      $this->_format->p
    );

    if ($count === 0) {
      $section6->writeText(
        'None',
        $this->_font->h3,
        $this->_format->h3
      );
    } else {
      $section6->writeText(
        '<strong>Earthquakes Updated</strong>: ' . $this->_now,
        $this->_font->body,
        $this->_format->body
      );

      $listCount = count($aftershocks->earthquakes);
      $magThreshold = $aftershocks->magThreshold;

      $this->_createTableBinnedData($section6, 'aftershocks', 'first');
      $this->_createTableBinnedData($section6, 'aftershocks', 'past');

      $section6->writeText(
        "M $magThreshold+ Earthquakes ($listCount)",
        $this->_font->h4,
        $this->_format->h4
      );
      $this->_createTableEqlist($section6, 'aftershocks');
    }

    $plots = $aftershocks->plots;

    if (!empty(get_object_vars($plots))) {
      foreach ($plots as $type => $dataUrl) {
        $section6->writeText(
          $this->_data->plotNames->{$type},
          $this->_font->h4,
          $this->_format->h4
        );
        $section6->writeText('<br>');
        $section6->addImage(
          $this->_getImage($dataUrl),
          $this->_format->image,
          18
        );
      }
    }

    $forecast = $aftershocks->forecast;

    if (!empty(get_object_vars($forecast))) {
      $section6->writeText(
        'Aftershock Forecast',
        $this->_font->h4,
        $this->_format->h4
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

      $zone = $this->_data->time->zone; // 'user' or 'utc'
      $datetime = $forecast->startTime->{$zone};
      $zoneDisplay = 'UTC';

      if ($zone === 'user') {
        $zoneDisplay = $forecast->utcOffset;
      }
      $section6->writeText(
        "<strong>Forecast starts</strong>: $datetime ($zoneDisplay)",
        $this->_font->body,
        $this->_format->p
      );

      $section6->writeText(
        '<strong>Model</strong>: ' . $forecast->model->name,
        $this->_font->body,
        $this->_format->p
      );
    }
  }

  /**
   * Section 7: Foreshocks.
   */
  private function _createSection7() {
    $foreshocks = $this->_data->foreshocks;
    $count = $foreshocks->count;
    $section7 = $this->_rtf->addSection();

    $section7->writeText(
      "Foreshocks ($count)",
      $this->_font->h2,
      $this->_format->h2
    );

    $section7->writeText(
      strip_tags($foreshocks->description),
      $this->_font->body,
      $this->_format->p
    );

    if ($count === 0) {
      $section7->writeText(
        'None',
        $this->_font->h3,
        $this->_format->h3
      );
    } else {
      $section7->writeText(
        '<strong>Earthquakes Updated</strong>: ' . $this->_now,
        $this->_font->body,
        $this->_format->body
      );

      $listCount = count($foreshocks->earthquakes);
      $magThreshold = $foreshocks->magThreshold;

      $this->_createTableBinnedData($section7, 'foreshocks', 'prior');

      $section7->writeText(
        "M $magThreshold+ Earthquakes ($listCount)",
        $this->_font->h4,
        $this->_format->h4
      );
      $this->_createTableEqlist($section7, 'foreshocks');
    }
  }

  /**
   * Section 8: Historical Seismicity.
   */
  private function _createSection8() {
    $historical = $this->_data->historical;
    $count = $historical->count;
    $section8 = $this->_rtf->addSection();

    $section8->writeText(
      "Historical Seismicity ($count)",
      $this->_font->h2,
      $this->_format->h2
    );

    $section8->writeText(
      strip_tags($historical->description),
      $this->_font->body,
      $this->_format->p
    );

    if ($count === 0) {
      $section8->writeText(
        'None',
        $this->_font->h3,
        $this->_format->h3
      );
    } else {
      $section8->writeText(
        '<strong>Earthquakes Updated</strong>: ' . $this->_now,
        $this->_font->body,
        $this->_format->body
      );

      $listCount = count($historical->earthquakes);
      $magThreshold = $historical->magThreshold;

      $this->_createTableBinnedData($section8, 'historical', 'prior');

      $section8->writeText(
        "M $magThreshold+ Earthquakes ($listCount)",
        $this->_font->h4,
        $this->_format->h4
      );
      $this->_createTableEqlist($section8, 'historical');
    }

    $plots = $historical->plots;

    if (!empty(get_object_vars($plots))) {
      foreach ($plots as $type => $dataUrl) {
        $section8->writeText(
          $this->_data->plotNames->{$type},
          $this->_font->h4,
          $this->_format->h4
        );
        $section8->writeText('<br>');
        $section8->addImage(
          $this->_getImage($dataUrl),
          $this->_format->image,
          18
        );
      }
    }

    $historicalEvents = $this->_data->historicalEvents;
    if (!empty($historicalEvents)) {
      // Get sort order based on event date/time
      $dates = array();
      foreach ($historicalEvents as $key => $event) {
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
        $event = $historicalEvents[$key];

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
          $fatalities = 'fatalities';
          if ($event->ShakingDeaths === 1) {
            $fatalities = 'fatality';
          }
          $effects = $event->ShakingDeaths . " shaking $fatalities";
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
   * Section 9: ShakeAlert.
   */
  private function _createSection9() {
    $section9 = $this->_rtf->addSection();
    $shakeAlert = $this->_data->shakeAlert;

    $section9->writeText(
      'ShakeAlert®',
      $this->_font->h2,
      $this->_format->h2
    );

    if (!empty(get_object_vars($shakeAlert))) {
      $zone = $this->_data->time->zone; // 'user' or 'utc'
      $key1 = $zone . 'Time';
      $key2 = $zone . 'UpdateTime';
      $datetime = $shakeAlert->{$key1} . $shakeAlert->decimalSecs;
      $updateTime = $shakeAlert->{$key2};
      $magAnss = "$shakeAlert->magAnss ($shakeAlert->magSeconds after origin)";
      $zoneDisplay = 'UTC';

      if ($zone === 'user') {
        $zoneDisplay = $shakeAlert->utcOffset;
      }

      $section9->writeText(
        "Message issued $datetime ($zoneDisplay)",
        $this->_font->body,
        $this->_format->body
      );
      $section9->writeText(
        "Last updated $updateTime ($zoneDisplay)",
        $this->_font->body,
        $this->_format->body
      );

      $section9->writeText(
        'Alert Latency',
        $this->_font->h4,
        $this->_format->h4
      );
      $section9->writeText(
        'Initial: ' . $shakeAlert->latencyInitial . ' after origin',
        $this->_font->body,
        $this->_format->body
      );
      $section9->writeText(
        'Final: ' . $shakeAlert->latencyFinal . ' after origin',
        $this->_font->body,
        $this->_format->body
      );
      $section9->writeText(
        'Late-alert Radius: ' . $shakeAlert->radius,
        $this->_font->body,
        $this->_format->body
      );

      $section9->writeText(
        'Magnitude Accuracy',
        $this->_font->h4,
        $this->_format->h4
      );
      $section9->writeText(
        'Initial: ' . $shakeAlert->magInitial,
        $this->_font->body,
        $this->_format->body
      );
      $section9->writeText(
        'Final: ' . $shakeAlert->magFinal,
        $this->_font->body,
        $this->_format->body
      );
      $section9->writeText(
        'ANSS Report: ' . $magAnss,
        $this->_font->body,
        $this->_format->body
      );

      $section9->writeText(
        'Location Accuracy (relative to ANSS location)',
        $this->_font->h4,
        $this->_format->h4
      );
      $section9->writeText(
        'Inital: ' . $shakeAlert->locationInitial,
        $this->_font->body,
        $this->_format->body
      );
      $section9->writeText(
        'Final: ' . $shakeAlert->locationFinal,
        $this->_font->body,
        $this->_format->body
      );

      $section9->writeText(
        'Number of Stations Reporting',
        $this->_font->h4,
        $this->_format->h4
      );
      $section9->writeText(
        $shakeAlert->numStations10 . ' within 10 km of epicenter',
        $this->_font->body,
        $this->_format->body
      );
      $section9->writeText(
        $shakeAlert->numStations100 . ' within 100 km of epicenter',
        $this->_font->body,
        $this->_format->body
      );
      $section9->writeText(
        $shakeAlert->numStations . ' used in final update',
        $this->_font->body,
        $this->_format->body
      );

      $section9->writeText(
        'Nearby Cities',
        $this->_font->h4,
        $this->_format->h4
      );
      $this->_createTableShakeAlert($section9);

      if ($shakeAlert->wea) {
        $section9->writeText(
          'Wireless Emergency Alert',
          $this->_font->h4,
          $this->_format->h4
        );
        $section9->writeText(
          $shakeAlert->wea,
          $this->_font->body,
          $this->_format->body
        );
        $section9->writeText(
          'WEA alerts are distributed to the MMI 4+ area if ShakeAlert Peak M ≥ 5.0.',
          $this->_font->body,
          $this->_format->p
        );
      }

      $section9->writeText(
        'Status: ' . ucfirst(strip_tags($shakeAlert->status)),
        $this->_font->body,
        $this->_format->body
      );
    } else {
      $section9->writeText(
        'ShakeAlert information is not available for this event.',
        $this->_font->body,
        $this->_format->p
      );
    }
  }

  /**
   * Create a binned earthquakes table for a given Feature.
   *
   * @param $section {Object}
   *     RTF Document section
   * @param $id {String}
   *     Feature id
   * @param $type {String <first|past|prior>}
   */
  private function _createTableBinnedData($section, $id, $type) {
    $data = $this->_data->{$id}->bins->{$type};

    // Convert data rows to an array and sort by key (e.g. m 1, m 2, ..., total)
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
   * Create the earthquake list table for a given Feature.
   *
   * @param $section {Object}
   *     RTF Document section
   * @param $id {String}
   *     Feature id
   */
  private function _createTableEqlist($section, $id) {
    $eqs = $this->_data->{$id}->earthquakes;
    $numRows = count($eqs) + 1; // data rows + 1 header row

    $section->writeText(
      '',
      $this->_font->body,
      $this->_format->table // sets formatting in table that follows
    );

    $table = $section->addTable();
    $table->addRows($numRows);
    $table->addColumnsList(array(1.9, 4.4, 2, 3.3, 2.4, 2.9));
    $table->setBackgroundForCellRange('#666666', 1, 1, 1, 6);
    $table->setBordersForCellRange(
      $this->_format->borderDarker,
      $numRows, 1, $numRows, 6,
      false, false, false, true
    );
    $table->setFontForCellRange($this->_font->thBg, 1, 1, 1, 6);
    $table->setFontForCellRange($this->_font->td, 2, 1, $numRows, 6);
    $table->setTextAlignmentForCellRange('center', 1, 1, 1, 6);
    $table->setTextAlignmentForCellRange('right', 2, 1, $numRows, 1);
    $table->setTextAlignmentForCellRange('right', 2, 3, $numRows, 3);
    $table->setTextAlignmentForCellRange('center', 2, 4, $numRows, 4);

    // Header row
    $col = 0;
    $row = 1;

    foreach ($this->_fields as $key => $value) {
      $col ++;
      $cell = $table->getCell($row, $col);
      $cell->writeText($value);
    }

    // Data rows
    foreach ($eqs as $eq) {
      $col = 0;
      $row ++;

      foreach ($this->_fields as $key => $value) {
        $col ++;
        $cell = $table->getCell($row, $col);

        $cell->setCellPaddings(0, 0.1, 0, 0.1);
        if ($col === 1 || $col === 3) { // text aligned right; add padding
          $cell->setPaddingRight(.2);
        }

        $fieldValue = strip_tags($eq->{$key});
        if ($key === 'userTimeDisplay' || $key === 'utcTimeDisplay') { // strip off timezone
          $fieldValue = preg_replace('/\s+\([\w\-:]+\)/', '', $fieldValue);
        } else if ($key === 'magDisplay') { // add mag type
          $fieldValue = $eq->magType . ' ' . $fieldValue;
        }
        $cell->writeText($fieldValue);
      }
    }
  }

  /**
   * Create the population exposure table.
   *
   * @param $section {Object}
   *     RTF Document section
   */
  private function _createTableExposure($section) {
    $cities = array_filter( // keep values where mmi >=2
      $this->_data->pagerCities,
      function($value) {
        if (intVal(round($value->mmi)) >= 2) {
          return $value;
        }
      }
    );
    $mmis = array_filter( // keep values where mmi >=2
      $this->_data->pagerExposures->mmi,
      function($value) {
        if ($value >= 2) {
          return $value;
        }
      }
    );
    $population = array_filter( // keep values where population > 0 and mmi >=2
      $this->_data->pagerExposures->population,
      function($value, $key) {
        if ($value > 0 && $this->_data->pagerExposures->mmi[$key] >= 2) {
          return $value;
        }
      },
      ARRAY_FILTER_USE_BOTH
    );
    $shaking = $this->_data->pagerExposures->shaking;
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
      $table->setBackgroundForCellRange('#666666', 1, 1, 1, 3);
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
      foreach (['MMI', 'Shaking / Selected Cities', 'Population'] as $key => $th) {
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
            $population[$i]
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
                $city->pop
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
   * Create the Aftershocks forecast table.
   *
   * @param $section {Object}
   *     RTF Document section
   * @param $type {String <number|probability>}
   */
  private function _createTableForecast($section, $type) {
    $forecasts = $this->_data->aftershocks->forecast->forecasts;
    $numCols = count($forecasts) + 1; // data cols + 1 header col
    $numRows = count($forecasts[0]->bins) + 1; // data rows + 1 header row

    $columns = array(2, 2, 2, 2, 2);
    if ($type === 'number') {
      $columns = array(2.5, 2.5, 2.5, 2.5, 2.5);
    }

    $section->writeText(
      '',
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
    $table->setTextAlignmentForCellRange('center', 1, 2, 1, $numCols);
    $table->setTextAlignmentForCellRange('center', 2, 1, $numRows, 1);
    $table->setTextAlignmentForCellRange('right', 2, 2, $numRows, $numCols);

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
   * Create the ShakeAlert cities table.
   *
   * @param $section {Object}
   *     RTF Document section
   */
  function _createTableShakeAlert($section) {
    $cities = $this->_data->shakeAlert->cities;
    $numRows = count($cities) + 1; // data rows + 1 header row

    $section->writeText(
      '',
      $this->_font->body,
      $this->_format->table // sets paragraph formatting in table that follows
    );

    $table = $section->addTable();
    $table->addRows($numRows);
    $table->addColumnsList(array(4, 4, 3.5, 3.5));
    $table->setBackgroundForCellRange('#666666', 1, 1, 1, 4);
    $table->setBordersForCellRange(
      $this->_format->borderDarker,
      $numRows, 1, $numRows, 4,
      false, false, false, true
    );
    $table->setFontForCellRange($this->_font->thBg, 1, 1, 1, 4);
    $table->setFontForCellRange($this->_font->td, 2, 1, $numRows, 4);
    $table->setTextAlignmentForCellRange('center', 1, 1, 1, 4);
    $table->setTextAlignmentForCellRange('left', 2, 1, $numRows, 4);

    // Header row
    $row = 1;
    foreach (['City', 'Distance', 'Warning Time', 'Predicted MMI'] as $i => $th) {
      $col = $i + 1;
      $cell = $table->getCell($row, $col);
      $cell->writeText($th);
    }

    // Data rows
    foreach ($cities as $city) {
      $props = $city->properties;
      $row ++;

      $cell = $table->getCell($row, 1);
      $cell->setCellPaddings(0, 0.025, 0, 0.125);
      $cell->writeText($props->name);

      $cell = $table->getCell($row, 2);
      $cell->setCellPaddings(0, 0.025, 0, 0.125);
      $cell->writeText($props->citydist);

      $cell = $table->getCell($row, 3);
      $cell->setCellPaddings(0, 0.025, 0, 0.125);
      $cell->writeText($props->warning_time);

      $cell = $table->getCell($row, 4);
      $cell->setCellPaddings(0, 0.025, 0, 0.125);
      $cell->writeText($props->mmi);
    }
  }

  /**
   * Set the page margins (unit is centimeters).
   */
  private function _setMargins() {
    $this->_rtf->setMarginBottom(2);
    $this->_rtf->setMarginLeft(2);
    $this->_rtf->setMarginRight(2);
    $this->_rtf->setMarginTop(2);
  }

  /**
   * Set the styles for text, images, etc.
   */
  private function _setStyles() {
    $this->_font->body = new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#FFFFFF');

    $this->_font->h1 = new PHPRtfLite_Font(20, 'Calibri', '#000000', '#FFFFFF');
    $this->_font->h1->setBold();

    $this->_font->h2 = new PHPRtfLite_Font(18, 'Calibri', '#313131', '#FFFFFF');
    $this->_font->h2->setBold();

    $this->_font->h3 = new PHPRtfLite_Font(16, 'Calibri', '#474747', '#FFFFFF');
    $this->_font->h3->setBold();

    $this->_font->h4 = new PHPRtfLite_Font(14, 'Calibri', '#5281c9', '#FFFFFF');
    $this->_font->h4->setBold();

    $this->_font->link = new PHPRtfLite_Font(12, 'Helvetica', '#0000CC', '#FFFFFF');
    $this->_font->link->setUnderline();

    $this->_font->pagerAlert = [
      'green' => new PHPRtfLite_Font(12, 'Helvetica', '#FFFFFF', '#00b04f'),
      'orange' => new PHPRtfLite_Font(12, 'Helvetica', '#FFFFFF', '#FF9900'),
      'red' => new PHPRtfLite_Font(12, 'Helvetica', '#FFFFFF', '#FF0000'),
      'yellow' => new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#FFFF00')
    ];

    $this->_font->td = new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#FFFFFF');
    $this->_font->tdBg = new PHPRtfLite_Font(12, 'Helvetica', '#000000', '#F7F7F7');
    $this->_font->tdLighter = new PHPRtfLite_Font(12, 'Helvetica', '#666666', '#FFFFFF');

    $this->_font->th = new PHPRtfLite_Font(12, 'Helvetica', '#444444', '#FFFFFF');
    $this->_font->th->setBold();
    $this->_font->thBg = new PHPRtfLite_Font(12, 'Helvetica', '#FFFFFF', '#666666');

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

    $this->_format->h2 = new PHPRtfLite_ParFormat('center');
    $this->_format->h2->setSpaceAfter(6);
    $this->_format->h2->setSpaceBefore(6);

    $this->_format->h3 = new PHPRtfLite_ParFormat('left');
    $this->_format->h3->setSpaceAfter(0);
    $this->_format->h3->setSpaceBefore(16);

    $this->_format->h4 = new PHPRtfLite_ParFormat('left');
    $this->_format->h4->setSpaceAfter(0);
    $this->_format->h4->setSpaceBefore(16);

    $this->_format->image = new PHPRtfLite_ParFormat('center');

    $this->_format->p = new PHPRtfLite_ParFormat('left'); // same as body but w/ bottom margin
    $this->_format->p->setSpaceAfter(12);
    $this->_format->p->setSpaceBefore(0);
    $this->_format->p->setSpaceBetweenLines(1.5);

    $this->_format->table = new PHPRtfLite_ParFormat('left');
    $this->_format->table->setSpaceAfter(0);
  }
}
