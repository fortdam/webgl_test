/*This would expose the "t3d" object to the global context*/

var t3d = {
  init: function(aCanvas) {
    try {
      glContext = aCanvas.getContext('experimental-webgl');
      glContext.viewport(0, 0, aCanvas.width, aCanvas.height);
    }
    catch (e) {
      var msg = 'Error creating WebGL context!: ' + e.toString();
      throw Error(msg);
    }

    return glContext;
  },

  setupProgram: function(aVertexShaderSrc, aFragmentShaderSrc) {
    if (!glContext) {
      throw Error("WebGL context isn't created before setup shader!");
    }

    if (!aVertexShaderSrc || !aFragmentShaderSrc) {
      throw Error('Shader can not be empty!');
    }

    var program = glContext.createProgram();
    var vShader = glContext.createShader(glContext.VERTEX_SHADER);
    var fShader = glContext.createShader(glContext.FRAGMENT_SHADER);

    glContext.shaderSource(vShader, aVertexShaderSrc);
    glContext.shaderSource(fShader, aFragmentShaderSrc);

    glContext.compileShader(vShader);
    glContext.compileShader(fShader);

    if (!glContext.getShaderParameter(vShader, glContext.COMPILE_STATUS)) {
      throw Error(glContext.getShaderInfoLog(vShader));
    }

    if (!glContext.getShaderParameter(fShader, glContext.COMPILE_STATUS)) {
      throw Error(glContext.getShaderInfoLog(fShader));
    }

    glContext.attachShader(program, vShader);
    glContext.attachShader(program, fShader);
    glContext.linkProgram(program);

    if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
      throw Error('Could not link the shader');
    }

    return program;
  },

  getGL: function() {
    return glContext;
  },

  Matrix: function() {
    this.mat = [1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1];
  },


  //XXX the private items/function should be protected in someway
  glContext: null

};

t3d.Matrix.prototype = {
  /*We use a normal array (with 16 elements) to represent a 4x4 matrix*/

    __multiplyM: function(aMatrixA) {
      var orig = this.mat.slice(0,16);

      for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
          this.mat[i + j * 4] = 0;
          for (var k = 0; k < 4; k++) {
            this.mat[i + j * 4] += aMatrixA[i + k * 4] * orig[k + j * 4];
          }
        }
      }
    },

    transpose: function() {
      for (var i = 0; i < 4; i++) {
        this.mat[i * 4 + i] = this.mat[i * 4 + i];

        for (var j = 0; j < i; j++) {
          this.mat[i * 4 + j] = this.mat[j * 4 + i];
          this.mat[j * 4 + i] = this.mat[i * 4 + j];
        }
      }

      return this;
    },

    frustum: function(aLeft, aRight, aBottom, aTop, aNear, aFar) {
      var m =
          [(2 * aNear) / (aRight - aLeft), 0, 0, 0,
           0, (2 * aNear) / (aTop - aBottom), 0, 0,
           (aRight + aLeft) / (aRight - aLeft),
                (aTop + aBottom) / (aTop - aBottom),
                -(aNear + aFar) / (aFar - aNear), -1,
           0, 0, (-2 * aNear * aFar) / (aFar - aNear), 0];

      this.__multiplyM(m);
      return this;
    },

    lookAt: function(aPosX, aPosY, aPosZ) {
      var m = [1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    -aPosX, -aPosY, -aPosZ, 1];

      this.__multiplyM(m);
      return this;
    },

    translate: function(aDistX, aDistY, aDistZ) {
      var m = [1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    aDistX, aDistY, aDistZ, 1];
      
      this.__multiplyM(m);
      return this;
    },

    __d2r: function(degree) {
      return (2 * 3.1415926 * degree) / 360;
    },

    rotate: function(aDegreeX, aDegreeY, aDegreeZ) {

      if (aDegreeX > 180 || aDegreeX < -180) {
        throw Error('aDegreeX is out of range:' + aDegreeX);
      }
      else if (aDegreeY > 180 || aDegreeY < -180) {
        throw Error('aDegreeY is out of range:' + aDegreeY);
      }
      else if (aDegreeZ > 180 || aDegreeZ < -180) {
        throw Error('aDegreeZ is out of range:' + aDegreeZ);
      }

      var mRotateZ =
            [Math.cos(this.__d2r(aDegreeZ)), Math.sin(this.__d2r(aDegreeZ)), 0, 0,
             0 - Math.sin(this.__d2r(aDegreeZ)), Math.cos(this.__d2r(aDegreeZ)), 0, 0,
             0, 0, 1, 0,
             0, 0, 0, 1];

      var mRotateX =
            [1, 0, 0, 0,
             0, Math.cos(this.__d2r(aDegreeX)), Math.sin(this.__d2r(aDegreeX)), 0,
             0, 0 - Math.sin(this.__d2r(aDegreeX)), Math.cos(this.__d2r(aDegreeX)), 0,
             0, 0, 0, 1];

      var mRotateY =
            [Math.cos(this.__d2r(aDegreeY)), 0, Math.sin(this.__d2r(aDegreeY)), 0,
             0, 1, 0, 0,
             0 - Math.sin(this.__d2r(aDegreeY)), 0, Math.cos(this.__d2r(aDegreeY)), 0,
             0, 0, 0, 1];

      this.__multiplyM(mRotateX);
      this.__multiplyM(mRotateY);
      this.__multiplyM(mRotateZ);

      return this;
    },

    scale: function(aFactorX, aFactorY, aFactorZ) {
      var m = [aFactorX, 0, 0, 0,
                   0, aFactorY, 0, 0,
                   0, 0, aFactorZ, 0,
                   0, 0, 0, 1];

      this.__multiplyM(m);
      return this;
    },

    toGLArray: function() {
      return new Float32Array(this.mat);
    }
  
};


