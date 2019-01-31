/*global fetch*/

//Set up canvas
const canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const gl = canvas.getContext("webgl");
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);

function getShaderProgram(vertexFile, fragmentFile, callback) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    const shaderProgram = gl.createProgram();
    fetch(vertexFile).then(body => body.text().then(function(text) {
        //Compile vertex
        gl.shaderSource(vertexShader, text);
        gl.compileShader(vertexShader);
        fetch(fragmentFile).then(body => body.text().then(function(text) {
            //Compile fragment
            gl.shaderSource(fragmentShader, text);
            gl.compileShader(fragmentShader);
            //Link program
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);
            gl.useProgram(shaderProgram);
            //Verify shaders
            if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
                throw "vertex shader: " + gl.getShaderInfoLog(vertexShader);
            }
            if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
                throw "fragment shader: " + gl.getShaderInfoLog(fragmentShader);
            }
            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                throw "shader program: " + gl.getProgramInfoLog(shaderProgram);
            }
            //Return
            callback(shaderProgram);
        }));
    }));
}

function useShaderProgram(program) {
    //Get shader input locations
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const uResolution = gl.getUniformLocation(program, 'uResolution');
    const uEye = gl.getUniformLocation(program, 'uEye');
    const uBack = gl.getUniformLocation(program, 'uBack');
    const uUp = gl.getUniformLocation(program, 'uUp');

    //Set screen size input
    gl.uniform2f(uResolution, gl.canvas.width, gl.canvas.height);

    //Set virtual screen input
    const square = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(square), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    //Set up camera position input
    let eye = [0, 0, -2];
    let xAngle = 0;
    let yAngle = 0;
    let up = [0, 1, 0];
    const norm = function normalize(v) {
        const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / length, v[1] / length, v[2] / length];
    };
    const getUp = _ => norm(up);
    const getBack = _ => norm([-Math.sin(xAngle), -Math.sin(yAngle), -Math.cos(xAngle)]);
    const getRight = _ => norm([
        getBack()[1] * getUp()[2] - getBack()[2] * getUp()[1],
        getBack()[2] * getUp()[0] - getBack()[0] * getUp()[2],
        getBack()[0] * getUp()[1] - getBack()[1] * getUp()[0]
    ]);

    //Set camera inputs and draw
    const render = function render() {
        gl.uniform3f(uEye, ...eye);
        gl.uniform3f(uBack, ...getBack());
        gl.uniform3f(uUp, ...getUp());
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    //Change the eye and center positions
    const moveSpeed = 0.005;
    const turnSpeed = 0.01;
    const movePoint = (p, v, s) => p.map((_, i) => p[i] + v[i] * moveSpeed * s);
    const move = function move(keys) {
        if (keys["e"]) {
            eye = movePoint(eye, getUp(), -1);
        }
        if (keys["q"]) {
            eye = movePoint(eye, getUp(), 1);
        }
        if (keys["w"]) {
            eye = movePoint(eye, getBack(), -1);
        }
        if (keys["s"]) {
            eye = movePoint(eye, getBack(), 1);
        }
        if (keys["a"]) {
            eye = movePoint(eye, getRight(), -1);
        }
        if (keys["d"]) {
            eye = movePoint(eye, getRight(), 1);
        }
        
        if (keys["ArrowRight"]) {
            xAngle += turnSpeed;
        }
        if (keys["ArrowLeft"]) {
            xAngle -= turnSpeed;
        }
        if (keys["ArrowUp"]) {
            yAngle += turnSpeed;
        }
        if (keys["ArrowDown"]) {
            yAngle -= turnSpeed;
        }
    };

    //Main loop
    let requestId;
    let keys = {};
    const loop = function loop() {
        move(keys);
        render();
        requestId = Object.values(keys).filter(a => a).length ?
            window.requestAnimationFrame(loop) :
            window.cancelAnimationFrame(requestId);
    };

    //Controller
    window.onkeydown = function startLoop(event) {
        keys[event.key] = true;
        if (requestId === undefined) {
            requestId = window.requestAnimationFrame(loop);
        }
    };
    window.onkeyup = function stopLoop(event) {
        keys[event.key] = false;
    };

    //Initial render
    render();
}

getShaderProgram("shader.vert", "shader.frag", useShaderProgram);
