var objects = [];
var player = {
    chain: 2
};
function init_game() {
    objects.push({ x: 100, y: 200, size: 10 });
}
// Vertex shader program
var vsSource = "\n    attribute vec4 aVertexPosition;\n    uniform mat4 uModelViewMatrix;\n    uniform mat4 uProjectionMatrix;\n    void main() {\n        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;\n    }\n";
var fsSource = "\n    void main() {\n        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n    }\n";
function loadShader(gl, type, source) {
    var shader = gl.createShader(type);
    if (shader == null) {
        alert("Unable to create shader");
        return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("An error occurred compiling the shaders: ".concat(gl.getShaderInfoLog(shader)));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
function initShaderProgram(gl, vsSource, fsSource) {
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    // Create the shader program
    var shaderProgram = gl.createProgram();
    if (shaderProgram == null) {
        alert("Unable to create shader program");
        return null;
    }
    if (vertexShader == null) {
        alert("Unable to create vertex shader");
        return null;
    }
    if (fragmentShader == null) {
        alert("Unable to create vertex shader");
        return null;
    }
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program: ".concat(gl.getProgramInfoLog(shaderProgram)));
        return null;
    }
    return shaderProgram;
}
function main() {
    var canvas = document.getElementById("main-canvas");
    if (canvas == null) {
        return;
    }
    var gl = canvas.getContext("webgl");
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (shaderProgram == null) {
        alert("Unable to create shader program");
        return;
    }
    var programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        },
    };
}
main();
