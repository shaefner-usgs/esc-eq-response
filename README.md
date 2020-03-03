esc-response-app
================

Earthquake Response app to assist with writing talking points.

## Installation

First install [node.js](https://nodejs.org/) and [grunt](http://gruntjs.com).

**Note**: You will need PHP and PHPRtfLite in order to generate an earthquake summary RTF file.

1. Clone project

```
git clone https://github.com/shaefner-usgs/esc-eq-response.git
```

2. Install dependencies

```
cd esc-eq-response
npm install

# If you need to add a CA certificate file:
npm config set cafile "<path to your certificate file>"

# Check the 'cafile'
npm config get cafile

```

3. Download PHPRtfLite and setup.

```
cd src-eq-response
unzip PHPRtfLite-X.X.X.zip
cd src/htdocs/php && ln -s ../../../PHPRtfLite-X.X.X/lib .
```

4. Configure app

```
cd esc-eq-response/src/lib

# Run configuration script and accept defaults
./pre-install
```

5. Run grunt

```
cd esc-eq-response

# If not using PHP server
grunt

# If using PHP server
grunt build
php -S localhost:9110
```
