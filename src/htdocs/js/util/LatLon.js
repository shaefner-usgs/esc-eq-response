'use strict';


/**
 * Creates a LatLon point on the Earth's surface at the specified lat/lng.
 *
 * Taken from: https://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param lat {Number}
 *     Latitude in degrees.
 * @param lon {Number}
 *     Longitude in degrees.
 *
 * @example
 *     var p1 = new LatLon(52.205, 0.119);
 */
function LatLon(lat, lon) {
  // allow instantiation without 'new'
  if (!(this instanceof LatLon)) {
    return new LatLon(lat, lon);
  }

  this.lat = Number(lat);
  this.lon = Number(lon);
}

/**
 * Returns the distance from ‘this’ point to destination point (using haversine
 * formula).
 *
 * @param point {LatLon}
 *     Latitude/longitude of destination point.
 * @param radius {Number}
 *     (Mean) radius of earth (defaults to radius in meters).
 *
 * @return {Number}
 *     Distance between this point and destination point (same units as radius).
 *
 * @example
 *     var p1 = new LatLon(52.205, 0.119);
 *     var p2 = new LatLon(48.857, 2.351);
 *     var d = p1.distanceTo(p2); // 404.3 km
 */
LatLon.prototype.distanceTo = function(point, radius) {
  if (!(point instanceof LatLon)) {
    throw new TypeError('point is not LatLon object');
  }
  radius = (radius === undefined) ? 6371e3 : Number(radius);

  var R = radius;
  var φ1 = this.lat.toRadians(),  λ1 = this.lon.toRadians();
  var φ2 = point.lat.toRadians(), λ2 = point.lon.toRadians();
  var Δφ = φ2 - φ1;
  var Δλ = λ2 - λ1;

  var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ/2) * Math.sin(Δλ/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;

  return d;
};

/**
 * Forward azimuth (takeoff bearing) from point to destination.
 *
 * @param point {LatLon}
 *     Latitude/longitude of destination point.
 *
 * @return {Number}
 *     Forward azimuth (degrees) from point to destination (-180.0, 180.0).
 *
 * @example
 *     var p1 = new LatLon(52.205, 0.119);
 *     var p2 = new LatLon(48.857, 2.351);
 *     var b = p1.bearing(p2); // 156.167 degrees
 */
LatLon.prototype.bearing = function(point) {
  if (!(point instanceof LatLon)) {
    throw new TypeError('point is not LatLon object');
  }

  var φ1 = this.lat.toRadians(),  λ1 = this.lon.toRadians();
  var φ2 = point.lat.toRadians(), λ2 = point.lon.toRadians();

  var y = Math.sin(λ2-λ1) * Math.cos(φ2);
  var x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
  var bearing = Math.atan2(y, x).toDegrees();

  return bearing;
};

/* Extend Number object with method to convert numeric degrees to radians */
if (Number.prototype.toRadians === undefined) {
  Number.prototype.toRadians = function() { return this * Math.PI / 180; };
}

/* Extend Number object with method to convert radians to numeric (signed) degrees */
if (Number.prototype.toDegrees === undefined) {
  Number.prototype.toDegrees = function() { return this * 180 / Math.PI; };
}


module.exports = LatLon;
