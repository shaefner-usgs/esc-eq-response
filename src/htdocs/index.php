<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title></title>
    <link rel="stylesheet" href="/lib/leaflet-0.7.7/leaflet.css" />
    <link rel="stylesheet" href="css/index.css" />
  </head>
  <body>
    <ul class="modes">
      <li><a href="#edit">Edit</a></li>
      <li><a href="#map">Map</a></li>
      <li><a href="#summary">Summary</a></li>
    </ul>
    <section id="edit">
      <h2>Edit</h2>
      <form>
        <label for="eqid">
          <p>Earthquake id</p>
          <input type="text" id="eqid" />
        </label>
        <h3>Aftershocks</h3>
        <label for="ashockDistance">
          <p>Max distance from mainshock (km)</p>
          <input type="text" id="ashockDistance" value="" />
        </label>
        <h3>Historical Seismicity</h3>
        <label for="histDistance">
          <p>Max distance from mainshock (km)</p>
          <input type="text" id="histDistance" value="" />
        </label>
        <label for="histYears">
          <p>Max time before mainshock (years)</p>
          <input type="text" id="histYears" value="10">
        </label>
      </form>
    </section>
    <section id="map">
      <h2>Map</h2>
      <div class="map"></div>
    </section>
    <section id="summary">
      <h2>Summary</h2>
    </section>
  </body>
  <script src="/lib/leaflet-0.7.7/leaflet.js"></script>
  <script src="js/index.js"></script>
</html>
