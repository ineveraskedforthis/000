import { DungeonMaster, Explosion, GameObject, Mage } from "./types";

export function drawScene(
    gl: WebGLRenderingContext,
    programInfo,
    programAuraInfo,
    buffers,
    game_state: GameObject[],
    explosions: Explosion[],
    bosses: DungeonMaster[],
    player: Mage,
    camera_x: number,
    camera_y: number,
    zoom_mod: number,
    textures: WebGLTexture[],
    bg_texture: WebGLTexture
) {
    let canvas = gl.canvas as HTMLCanvasElement;

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clearDepth(1.0);
    gl.disable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Clear the canvas before we start drawing on it.

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const fieldOfView = (45 * Math.PI) / 180; // in radians
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear = 0.01;
    const zFar = 2000.0;
    const projectionMatrix = mat4.create();

    // note: glMatrix always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();



    // Now move the drawing position a bit to where we want to
    // start drawing the square.
    mat4.translate(
        modelViewMatrix, // destination matrix
        modelViewMatrix, // matrix to translate
        [-camera_x, -camera_y, -600.0 * zoom_mod],
    );

    setPositionAttribute(gl, buffers, programInfo);
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix,
    );
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix,
    );

    gl.activeTexture(gl.TEXTURE0);

    gl.uniform1i(programInfo.uniformLocations.texture, 0)

    let base_x = Math.floor(camera_x / 100)
    let base_y = Math.floor(camera_y / 100)

    for (let i = -5; i < 5; i++) {
        for (let j = -5; j < 5; j++) {
            gl.uniform2f(programInfo.uniformLocations.position, 100 * (i + base_x), 100 * (j + base_y));
            gl.uniform2f(programInfo.uniformLocations.size, 80, 50);
            gl.bindTexture(gl.TEXTURE_2D, bg_texture)
            const vertexCount = 6;
            const offset = 0;
            gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
        }
    }

    gl.useProgram(programAuraInfo.program);
    gl.uniform1i(programAuraInfo.uniformLocations.style, 0);

    gl.uniformMatrix4fv(
        programAuraInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix,
    );
    gl.uniformMatrix4fv(
        programAuraInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix,
    );

    {
        let player_object = game_state[player.index]
        gl.uniform2f(programAuraInfo.uniformLocations.position, player_object.x, player_object.y);
        gl.uniform2f(programAuraInfo.uniformLocations.size, player.aura_range, player.aura_range);
        gl.uniform1f(programAuraInfo.uniformLocations.inner_radius_ratio, 0)

        const vertexCount = 6;
        const offset = 0;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }

    for (let item of explosions) {
        if (item.damage <= 0) continue;

        gl.uniform2f(programAuraInfo.uniformLocations.position, item.x, item.y);
        gl.uniform2f(programAuraInfo.uniformLocations.size, item.outer_radius, item.outer_radius);
        gl.uniform1f(programAuraInfo.uniformLocations.inner_radius_ratio, item.inner_radius / item.outer_radius)

        const vertexCount = 6;
        const offset = 0;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }

    gl.uniform1i(programAuraInfo.uniformLocations.style, 1);

    for (let item of bosses) {
        if (item.phase == -1) continue;

        for (let area of item.areas) {
            gl.uniform2f(programAuraInfo.uniformLocations.position, area.x, area.y);
            gl.uniform2f(programAuraInfo.uniformLocations.size, area.radius, area.radius);
            gl.uniform1f(programAuraInfo.uniformLocations.inner_radius_ratio, area.inner_radius / area.radius)

            const vertexCount = 6;
            const offset = 0;
            gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
        }
    }

    gl.useProgram(programInfo.program);

    for (const item of game_state) {
        if (item.hidden) continue;

        gl.bindTexture(gl.TEXTURE_2D, textures[item.texture_id])
        gl.uniform2f(programInfo.uniformLocations.position, item.x, item.y + item.h);
        gl.uniform2f(programInfo.uniformLocations.size, item.w, item.h);
        const vertexCount = 6;
        const offset = 0;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }


}

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
function setPositionAttribute(gl, buffers, programInfo) {
    const numComponents = 2; // pull out 2 values per iteration
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from

    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}
