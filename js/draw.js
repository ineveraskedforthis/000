import { get_chunk } from "./world.js";
export function drawScene(gl, programInfo, programAuraInfo, buffers, game_state, desc, world, explosions, enemies, bosses, player, player_aura_range, camera_x, camera_y, time, zoom_mod, textures, bg_texture) {
    if (gl == null)
        return;
    let canvas = gl.canvas;
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
    mat4.translate(modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to translate
    [-camera_x, -camera_y, -600.0 * zoom_mod]);
    setPositionAttribute(gl, buffers, programInfo);
    gl.useProgram(programInfo.program);
    // Set the shader uniforms
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(programInfo.uniformLocations.texture, 0);
    let player_object = game_state[player.index];
    let chunk = get_chunk(desc, camera_x, camera_y);
    let chunk_x = chunk[0];
    let chunk_y = chunk[1];
    for (let i = -5; i < 5; i++) {
        for (let j = -5; j < 5; j++) {
            let x = i + chunk_x;
            let y = j + chunk_y;
            if (x < 0)
                break;
            if (y < 0)
                break;
            if (x >= desc.size_in_chunks)
                break;
            if (y >= desc.size_in_chunks)
                break;
            gl.uniform2f(programInfo.uniformLocations.position, desc.chunk_size * (i + chunk_x), desc.chunk_size * (j + chunk_y));
            gl.uniform2f(programInfo.uniformLocations.size, desc.chunk_size, desc.chunk_size);
            let shifted_x = gl.bindTexture(gl.TEXTURE_2D, bg_texture);
            const vertexCount = 4;
            const offset = 0;
            gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
        }
    }
    gl.useProgram(programAuraInfo.program);
    gl.uniform1i(programAuraInfo.uniformLocations.style, 0);
    gl.uniform1f(programAuraInfo.uniformLocations.time, time);
    gl.uniformMatrix4fv(programAuraInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programAuraInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    if (player.aura_active) {
        gl.uniform2f(programAuraInfo.uniformLocations.position, player_object.x, player_object.y);
        gl.uniform2f(programAuraInfo.uniformLocations.size, player_aura_range, player_aura_range);
        gl.uniform1f(programAuraInfo.uniformLocations.inner_radius_ratio, 0);
        const vertexCount = 4;
        const offset = 0;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
    for (let item of explosions) {
        if (item.damage <= 0)
            continue;
        gl.uniform2f(programAuraInfo.uniformLocations.position, item.x, item.y);
        gl.uniform2f(programAuraInfo.uniformLocations.size, item.outer_radius, item.outer_radius);
        gl.uniform1f(programAuraInfo.uniformLocations.inner_radius_ratio, item.inner_radius / item.outer_radius);
        const vertexCount = 4;
        const offset = 0;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
    gl.uniform1i(programAuraInfo.uniformLocations.style, 1);
    for (let item of bosses) {
        if (item.phase == -1)
            continue;
        for (let area of item.areas) {
            gl.uniform2f(programAuraInfo.uniformLocations.position, area.x, area.y);
            gl.uniform2f(programAuraInfo.uniformLocations.size, area.radius, area.radius);
            gl.uniform1f(programAuraInfo.uniformLocations.inner_radius_ratio, area.inner_radius / area.radius);
            const vertexCount = 4;
            const offset = 0;
            gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
        }
    }
    gl.useProgram(programInfo.program);
    for (const item of game_state) {
        if (item.hidden)
            continue;
        gl.bindTexture(gl.TEXTURE_2D, textures[item.texture_id]);
        gl.uniform2f(programInfo.uniformLocations.position, item.x, item.y + item.h);
        gl.uniform2f(programInfo.uniformLocations.size, item.w, item.h);
        const vertexCount = 4;
        const offset = 0;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
    for (const item of enemies) {
        if (item.dead)
            continue;
        const object = game_state[item.index];
        const vertexCount = 4;
        const offset = 0;
        gl.bindTexture(gl.TEXTURE_2D, textures[8001]);
        // gl.uniform2f(programInfo.uniformLocations.position, object.x + object.w + 20, object.y);
        // gl.uniform2f(programInfo.uniformLocations.size, 2, object.h);
        gl.uniform2f(programInfo.uniformLocations.position, object.x, object.y + 20);
        gl.uniform2f(programInfo.uniformLocations.size, 10, 3);
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
        gl.bindTexture(gl.TEXTURE_2D, textures[8000]);
        // gl.uniform2f(programInfo.uniformLocations.position, object.x + object.w + 20, object.y);
        // gl.uniform2f(programInfo.uniformLocations.size, 2, object.h * item.hp / item.max_hp);
        gl.uniform2f(programInfo.uniformLocations.position, object.x, object.y + 20);
        gl.uniform2f(programInfo.uniformLocations.size, 10 * item.hp / item.max_hp, 3);
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
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}
