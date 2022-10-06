'use strict';

var Vector = require('./Vector');


// static methods that operate on arrays
var __col,
    __diagonal,
    __get,
    __identity,
    __index,
    __jacobi,
    __multiply,
    __row,
    __set,
    __stringify,
    __transpose;


/**
 * Extract a column from this matrix.
 *
 * @param data {Array<Number>}
 *        matrix data.
 * @param m {Number}
 *        number of rows.
 * @param n {Number}
 *        number of columns.
 * @param col {Number}
 *        index of column, in range [0,n)
 * @throws Error if column out of range.
 * @return {Array<Number>} column elements.
 */
__col = function (data, m, n, col) {
  var row,
      values = [];
  if (col < 0 || col >= n) {
    throw new Error('column ' + col + ' out of range [0,' + n + ')');
  }
  if (n === 1) {
    // only one column in matrix
    return data;
  }
  values = [];
  for (row = 0; row < m; row++) {
    values.push(data[__index(m, n, row, col)]);
  }
  return values;
};

/**
 * Get array of elements on the diagonal.
 *
 * @param data {Array<Number>}
 *        matrix data.
 * @param m {Number}
 *        number of rows.
 * @param n {Number}
 *        number of columns.
 * @return {Array<Number>} elements on the diagonal.
 */
__diagonal = function (data, m, n) {
  var len = Math.min(m, n),
      diag = [],
      i;
  for (i = 0; i < len; i++) {
    diag.push(data[__index(m, n, i, i)]);
  }
  return diag;
};

/**
 * Get the value of an element of this matrix.
 *
 * @param data {Array<Number>}
 *        matrix data.
 * @param m {Number}
 *        number of rows.
 * @param n {Number}
 *        number of columns.
 * @param row {Number}
 *        row of element, in range [0,m)
 * @param col {Number}
 *        column of element, in range [0,n)
 * @throws Error if row or col are out of range.
 * @return {Number} value.
 */
__get = function (data, m, n, row, col) {
  return data[__index(m, n, row, col)];
};

/**
 * Create an identity Matrix.
 *
 * @param n {Number}
 *        number of rows and columns.
 * @return identity matrix of size n.
 */
__identity = function (n) {
  var values = [],
      row,
      col;
  for (row = 0; row < n; row++) {
    for (col = 0; col < n; col++) {
      values.push((row === col) ? 1 : 0);
    }
  }
  return values;
};

/**
 * Get the index of an element of this matrix.
 *
 * @param data {Array<Number>}
 *        matrix data.
 * @param m {Number}
 *        number of rows.
 * @param n {Number}
 *        number of columns.
 * @param row {Number}
 *        row of element, in range [0,m)
 * @param col {Number}
 *        column of element, in range [0,n)
 * @return {Number} index.
 */
__index = function (m, n, row, col) {
  return n * row + col;
};

/**
 * Jacobi eigenvalue algorithm.
 *
 * Ported from:
 *     http://users-phys.au.dk/fedorov/nucltheo/Numeric/now/eigen.pdf
 *
 * An iterative method for eigenvalues and eigenvectors,
 * only works on symmetric matrices.
 *
 * @param data {Array<Number>}
 *        matrix data.
 * @param m {Number}
 *        number of rows.
 * @param n {Number}
 *        number of columns.
 * @param maxRotations {Number}
 *        maximum number of rotations.
 *        Optional, default 100.
 * @return {Array<Vector>} array of eigenvectors, magnitude is eigenvalue.
 */
