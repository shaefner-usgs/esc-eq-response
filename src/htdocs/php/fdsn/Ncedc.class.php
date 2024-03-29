<?php

/**
 * Search the NCEDC double-difference catalog and convert the results from CSV
 * to GeoJSON, conforming to ComCat's syntax.
 *
 * See: https://service.ncedc.org/fdsnws/event/1/
 *
 * @param $params {Array}
 *     ComCat API query parameters (https://earthquake.usgs.gov/fdsnws/event/1/)
 * @param $uri {String}
 *     PHP's $_SERVER['REQUEST_URI'] for the search query
 *
 * @return {Object}
 *     {
 *       json: {String} GeoJSON Feed
 *       search: {Function}
 *     }
 *
 * ¹ the minmag param appears to ignore hundredths values, leading to unexpected
 *   results. For ex, a minmag value of 0.95 still selects M 0.9 eqs.
 */
class Ncedc {
  private $_params,
          $_url;

  public $json;

  public function __construct ($params, $uri) {
    $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http");

    $this->_params = $params;
    $this->_url = "$protocol://" . $_SERVER['HTTP_HOST'] . $uri;
  }

  /**
   * Add the query parameters for a bounding box that includes the circle
   * defined by the 'maxradiuskm' ComCat param.
   *
   * Note: NCEDC does not support radius values specified in km for limiting
   * search results. Extraneous results outside the circle must be filtered out
   * later if desired.
   *
   * @param $params {Array}
   *     Note: passed by reference
   */
  private function _addBoundingBox(&$params) {
    if (array_key_exists('maxradiuskm', $this->_params)) {
      $diameter = 6378.1 * 2; // Earth (km, approx)
      $radians = 2 * M_PI * $this->_params['latitude'] / 360;

      $latDistance = M_PI * $diameter / 360; // distance (km) of 1 degree
      $latDegrees = $this->_params['maxradiuskm'] / $latDistance;
      $lonDistance = M_PI * $diameter / 360 * cos($radians); // 1 degree at given lat
      $lonDegrees = $this->_params['maxradiuskm'] / $lonDistance;

      $params['maxlat'] = $this->_params['latitude'] + $latDegrees;
      $params['maxlon'] = $this->_params['longitude'] + $lonDegrees;
      $params['minlat'] = $this->_params['latitude'] - $latDegrees;
      $params['minlon'] = $this->_params['longitude'] - $lonDegrees;
    }
  }

  /**
   * Create the GeoJSON feed and store it.
   *
   * @param $eqs {Array}
   *     Earthquake list
   */
  private function _createJson($eqs) {
    $template = $this->_getTemplate(count($eqs));

    foreach ($eqs as $eq) {
      $data = $this->_getData($eq);
      $feature = [
        'type' => 'Feature',
        'geometry' => [
          'coordinates' => [
            $data['lon'],
            $data['lat'],
            $data['depth']
          ],
          'type' => 'Point'
        ],
        'id' => $data['id'],
        'properties' => [
          'mag' => $data['mag'],
          'magType' => $data['magType'],
          'time' => $data['time'],
          'type' => $data['type']
        ]
      ];

      if (isset($this->_params['eventid'])) { // Mainshock
        $template = array_merge($template, $feature);
      } else { // Aftershocks, Foreshocks or Historical
        $title = sprintf('M %.1f - %s',
          round($data['mag'], 1),
          $data['place']
        );

        $feature['properties']['place'] = $data['place'];
        $feature['properties']['title'] = $title;

        array_push($template['features'], $feature);
      }
    }

    $this->json = json_encode($template, JSON_UNESCAPED_SLASHES);
  }

  /**
   * Get the formatted data for a given earthquake.
   *
   * @param $eq {Array}
   *
   * @return {Array}
   */
  private function _getData($eq) {
    $secs = strtotime($eq[1]);
    $millisecs = $secs . substr($eq[1], -4, 3);

    return [
      'depth' => floatval($eq[4]),
      'id' => strtolower($eq[5]) . $eq[0],
      'lat' => floatval($eq[2]),
      'lon' => floatval($eq[3]),
      'mag' => floatval($eq[10]),
      'magType' => $eq[9],
      'place' => $eq[12],
      'time' => intval($millisecs),
      'type' => $eq[13]
    ];
  }

  /**
   * Get the query parameters for a catalog search, converting from ComCat to
   * NCEDC syntax.
   *
   * @return $params {Array}
   */
  private function _getParams() {
    $keep = [
      'eventid',
      'format',
      'orderby'
    ];
    $params = [];
    $rename = [
      'endtime' => 'end',
      'minmagnitude' => 'minmag',
      'starttime' => 'start'
    ];

    foreach($this->_params as $name => $value) {
      if (array_key_exists($name, $rename)) {
        $name = $rename[$name]; // rename param
      } else if (!in_array($name, $keep)) {
        continue; // discard param
      }

      if ($name === 'minmag') {
        $value += .05; // 'undo' rounding down for ComCat (also preempts a bug¹)
      }

      $params[$name] = $value;
    }

    // Add additional req'd params
    $params['catalog'] = 'DD';
    $this->_addBoundingBox($params);

    return $params;
  }

  /**
   * Get the feed's template, which varies depending on type (i.e. just the
   * Mainshock or a collection of eqs).
   *
   * @param $count {Integer}
   *
   * @return $template {Array}
   */
  private function _getTemplate($count) {
    $template = [
      'metadata' => [
        'count' => $count,
        'generated' => floor(microtime(true) * 1000),
        'sourceUrl' => $this->_getUrl(),
        'url' => $this->_url
      ]
    ];

    if (!isset($this->_params['eventid'])) { // everything but Mainshock
      $template = array_merge($template, [
        'type' => 'FeatureCollection',
        'features' => []
      ]);
    }

    return $template;
  }

  /**
   * Get the 'source' URL for the double-difference catalog search.
   *
   * @return {String}
   */
  private function _getUrl() {
    $queryString = http_build_query($this->_getParams());

    return 'https://service.ncedc.org/fdsnws/event/1/query?' . $queryString;
  }

  /**
   * Search the catalog.
   */
  public function search() {
    $eqs = [];
    $row = 0;
    $url = $this->_getUrl();
    $stream = fopen($url, 'r');

    // Throw exception if response code is not 2xx
    if (!preg_match('/2\d{2}/', $http_response_header[0])) {
      throw new Exception('Request failed');
    }

    if ($stream) {
      while ($eq = fgetcsv($stream, 500, '|')) {
        $row ++;

        if ($row === 1) continue; // skip header row

        array_push($eqs, $eq);
      }

      $this->_createJson($eqs);
    }
  }
}
