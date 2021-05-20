Earthquake Response App
=======================

Web application that creates an interactive map, plots and summary for an earthquake to help collect and digest information used in talking points and scientific response.

## Installation

First install [node.js](https://nodejs.org/), [grunt](http://gruntjs.com) and [Composer](https://getcomposer.org/).

**Note**: You will need PHP with CGI installed in order to generate an earthquake summary RTF file.

1. Clone project

```
git clone https://github.com/shaefner-usgs/esc-eq-response.git
```

2. Install dependencies

```
cd esc-eq-response
npm install
php composer.phar install

# If you need to add a CA certificate file:
npm config set cafile "<path to your certificate file>"

# Check the 'cafile'
npm config get cafile
```

3. Configure app

```
cd esc-eq-response/src/lib

# Run configuration script and accept defaults
./pre-install
```

4. Run grunt

```
cd esc-eq-response
grunt
```