__jacobi = function (data, m, n, maxRotations) {
  var a,
      aip,
      aiq,
      api,
      app,
      app1,
      apq,
      aqi,
      aqq,
      aqq1,
      c,
      changed,
      e,
      i,
      ip,
      iq,
      p,
      phi,
      pi,
      q,
      qi,
      rotations,
      s,
      v,
      vector,
      vectors,
      vip,
      viq;

  if (m !== n) {
    throw new Error('Jacobi only works on symmetric, square matrices');
  }

  // set a default max
  maxRotations = maxRotations || 100;
  a = data.slice(0);
  e = __diagonal(data, m, n);
  v = __identity(n);
  rotations = 0;

  do {
    changed = false;

    for (p=0; p<n; p++) {
      for (q=p+1; q<n; q++) {
        app = e[p];
        aqq = e[q];
        apq = a[n * p + q];
        phi = 0.5 * Math.atan2(2 * apq, aqq - app);
        c = Math.cos(phi);
        s = Math.sin(phi);
        app1 = c * c * app - 2 * s * c * apq + s * s * aqq;
        aqq1 = s * s * app + 2 * s * c * apq + c * c * aqq;

        if (app1 !== app || aqq1 !== aqq) {
          changed = true;
          rotations++;

          e[p] = app1;
          e[q] = aqq1;
          a[n * p + q] = 0;

          for (i = 0; i < p; i++) {
            ip = n * i + p;
            iq = n * i + q;
            aip = a[ip];
            aiq = a[iq];
            a[ip] = c * aip - s * aiq;
            a[iq] = c * aiq + s * aip;
          }
          for (i = p + 1; i < q; i++) {
            pi = n * p + i;
            iq = n * i + q;
            api = a[pi];
            aiq = a[iq];
            a[pi] = c * api - s * aiq;
            a[iq] = c * aiq + s * api;
          }
          for (i = q + 1; i < n; i++) {
            pi = n * p + i;
            qi = n * q + i;
            api = a[pi];
            aqi = a[qi];
            a[pi] = c * api - s * aqi;
            a[qi] = c * aqi + s * api;
          }
          for (i = 0; i < n; i++) {
            ip = n * i + p;
            iq = n * i + q;
            vip = v[ip];
            viq = v[iq];
            v[ip] = c * vip - s * viq;
            v[iq] = c * viq + s * vip;
          }
        }
      }
    }
  } while (changed && (rotations < maxRotations));

  if (changed) {
    throw new Error('failed to converge');
  }

  vectors = [];
  for (i = 0; i < n; i++) {
    // i-th vector is i-th column
    vector = Vector(__col(v, m, n, i));
    vector.eigenvalue = e[i];
    vectors.push(vector);
  }

  return vectors;
};

/**
 * Multiply this matrix by another matrix.
 *
 * @param data1 {Array<Number>}
 *        first matrix data.
 * @param m1 {Number}
 *        number of rows in first matrix.
 * @param n1 {Number}
 *        number of columns in first matrix.
 * @param data2 {Array<Number>}
 *        second matrix data.
 * @param m2 {Number}
 *        number of rows in second matrix.
 * @param n2 {Number}
 *        number of columns in second matrix.
 * @throws Error if n1 !== m2
 * @return result of multiplication (original matrix is unchanged).
 */
__multiply = function (data1, m1, n1, data2, m2, n2) {
  var col,
      col2,
      row,
      row1,
      values;

  if (n1 !== m2) {
    throw new Error('wrong combination of rows and cols');
  }
  values = [];
  for (row = 0; row < m1; row++) {
    row1 = __row(data1, m1, n1, row);
    for (col = 0; col < n2; col++) {
      col2 = __col(data2, m2, n2, col);
      // result is dot product
      values.push(Vector.dot(row1, col2));
    }
  }
  return values;
};

/**
 * Extract a row from this matrix.
 *
 * @param data {Array<Number>}
 *        matrix data.
 * @param m {Number}
 *        number of rows.
 * @param n {Number}
 *        number of columns.
 * @param row {Number}
 *        index of row, in range [0,m)
 * @throws Error if row out of range.
 * @return {Array<Number>} row elements.
 */
