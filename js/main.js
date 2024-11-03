import { initBuffers } from "./init_buffers.js";
import { drawScene } from "./draw.js";
import { loadTexture } from "./texture.js";
var TEXTURE_INDEX;
(function (TEXTURE_INDEX) {
    TEXTURE_INDEX[TEXTURE_INDEX["BREACH"] = 100] = "BREACH";
    TEXTURE_INDEX[TEXTURE_INDEX["BREACH_DISABLED"] = 101] = "BREACH_DISABLED";
    TEXTURE_INDEX[TEXTURE_INDEX["BG_DUNGEON"] = 1001] = "BG_DUNGEON";
    TEXTURE_INDEX[TEXTURE_INDEX["BG_CREATURA"] = 1002] = "BG_CREATURA";
    TEXTURE_INDEX[TEXTURE_INDEX["BOSS_DUNGEON_BODY"] = 2001] = "BOSS_DUNGEON_BODY";
    TEXTURE_INDEX[TEXTURE_INDEX["BOSS_DUNGEON_FLAME"] = 2002] = "BOSS_DUNGEON_FLAME";
})(TEXTURE_INDEX || (TEXTURE_INDEX = {}));
var REALM;
(function (REALM) {
    REALM[REALM["CREATURA"] = 1] = "CREATURA";
    REALM[REALM["DUNGEON"] = 2] = "DUNGEON";
})(REALM || (REALM = {}));
const game_objects = [];
const enemies = [];
const projectiles = [];
const explosions = [];
const breaches = [];
const bosses = [];
let souls = 200;
let owned_souls = 1000;
let loan_payment_ratio = 0.25;
let cashback_rate = 0.05;
// milliseconds
let banking_season_length = 120 * 1000;
let cores = 0;
let rampage = 0;
let realm = REALM.CREATURA;
let bg_texture = TEXTURE_INDEX.BG_CREATURA;
function reset() {
    enemies.length = 0;
    projectiles.length = 0;
    explosions.length = 0;
    breaches.length = 0;
    bosses.length = 0;
    game_objects.length = 1;
}
function init_creatura() {
    bg_texture = TEXTURE_INDEX.BG_CREATURA;
    for (let i = 0; i < 2000; i++) {
        let x = (Math.random() - 0.5) * 20000;
        let y = (Math.random() - 0.5) * 20000;
        let object = new_object(x, y, 50, 50, TEXTURE_INDEX.BREACH);
        let breach = {
            index: object,
            radius: 0
        };
        breaches.push(breach);
    }
    for (let i = 0; i < 100; i++) {
        let x = (Math.random() - 0.5) * 1000;
        let y = (Math.random() - 0.5) * 1000;
        let w = 20 + Math.random() * 5;
        let h = 20 + Math.random() * 5;
        new_object(x, y, w, h, 20);
    }
}
function init_dungeon() {
    bg_texture = TEXTURE_INDEX.BG_DUNGEON;
    let flames = new_object(50, 50, 50, 150, TEXTURE_INDEX.BOSS_DUNGEON_FLAME);
    let body = new_object(50, 50, 50, 150, TEXTURE_INDEX.BOSS_DUNGEON_BODY);
    let enemy_body = {
        hp: 1000,
        index: body,
        dead: false,
        target_x: 50,
        target_y: 50,
        destroy_on_reaching_target: false,
        speed: 0
    };
    enemies.push(enemy_body);
    let master = {
        phase: 0,
        index_body: body,
        index_flame: flames,
        enemy: enemies.length - 1,
        adds: [],
        areas: []
    };
    bosses.push(master);
}
function enter_realm(realm) {
    reset();
    switch (realm) {
        case REALM.CREATURA: {
            init_creatura();
            break;
        }
        case REALM.DUNGEON: {
            init_dungeon();
            break;
        }
    }
}
let soul_counter = document.getElementById("souls-counter");
let loan_counter = document.getElementById("loan-counter");
let loan_payment_counter = document.getElementById("expected-loan-payment");
function change_souls(ds) {
    souls += ds;
    soul_counter.innerHTML = souls.toString();
}
function loan_souls(loan) {
    change_souls(loan);
    owned_souls += loan;
    loan_counter.innerHTML = owned_souls.toString();
    loan_payment_counter.innerHTML = loan_payment().toString();
}
function loan_payment() {
    return Math.floor(owned_souls * loan_payment_ratio);
}
function update_loan_payment() {
    change_souls(-loan_payment());
}
let loan_button = document.getElementById("take-loan");
loan_button.onclick = () => {
    loan_souls(500);
};
const player = {
    spell_chain: 3,
    spell_damage: 10,
    spell_range: 200,
    spell_cooldown: 0,
    blink_cooldown: 0,
    blink_explosion_damage: 20,
    blink_explosion_radius: 30,
    aura_damage: 10,
    aura_range: 10,
    index: 0,
    cast_speed: 0.005
};
let aura_range_button = document.getElementById("improve-aura-range");
let aura_damage_button = document.getElementById("improve-aura-damage");
let dungeon_button = document.getElementById("enter-dungeon");
let fields_button = document.getElementById("enter-fields");
aura_range_button.onclick = () => {
    if (souls >= 50) {
        change_souls(-50);
        player.aura_range += 1;
    }
};
aura_damage_button.onclick = () => {
    if (souls >= 50) {
        change_souls(-50);
        player.aura_damage += 5;
    }
};
dungeon_button.onclick = () => {
    enter_realm(REALM.DUNGEON);
};
fields_button.onclick = () => {
    enter_realm(REALM.CREATURA);
};
function new_object(x, y, w, h, texture) {
    game_objects.push({ x: x, y: y, w: w, h: h, dx: 0, dy: 0, hidden: false, texture_id: texture });
    return game_objects.length - 1;
}
function create_player() {
    let id = new_object(0, 0, 5, 20, 10);
    player.index = id;
}
function create_enemy(x, y, w, h, target_x, target_y, speed) {
    let id = new_object(x, y, w, h, 1 + Math.floor(Math.random() * 6));
    enemies.push({
        hp: 500,
        index: id,
        dead: false,
        target_x: target_x,
        target_y: target_y,
        destroy_on_reaching_target: true,
        speed: speed
    });
    return enemies.length - 1;
}
function change_hp(creation, x) {
    creation.hp += x;
    if (creation.hp <= 0) {
        creation.dead = true;
        game_objects[creation.index].hidden = true;
        change_souls(30);
        rampage += 1;
    }
}
create_player();
function closest_enemy_to_point(x, y, ignored) {
    let min_distance = player.spell_range;
    let closest = null;
    for (const enemy of enemies) {
        const object = game_objects[enemy.index];
        if (enemy.dead)
            continue;
        if (ignored[enemy.index])
            continue;
        let dist = Math.abs(x - object.x) + Math.abs(y - object.y);
        if (dist < min_distance) {
            min_distance = dist;
            closest = object;
        }
    }
    return closest;
}
function blink() {
    if (player.blink_cooldown > 0)
        return;
    if (souls < 500)
        return;
    change_souls(-500);
    const player_object = game_objects[player.index];
    let closest = closest_enemy_to_point(player_object.x, player_object.y, []);
    if (closest == null)
        return;
    player_object.x = closest.x;
    player_object.y = closest.y;
    let explosion = {
        inner_radius: 0,
        outer_radius: player.blink_explosion_radius,
        damage: player.blink_explosion_damage,
        x: closest.x,
        y: closest.y
    };
    explosions.push(explosion);
    player.blink_cooldown = 1 / player.cast_speed;
}
function aura_update() {
    const player_object = game_objects[player.index];
    for (const item of enemies) {
        const object = game_objects[item.index];
        if (item.dead)
            continue;
        let dx = player_object.x - object.x;
        let dy = player_object.y - object.y;
        let dist = dx * dx + dy * dy;
        if (dist < player.aura_range * player.aura_range) {
            change_hp(item, -player.aura_damage);
        }
    }
}
function projectiles_update() {
    for (let i = 0; i < projectiles.length; i++) {
        for (let j = 0; j < enemies.length; j++) {
            let projectile = projectiles[i];
            let enemy = enemies[j];
            if (projectile.dead)
                continue;
            if (enemy.dead)
                continue;
            if (projectile.shot_indices[enemy.index])
                continue;
            let a = game_objects[projectile.index];
            let b = game_objects[enemy.index];
            if (a.x + a.w < b.x - b.w)
                continue;
            if (a.x - a.w > b.x + b.w)
                continue;
            if (a.y + a.h < b.y - b.h)
                continue;
            if (a.y - a.h > b.y + b.h)
                continue;
            change_hp(enemy, -projectile.damage);
            if (projectile.chained_times >= player.spell_chain) {
                projectile.dead = true;
                game_objects[projectile.index].hidden = true;
            }
            else {
                projectile.shot_indices[enemy.index] = true;
                projectile.chained_times += 1;
                direct_spell_toward_closest_enemy(projectile);
            }
        }
    }
}
function update_boss(timer) {
    let player_object = game_objects[player.index];
    let reset_flag = false;
    for (let item of bosses) {
        let boss_object = game_objects[item.index_body];
        let boss_entity = enemies[item.enemy];
        if (boss_entity.dead) {
            item.phase = -1;
            continue;
        }
        while (item.adds.length < 30) {
            let index = create_enemy(boss_object.x + 50, boss_object.y + 50, 20, 20, boss_object.x, boss_object.y, 3);
            enemies[index].destroy_on_reaching_target = false;
            item.adds.push(index);
        }
        let to_remove = [];
        for (let i = 0; i < 30; i++) {
            let add = enemies[item.adds[i]];
            if (add.dead)
                to_remove.push(i);
            add.target_x = boss_object.x + Math.sin(timer + Math.PI * 2 / 30 * i) * 400 * (2 + Math.sin(Math.PI * i / 3));
            add.target_y = boss_object.y + Math.cos(timer + Math.PI * 2 / 30 * i) * 400 * (2 + Math.sin(Math.PI * i / 3));
        }
        for (let dead_add of to_remove) {
            item.adds.splice(dead_add, 1);
        }
        while (item.areas.length < 3) {
            let area = {
                x: boss_object.x, y: boss_object.y, radius: 40, inner_radius: 20
            };
            item.areas.push(area);
        }
        for (let i = 0; i < 3; i++) {
            let area = item.areas[i];
            let x = Math.cos(Math.PI * i / 3 * 2 + timer / 10000);
            let y = Math.sin(Math.PI * i / 3 * 2 + timer / 10000);
            let r = Math.sin(timer / 1000) * 200;
            area.x = boss_object.x + x * r;
            area.y = boss_object.y + y * r;
            let dist = (area.x - player_object.x) * (area.x - player_object.x) + (area.y - player_object.y) * (area.y - player_object.y);
            if (dist < 40 * 40) {
                reset_flag = true;
            }
        }
    }
    if (reset_flag)
        enter_realm(REALM.CREATURA);
}
function update_game_state(timer) {
    update_boss(timer);
    open_breaches();
    aura_update();
    projectiles_update();
    for (let item of explosions) {
        for (let enemy of enemies) {
            if (item.damage <= 0)
                continue;
            if (enemy.dead)
                continue;
            let b = game_objects[enemy.index];
            let rsquare = (b.x - item.x) * (b.x - item.x) + (b.y - item.y) * (b.y - item.y);
            if (rsquare < item.inner_radius * item.inner_radius)
                continue;
            if (rsquare > item.outer_radius * item.outer_radius)
                continue;
            change_hp(enemy, -item.damage);
            if (enemy.dead) {
                let explosion = {
                    inner_radius: 0,
                    outer_radius: player.blink_explosion_radius,
                    damage: player.blink_explosion_damage,
                    x: b.x,
                    y: b.y
                };
                explosions.push(explosion);
            }
        }
    }
}
function open_breaches() {
    for (let item of breaches) {
        if (item.radius > 0)
            continue;
        let a = game_objects[item.index];
        let b = game_objects[player.index];
        if ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) < 2500) {
            item.radius = 300;
            a.texture_id = TEXTURE_INDEX.BREACH_DISABLED;
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    let phi = Math.random() * Math.PI * 2;
                    let r = item.radius - Math.random() * Math.random() * 50;
                    let x = r * Math.cos(phi);
                    let y = r * Math.sin(phi);
                    create_enemy(a.x + x, a.y + y, 10 + Math.random() * 10, 5 + Math.random() * 10, a.x, a.y, 0.20);
                }
            }
        }
    }
}
function direct_spell_toward_closest_enemy(item) {
    let object = game_objects[item.index];
    let x = object.x;
    let y = object.y;
    let ignored = item.shot_indices;
    let min_distance = player.spell_range;
    let closest = null;
    for (const enemy of enemies) {
        const object = game_objects[enemy.index];
        if (enemy.dead)
            continue;
        if (ignored[enemy.index])
            continue;
        let dist = Math.abs(x - object.x) + Math.abs(y - object.y);
        if (dist < min_distance) {
            min_distance = dist;
            closest = object;
        }
    }
    if (closest == null) {
        item.dead = true;
        return;
    }
    let dx = closest.x - x;
    let dy = closest.y - y;
    let norm = Math.sqrt(dx * dx + dy * dy);
    object.dx = dx / norm * 0.1;
    object.dy = dy / norm * 0.1;
}
// finds the closest enemy and shoots toward them
function shoot_from_position(x, y) {
    if (player.spell_cooldown > 0) {
        return;
    }
    if (souls < 1)
        return;
    let min_distance = player.spell_range;
    let closest = null;
    for (const enemy of enemies) {
        const object = game_objects[enemy.index];
        if (enemy.dead)
            continue;
        let dist = Math.abs(x - object.x) + Math.abs(y - object.y);
        if (dist < min_distance) {
            min_distance = dist;
            closest = object;
        }
    }
    if (closest == null) {
        return;
    }
    let id = new_object(x, y, 5, 5, 12);
    let item = {
        index: id,
        damage: player.spell_damage,
        dead: false,
        time_left: player.spell_range * 100,
        chained_times: 0,
        shot_indices: []
    };
    projectiles.push(item);
    change_souls(-1);
    direct_spell_toward_closest_enemy(item);
    player.spell_cooldown = 1 / player.cast_speed;
}
// Vertex shader program
const vsSource = `
    attribute vec4 aVertexPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform vec2 position;
    uniform vec2 size;
    varying highp vec2 vTextureCoord;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * ((aVertexPosition + vec4(0.0, 0.0, 0.0, 0.0)) * vec4(size, 1.0, 1.0) + vec4(position, 0.0, 0.0));

        vTextureCoord = (aVertexPosition.xy + vec2(1.0, 1.0)) * 0.5;
    }
`;
const fsSource = `
varying highp vec2 vTextureCoord;
uniform sampler2D base_texture;

void main() {
    gl_FragColor = texture2D(base_texture, vec2(vTextureCoord.x, 1.0 - vTextureCoord.y));
    gl_FragColor.rgb *= gl_FragColor.a;
}
`;
const fsSourceAura = `
precision highp float;

varying highp vec2 vTextureCoord;
uniform sampler2D base_texture;
uniform float inner_radius_ratio;
uniform int style;

float frac(float x) {
    return x - floor(x);
}

void main() {
    float x = vTextureCoord.x * 2.0 - 1.0;
    float y = vTextureCoord.y * 2.0 - 1.0;
    float r = length(vTextureCoord * 2.0 - vec2(1.0, 1.0));
    float phi = atan(y, x);

    if ((inner_radius_ratio < r) && (r < 1.0)) {
        if (style == 0) {
            if (frac(abs(phi * phi - r * (r - 1.0) * (r + 1.0)) * 10.0) < 0.2) {
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                return;
            }
        } else if (style == 1) {
            if (frac((r - inner_radius_ratio) * (r - inner_radius_ratio)) < 0.2) {
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                return;
            }
        }
        gl_FragColor = vec4(0.5, 0.8, 0.8, 1.0) / r / 5.0;
        return;
    }
    discard;
}
`;
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (shader == null) {
        alert(`Unable to create shader`);
        return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    // Create the shader program
    const shaderProgram = gl.createProgram();
    if (shaderProgram == null) {
        alert(`Unable to create shader program`);
        return null;
    }
    if (vertexShader == null) {
        alert(`Unable to create vertex shader`);
        return null;
    }
    if (fragmentShader == null) {
        alert(`Unable to create vertex shader`);
        return null;
    }
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
        return null;
    }
    return shaderProgram;
}
const control_state = {
    left_pressed: false,
    right_pressed: false,
    up_pressed: false,
    down_pressed: false
};
window.addEventListener("keydown", (event) => {
    let player_object = game_objects[player.index];
    if (event.defaultPrevented) {
        return; // Do nothing if event already handled
    }
    switch (event.code) {
        case "KeyS":
        case "ArrowDown":
            control_state.down_pressed = true;
            break;
        case "KeyW":
        case "ArrowUp":
            control_state.up_pressed = true;
            break;
        case "KeyA":
        case "ArrowLeft":
            control_state.left_pressed = true;
            break;
        case "KeyD":
        case "ArrowRight":
            control_state.right_pressed = true;
            break;
        case "Space":
            blink();
            break;
    }
    if (event.code !== "Tab") {
        event.preventDefault();
    }
}, true);
window.addEventListener("keyup", (event) => {
    let player_object = game_objects[player.index];
    if (event.defaultPrevented) {
        return; // Do nothing if event already handled
    }
    switch (event.code) {
        case "KeyS":
        case "ArrowDown":
            control_state.down_pressed = false;
            break;
        case "KeyW":
        case "ArrowUp":
            control_state.up_pressed = false;
            break;
        case "KeyA":
        case "ArrowLeft":
            control_state.left_pressed = false;
            break;
        case "KeyD":
        case "ArrowRight":
            control_state.right_pressed = false;
            break;
    }
    if (event.code !== "Tab") {
        event.preventDefault();
    }
}, true);
function main() {
    const canvas = document.getElementById("main-canvas");
    if (canvas == null) {
        return;
    }
    const gl = canvas.getContext("webgl");
    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const shaderProgramAura = initShaderProgram(gl, vsSource, fsSourceAura);
    if (shaderProgram == null || shaderProgramAura == null) {
        alert("Unable to create shader program");
        return;
    }
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        },
        uniformLocations: {
            position: gl.getUniformLocation(shaderProgram, "position"),
            size: gl.getUniformLocation(shaderProgram, "size"),
            texture: gl.getUniformLocation(shaderProgram, "base_texture"),
            projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        },
    };
    const programAuraInfo = {
        program: shaderProgramAura,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgramAura, "aVertexPosition"),
        },
        uniformLocations: {
            position: gl.getUniformLocation(shaderProgramAura, "position"),
            size: gl.getUniformLocation(shaderProgramAura, "size"),
            texture: gl.getUniformLocation(shaderProgramAura, "base_texture"),
            style: gl.getUniformLocation(shaderProgramAura, "style"),
            inner_radius_ratio: gl.getUniformLocation(shaderProgramAura, "inner_radius_ratio"),
            projectionMatrix: gl.getUniformLocation(shaderProgramAura, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(shaderProgramAura, "uModelViewMatrix"),
        },
    };
    enter_realm(REALM.CREATURA);
    const buffers = initBuffers(gl);
    // reset_buffers(gl, buffers, game_objects)
    let start = 0;
    let camera_x = 0;
    let camera_y = 0;
    let tick_time = 0;
    let expected_update_tick = 1000 / 20;
    let textures = [];
    for (let i = 1; i <= 7; i++) {
        textures.push(loadTexture(gl, i + ".svg"));
    }
    textures[10] = loadTexture(gl, "character.svg");
    textures[12] = loadTexture(gl, "flame.svg");
    textures[TEXTURE_INDEX.BREACH] = loadTexture(gl, "breach-active.svg");
    textures[TEXTURE_INDEX.BREACH_DISABLED] = loadTexture(gl, "breach-inactive.svg");
    textures[20] = loadTexture(gl, "trees.svg");
    textures[TEXTURE_INDEX.BG_CREATURA] = loadTexture(gl, "bg-0.svg");
    textures[TEXTURE_INDEX.BG_DUNGEON] = loadTexture(gl, "bg.svg");
    textures[TEXTURE_INDEX.BOSS_DUNGEON_BODY] = loadTexture(gl, "boss-1.svg");
    textures[TEXTURE_INDEX.BOSS_DUNGEON_FLAME] = loadTexture(gl, "boss-1-flame.svg");
    let t = 0;
    let current_season = 0;
    let payment_timer = document.getElementById("time-until-payment");
    function update(timestamp) {
        if (start === undefined) {
            start = timestamp;
        }
        const elapsed = Math.min(100, timestamp - start);
        start = timestamp;
        tick_time += elapsed;
        t += elapsed;
        current_season += elapsed;
        if (current_season > banking_season_length) {
            current_season -= banking_season_length;
            update_loan_payment();
            if (souls < 0) {
                alert("Not enough souls for loan payment. You do not exist.");
                location.reload();
            }
        }
        payment_timer.innerHTML = Math.floor((banking_season_length - current_season) / 1000).toString();
        // console.log(enemies)
        // console.log(game_objects)
        for (let item of explosions) {
            if (item.damage <= 0)
                continue;
            let inner_ratio = 1 - Math.min(item.damage / player.blink_explosion_damage, 1);
            item.outer_radius += 10 * elapsed * 0.001;
            item.inner_radius = inner_ratio * item.outer_radius;
            item.damage -= 1 * elapsed * 0.01;
        }
        rampage *= Math.exp(-elapsed * 0.01);
        rampage = Math.max(0, rampage);
        while (tick_time > expected_update_tick) {
            tick_time -= expected_update_tick;
            update_game_state(t);
        }
        for (let item of bosses) {
            let body = game_objects[item.index_body];
            let flame = game_objects[item.index_flame];
            flame.y = 10 + Math.sin(t / 200) * 10 + body.y;
        }
        let player_object = game_objects[player.index];
        player.spell_cooldown = Math.max(0, player.spell_cooldown - elapsed);
        player.blink_cooldown = Math.max(0, player.blink_cooldown - elapsed);
        camera_x = camera_x + (player_object.x - camera_x) * 0.5;
        camera_y = camera_y + (player_object.y - camera_y) * 0.5;
        shoot_from_position(player_object.x, player_object.y);
        drawScene(gl, programInfo, programAuraInfo, buffers, game_objects, explosions, bosses, player, camera_x, camera_y, 1 + Math.min(100, 0.01 * rampage) * (Math.sin(t / 10) + 2), textures, textures[bg_texture]);
        for (let item of projectiles) {
            if (item.dead)
                continue;
            item.time_left -= elapsed;
            if (item.time_left < 0) {
                item.dead = true;
                game_objects[item.index].hidden = true;
            }
        }
        for (let item of enemies) {
            let dx = item.target_x - game_objects[item.index].x;
            let dy = item.target_y - game_objects[item.index].y;
            let n = Math.sqrt(dx * dx + dy * dy) / item.speed;
            if ((n < 75) && item.destroy_on_reaching_target) {
                // console.log("return to the abyss")
                item.dead = true;
                game_objects[item.index].hidden = true;
            }
            if (n > 20) {
                game_objects[item.index].x += (Math.random() - 0.5 + dx / n) * elapsed * 0.1;
                game_objects[item.index].y += (Math.random() - 0.5 + dy / n) * elapsed * 0.1;
            }
        }
        player_object.dx = 0;
        player_object.dy = 0;
        if (control_state.down_pressed) {
            player_object.dy -= 1;
        }
        if (control_state.up_pressed) {
            player_object.dy += 1;
        }
        if (control_state.left_pressed) {
            player_object.dx -= 1;
        }
        if (control_state.right_pressed) {
            player_object.dx += 1;
        }
        for (let item of game_objects) {
            item.x += item.dx * elapsed;
            item.y += item.dy * elapsed;
        }
        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}
main();
