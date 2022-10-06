Earthquake Response App
=======================

[Web application](https://bayquakealliance.org/response/) that creates an interactive Map, Plots, and Summary for any earthquake using real-time/historic data. It helps you visualize, analyze and collect information to use in talking points and scientific response.

## Installation

First install [Node.js](https://nodejs.org/), [Grunt](https://gruntjs.com) and [Composer](https://getcomposer.org/).

**Note**: You will need PHP with CGI installed in order to generate an earthquake summary RTF file.

1. Clone the repository

```
git clone https://github.com/shaefner-usgs/esc-eq-response.git
```

2. Install dependencies

```
cd esc-eq-response
npm install
composer install (or php composer.phar install)

# If you need to add a CA certificate file:
npm config set cafile "<path to your certificate file>"

# Check the 'cafile'
npm config get cafile
```

3. Configure the app

```
cd esc-eq-response/src/lib

# Run the configuration script and accept the defaults
./pre-install
```

4. Run grunt

```
cd esc-eq-response
grunt
```