__row = function (data, m, n, row) {
  var col,
      values;
  if (row < 0 || row >= m) {
    throw new Error('row ' + row + ' out of range [0,' + m + ')');
  }
  values = [];
  for (col = 0; col < n; col++) {
    values.push(data[__index(m, n, row, col)]);
  }
  return values;
};

/**
 * Set the value of an element of this matrix.
 *
 * NOTE: this method modifies the contents of this matrix.
 *
 * @param data {Array<Number>}
 *        matrix data.
 * @param m {Number}
 *        number of rows.
 * @param n {Number}
 *        number of columns.
 * @param row {Number}
 *        row of element, in range [0,m)
 * @param col {Number}
 *        column of element, in range [0,n)
 * @param value {Number}
 *        value to set.
 * @throws Error if row or col are out of range.
 */
__set = function (data, m, n, row, col, value) {
  data[__index(m, n, row, col)] = value;
};

/**
 * Display matrix as a string.
 *
 * @param data {Array<Number>}
 *        matrix data.
 * @param m {Number}
 *        number of rows.
 * @param n {Number}
 *        number of columns.
 * @return {String} formatted matrix.
 */
__stringify = function (data, m, n) {
  var lastRow = m - 1,
      lastCol = n - 1,
      buf = [],
      row,
      col;

  buf.push('[');
  for (row = 0; row < m; row++) {
    for (col = 0; col < n; col++) {
      buf.push(
        data[n * row + col],
        (col !== lastCol || row !== lastRow) ? ', ' : '');
    }
    if (row !== lastRow) {
      buf.push('\n ');
    }
  }
  buf.push(']');
  return buf.join('');
};

/**
 * Transpose this matrix.
 *
 * @param data {Array<Number>}
 *        matrix data.
 * @param m {Number}
 *        number of rows.
 * @param n {Number}
 *        number of columns.
 * @return transposed matrix (original matrix is unchanged).
 */
__transpose = function (data, m, n) {
  var values = [],
      row,
      col;
  for (col = 0; col < n; col++) {
    for (row = 0; row < m; row++) {
      values.push(data[__index(m, n, row, col)]);
    }
  }
  return values;
};


/**
 * Construct a new Matrix object.
 *
 * If m and n are omitted, Matrix is assumed to be square and
 * data length is used to compute size.
 *
 * If m or n are omitted, data length is used to compute omitted value.
 *
 * @param data {Array}
 *        matrix data.
 * @param m {Number}
 *        number of rows.
 * @param n {Number}
 *        number of columns.
 */
