<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title></title>
    <link rel="stylesheet" href="/lib/leaflet-1.0.0/leaflet.css" />
    <link rel="stylesheet" href="css/index.css" />
  </head>
  <body>
    <ul class="modes">
      <li><a href="#edit">Edit</a></li>
      <li><a href="#map">Map</a></li>
      <li><a href="#summary">Summary</a></li>
    </ul>
    <section id="edit" class="hide">
      <h2>Edit</h2>
      <form>
        <label for="eqid">
          Earthquake id:
          <input type="text" id="eqid" />
        <label>
        <label for="mag">
          Magnitude threshold:
          <input type="text" id="mag" value="2.5" />
        <label>
      </form>
    </section>
    <section id="map" class="hide">
      <h2>Map</h2>
      <div class="map"></div>
    </section>
    <section id="summary" class="hide">
      <h2>Summary</h2>
    </section>
  </body>
  <script src="/lib/leaflet-1.0.0/leaflet.js"></script>
  <script src="js/index.js"></script>
</html>
