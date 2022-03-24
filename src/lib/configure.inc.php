<?php

// This configuration script should only be called from pre-install.php. The
// calling script is responsible for defining $CONFIG_FILE_INI and calling
// date_default_timezone_set prior to calling (i.e. including) this script.

$PROMPTS = [
  // 'key' => [
  //   'prompt' => String,  // Prompt to request value from user
  //   'default' => String, // Value to use if input is empty
  //   'secure' => Boolean  // True if input should not be echo'd to console
  // ]
  'MOUNT_PATH' => [
    'prompt' => 'URL Path for application',
    'default' => '/response',
    'secure' => false
  ],
  'APP_DIR' => [
    'prompt' => 'Absolute path to application root directory',
    'default' => $APP_DIR,
    'secure' => false
  ]
];


writeConfig($CONFIG_FILE_INI, $PROMPTS);


/**
 * Prompt the user to get the configuration value for the given option.
 *
 * @param $prompt {String}
 * @param $default {String} default NULL
 * @param $secure {Boolean} default false
 *
 * @return $answer {String}
 */
function configure ($prompt, $default=NULL, $secure=false) {
  print $prompt;
  if ($default !== NULL) {
    print " [$default]";
  }
  print ': ';

  if (NON_INTERACTIVE) {
    print '(Non-interactive, using default)' . PHP_EOL;

    return $default;
  }

  if ($secure) {
    system('stty -echo');
    $answer = trim(fgets(STDIN));
    system('stty echo');
    print "\n";
  } else {
    $answer = trim(fgets(STDIN));
  }

  if ($answer === '') {
    $answer = $default;
  }

  return $answer;
}

/**
 * Get the previous config options or an empty Array (default). Optionally
 * backup the previous config options.
 *
 * @param $CONFIG_FILE_INI {String}
 *
 * @return $config {Array}
 */
function getConfig ($CONFIG_FILE_INI) {
  $config = [];

  if (file_exists($CONFIG_FILE_INI)) {
    $prevConfig = parse_ini_file($CONFIG_FILE_INI);

    print "A previous configuration exists:\n\n";
    print_r($prevConfig);

    $answer = configure(
      "\nWould you like to use it as defaults?",
      'Y|n',
      false
    );

    if (isYes($answer)) {
      $config = $prevConfig;
    }

    $answer = configure(
      'Would you like to save the old configuration file?',
      'Y|n',
      false
    );

    if (isYes($answer)) {
      $backup = $CONFIG_FILE_INI . '.' . date('YmdHis');

      rename($CONFIG_FILE_INI, $backup);

      printf("Old configuration saved to file: %s\n", basename($backup));
    }
  }

  return $config;
}

/**
 * Determine if the user answered 'yes' or not.
 *
 * @param $answer {String}
 *
 * @return {Boolean}
 */
function isYes ($answer) {
  return strtoupper(substr($answer, 0, 1)) === 'Y';
}

/**
 * Write the config file.
 *
 * @param $CONFIG_FILE_INI {String}
 * @param $PROMPTS {Array}
 */
function writeConfig ($CONFIG_FILE_INI, $PROMPTS) {
  $CONFIG = getConfig($CONFIG_FILE_INI);
  $FP_CONFIG = fopen($CONFIG_FILE_INI, 'w');

  fwrite($FP_CONFIG, sprintf(";; auto generated: %s\n\n", date('r')));

  foreach ($PROMPTS as $key => $item) {
    $default = NULL;

    if (isset($CONFIG[$key])) {
      $default = $CONFIG[$key]; // prev config option's value
    } else if (isset($item['default'])) {
      $default = $item['default'];
    }

    $value = configure(
      $item['prompt'],
      $default,
      isset($item['secure']) ? $item['secure'] : false
    );

    fwrite($FP_CONFIG, sprintf("%s = \"%s\"\n", $key, $value));
  }

  fclose($FP_CONFIG);
}