var Matrix = function (data, m, n) {
  var _this,
      _initialize,
      // variables
      _data,
      _m,
      _n;


  _this = {};

  _initialize = function (data, m, n) {
    _data = data;
    _m = m;
    _n = n;

    if (m && n) {
      // done
      return;
    }

    // try to compute size based on data
    if (!m && !n) {
      var side = Math.sqrt(data.length);
      if (side !== parseInt(side, 10)) {
        throw new Error('matrix m,n unspecified, and matrix not square');
      }
      _m = side;
      _n = side;
    } else if (!m) {
      _m = data.length / n;
      if (_m !== parseInt(_m, 10)) {
        throw new Error('wrong number of data elements');
      }
    } else if (!n) {
      _n = data.length / m;
      if (_n !== parseInt(_n, 10)) {
        throw new Error('wrong number of data elements');
      }
    }
  };

  /**
   * Add matrices.
   *
   * @param that {Matrix}
   *        matrix to add.
   * @throws Error if dimensions do not match.
   * @return result of addition (original matrix is unchanged).
   */
  _this.add = function (that) {
    if (_m !== that.m() || n !== that.n()) {
      throw new Error('matrices must be same size');
    }
    return Matrix(Vector.add(_data, that.data()), _m, _n);
  };

  /**
   * Get a column from this matrix.
   *
   * @param col {Number}
   *        zero-based column index.
   * @return {Array<Number>} array containing elements from column.
   */
  _this.col = function (col) {
    return __col(_data, _m, _n, col);
  };

  /**
   * Access the wrapped array.
   */
  _this.data = function () {
    return _data;
  };

  /**
   * Get the diagonal from this matrix.
   *
   * @return {Array<Number>} array containing elements from diagonal.
   */
  _this.diagonal = function () {
    return __diagonal(_data, _m, _n);
  };

  /**
   * Get a value from this matrix.
   *
   * @param row {Number}
   *        zero-based index of row.
   * @param col {Number}
   *        zero-based index of column.
   * @return {Number} value at (row, col).
   */
  _this.get = function (row, col) {
    return __get(_data, _m, _n, row, col);
  };

  /**
   * Compute the eigenvectors of this matrix.
   *
   * NOTE: Matrix should be 3x3 and symmetric.
   *
   * @param maxRotations {Number}
   *        default 100.
   *        maximum number of iterations.
   * @return {Array<Vector>} eigenvectors.
   *         Magnitude of each vector is eigenvalue.
   */
  _this.jacobi = function (maxRotations) {
    return __jacobi(_data, _m, _n, maxRotations);
  };

  /**
   * Get the number of rows in matrix.
   *
   * @return {Number}
   *         number of rows.
   */
  _this.m = function () {
    return _m;
  };

  /**
   * Multiply matrices.
   *
   * @param that {Matrix}
   *        matrix to multiply.
   * @return {Matrix} result of multiplication.
   */
  _this.multiply = function (that) {
    return Matrix(__multiply(_data, _m, _n, that.data(), that.m(), that.n()),
      // use that.N
      _m, that.n());
  };

  /**
   * Get number of columns in matrix.
   *
   * @return {Number} number of columns.
   */
  _this.n = function () {
    return _n;
  };

  /**
   * Multiply each element by -1.
   *
   * @return {Matrix} result of negation.
   */
  _this.negative = function () {
    return Matrix(Vector.multiply(_data, -1), _m, _n);
  };

  /**
   * Get a row from this matrix.
   *
   * @param row {Number}
   *        zero-based index of row.
   * @return {Array<Number>} elements from row.
   */
  _this.row = function (row) {
    return __row(_data, _m, _n, row);
  };

  /**
   * Set a value in this matrix.
   *
   * @param row {Number}
   *        zero-based row index.
   * @param col {Number}
   *        zero-based column index.
   * @param value {Number}
   *        value to set.
   */
  _this.set = function (row, col, value) {
    __set(_data, _m, _n, row, col, value);
  };

  /**
   * Subtract another matrix from this matrix.
   *
   * @param that {Matrix}
   *        matrix to subtract.
   * @throws Error if dimensions do not match.
   * @return result of subtraction (original matrix is unchanged).
   */
  _this.subtract = function (that) {
    if (_m !== that.m() || n !== that.n()) {
      throw new Error('matrices must be same size');
    }
    return Matrix(Vector.subtract(_data, that.data()), _m, _n);
  };

  /**
   * Display matrix as a string.
   *
   * @return {String} formatted matrix.
   */
  _this.toString = function () {
    return __stringify(_data, _m, _n);
  };

  /**
   * Transpose matrix.
   *
   * Columns become rows, and rows become columns.
   *
   * @return {Matrix} result of transpose.
   */
  _this.transpose = function () {
    return Matrix(__transpose(_data, _m, _n),
      // swap M and N
      _n, _m);
  };

  _initialize(data, m, n);
  data = null;
  return _this;
};


// expose static methods.
Matrix.col = __col;
Matrix.diagonal = __diagonal;
Matrix.get = __get;
Matrix.identity = __identity;
Matrix.index = __index;
Matrix.jacobi = __jacobi;
Matrix.multiply = __multiply;
Matrix.row = __row;
Matrix.set = __set;
Matrix.stringify = __stringify;
Matrix.transpose = __transpose;


module.exports = Matrix;
