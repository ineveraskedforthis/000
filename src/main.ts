

import { initBuffers } from "./init_buffers.js";
import { drawScene } from "./draw.js";
import { Breach, ChunkData, ControlState, Creation, DungeonMaster, Explosion, GameObject, Mage, NPC, ResetArea, Spell, WorldDescription } from "./types.js";
import { loadTexture } from "./texture.js";
import { BIOME, QUEST, QUEST_STAGE, TEXTURE_INDEX } from "./enums.js";
import { get_chunk_index } from "./world.js";


const player: Mage = {
    spell_chain: 20,
    spell_damage: 50,
    spell_range: 200,
    spell_cooldown: 0,

    blink_cooldown: 0,
    blink_explosion_damage: 20,
    blink_explosion_radius: 30,

    aura_damage: 100,
    aura_range: 50,
    aura_active: false,

    index: 0,
    cast_speed: 0.005,

    breach_radius: 50,
    breach_waves: 1,

    souls_quality: 1,
}

const world_description : WorldDescription = {
    size_in_chunks: 500,
    chunk_size: 100
}


const world_true_size = world_description.size_in_chunks * world_description.chunk_size

const world : ChunkData[] = []
const game_objects: GameObject[] = []

function spawn_breaches(world_description: WorldDescription, cx: number, cy: number, intensity: number) {
    // start with basic circles
    while (intensity > 0) {
        for (let i = 0; i < 10 * intensity; i++) {
            let phi = i / 10 / intensity * Math.PI * 2
            let r = intensity * 200 + 100

            let x = cx + Math.cos(phi) * r
            let y = cy + Math.sin(phi) * r

            let object = new_object(x, y, 50, 50, TEXTURE_INDEX.BREACH)

            let breach : Breach = {
                index: object,
                radius: 0
            }

            let chunk = get_chunk_index(world_description, x, y)

            world[chunk].breaches.push(breach)
        }

        intensity -= 1
    }
}

function generate_world(world_description: WorldDescription) {
    for (let i = 0; i < world_description.size_in_chunks; i++) {
        for (let j = 0; j < world_description.size_in_chunks; j++) {
            world[i * world_description.size_in_chunks + j] = {
                biome: BIOME.SOULS_PLANES,
                breaches: [],
                passive_objects: []
            }
        }
    }

    spawn_breaches(world_description, world_true_size / 2, world_true_size / 2, 5)
}

let id = new_object(0, 0, 5, 20, 10)
player.index = id
let player_object = game_objects[player.index]
player_object.x = world_true_size / 2
player_object.y = world_true_size / 2


const enemies: Creation[] = []
const projectiles: Spell[] = []
const explosions: Explosion[] = []
const bosses: DungeonMaster[] = []

let souls = 0
let owed_souls = 0
let loan_payment_ratio = 0.25
let cashback_rate = 0.05

// milliseconds
let banking_season_length = 120 * 1000

let cores = 0
let rampage = 0

let bg_texture = TEXTURE_INDEX.BG_CREATURA

function reset() {
    enemies.length = 0
    projectiles.length = 0
    explosions.length = 0
    bosses.length = 0
    game_objects.length = 1

    player_object.x = world_true_size / 2
    player_object.y = world_true_size / 2
}

const REPUTATION_THRESHOLD = {
    HATEFUL: -1,
    OPPOSED: 500,
    COLD: 2000,
    NEUTRAL: 4000,
    RECOGNISED: 10000
}

const soul_keeper: NPC = {
    souls: 1000,
    reputation: 0,
    x: 500, y: 500
}

const quests_stage = {}

function get_quests_of_soul_keeper() {
    return [QUEST.BRING_SOULS]
}

function quest_bring_souls_activate() {
    quests_stage[QUEST.BRING_SOULS] = QUEST_STAGE.ACTIVE
}

function quest_bring_souls_condition() {
    return (souls > 50000)
}

function quest_bring_souls_complete() {
    soul_keeper.reputation += 500
    change_souls(-50000)
    soul_keeper.souls += 50000
}

function init_creatura() {
    bg_texture = TEXTURE_INDEX.BG_CREATURA

    for (let i = 0; i < 100; i++) {
        let x = (Math.random() - 0.5) * 1000
        let y = (Math.random() - 0.5) * 1000
        let w = 20 + Math.random() * 5
        let h = 20 + Math.random() * 5

        new_object(x, y, w, h, 20)
    }
}

function init_dungeon() {
    bg_texture = TEXTURE_INDEX.BG_DUNGEON

    let flames = new_object(50, 50, 50, 150, TEXTURE_INDEX.BOSS_DUNGEON_FLAME)
    let body = new_object(50, 50, 50, 150, TEXTURE_INDEX.BOSS_DUNGEON_BODY)

    let enemy_body : Creation = {
        hp: 1000000,
        max_hp: 1000000,
        index: body,
        dead: false,
        target_x: 50,
        target_y: 50,
        destroy_on_reaching_target: false,
        speed: 0
    }

    enemies.push(enemy_body)

    let master : DungeonMaster = {
        phase: 0,

        index_body: body,
        index_flame: flames,
        enemy: enemies.length - 1,

        adds: [],
        areas: []
    }

    bosses.push(master)
}

let soul_counter = document.getElementById("souls-counter")! as HTMLDivElement;
let loan_counter = document.getElementById("loan-counter")! as HTMLDivElement;
let loan_payment_counter= document.getElementById("expected-loan-payment")! as HTMLDivElement;
let cashback_counter = document.getElementById("cashback")! as HTMLDivElement;

function change_souls(ds) {
    souls += ds
    soul_counter.innerHTML = Math.floor(souls).toString()
}

function update_cashback() {
    cashback_rate = 1 - Math.exp(-owed_souls / 1000000)
    cashback_counter.innerHTML = (Math.floor(cashback_rate * 10000) / 100).toString() + "%"
}

function pay_souls(s) {
    souls -= s
    souls += cashback_rate * s
    soul_counter.innerHTML = Math.floor(souls).toString()
}

function loan_souls(loan: number) {
    change_souls(loan)
    owed_souls += loan

    update_cashback()
    loan_counter.innerHTML = owed_souls.toString()
    loan_payment_counter.innerHTML = loan_payment().toString()
}

function loan_payment() {
    return Math.floor(owed_souls * loan_payment_ratio)
}

function update_loan_payment() {
    change_souls(-loan_payment())
}

let loan_button  = document.getElementById("take-loan")! as HTMLButtonElement
loan_button.onclick = () => {
    loan_souls(500)
}

let pay_loan_button  = document.getElementById("pay-loan")! as HTMLButtonElement
pay_loan_button.onclick = () => {
    if (souls > 500)
        loan_souls(-500)
}



function aura_range() {
    return player.aura_range * (1 + Math.sqrt(rampage))
}


let aura_range_button  = document.getElementById("improve-aura-range")! as HTMLButtonElement

aura_range_button.onclick = () => {
    if (souls >= 1000) {
        pay_souls(1000)
        player.aura_range += 1
    }
}
let aura_damage_button  = document.getElementById("improve-aura-damage")! as HTMLButtonElement

aura_damage_button.onclick = () => {
    if (souls >= 1000) {
        pay_souls(1000)
        player.aura_damage += 5
    }
}

let spell_chain_button  = document.getElementById("improve-spell-chain")! as HTMLButtonElement
spell_chain_button.onclick = () => {
    if (souls >= 1000) {
        pay_souls(1000)
        player.spell_chain += 2
    }
}
let spell_damage_button  = document.getElementById("improve-spell-damage")! as HTMLButtonElement

spell_damage_button.onclick = () => {
    if (souls >= 1000) {
        pay_souls(1000)
        player.spell_damage += 10
    }
}

let blink_damage_button  = document.getElementById("improve-blink-damage")! as HTMLButtonElement
blink_damage_button.onclick = () => {
    if (souls >= 1000) {
        pay_souls(1000)
        player.blink_explosion_damage += 30
    }
}


let blink_radius_button  = document.getElementById("improve-blink-radius")! as HTMLButtonElement
blink_radius_button.onclick = () => {
    if (souls >= 1000) {
        pay_souls(1000)
        player.blink_explosion_radius += 10
    }
}

let breach_radius_button = document.getElementById("increase-breach-radius")! as HTMLButtonElement
breach_radius_button.onclick = () => {
    if (souls >= 3000) {
        pay_souls(3000)
        player.breach_radius += 25
    }
}

let breach_waves_button = document.getElementById("increase-breach-waves")! as HTMLButtonElement
breach_waves_button.onclick = () => {
    if (souls >= 3000) {
        pay_souls(3000)
        player.breach_waves += 1
    }
}

let breach_tier_button = document.getElementById("increase-souls-quality")! as HTMLButtonElement
breach_tier_button.onclick = () => {
    if (souls >= 5000) {
        pay_souls(5000)
        player.souls_quality += 1
    }
}

let fields_button = document.getElementById("enter-fields")! as HTMLButtonElement

fields_button.onclick = () => {
    reset()
}

function new_object(x, y, w, h, texture) {
    for (let i = 0; i < game_objects.length; i++) {
        if (game_objects[i].hidden) {
            game_objects[i].x = x
            game_objects[i].y = y
            game_objects[i].dx = 0
            game_objects[i].dy = 0
            game_objects[i].w = w
            game_objects[i].h = h
            game_objects[i].texture_id = texture
            game_objects[i].hidden = false
            return i
        }
    }

    game_objects.push({x : x, y : y, w : w, h: h, dx: 0, dy: 0, hidden: false, texture_id: texture})
    return game_objects.length - 1
}

function create_enemy(x, y, w, h, target_x, target_y, speed) {
    let id = new_object(x, y, w, h, 1 + Math.floor(Math.random() * 6))
    enemies.push({
        hp: 500,
        max_hp: 500,
        index: id,
        dead: false,
        target_x: target_x,
        target_y: target_y,
        destroy_on_reaching_target: true,
        speed: speed
    })
    return enemies.length - 1
}

function change_hp(creation: Creation, x: number) {
    creation.hp += x
    if (creation.hp <= 0) {
        creation.dead = true
        game_objects[creation.index].hidden = true;
        change_souls(30 * player.souls_quality)
        rampage += 1
    }
}


loan_souls(10000)
change_souls(-5000)

function closest_enemy_to_point(x: number, y: number, ignored: Record<number, boolean>) {
    let min_distance = player.spell_range
    let closest: GameObject|null = null

    for (const enemy of enemies) {
        const object = game_objects[enemy.index]

        if (enemy.dead) continue;
        if (ignored[enemy.index]) continue;

        let dist = Math.abs(x - object.x) + Math.abs(y - object.y)

        if (dist < min_distance) {
            min_distance = dist
            closest = object
        }
    }

    return closest
}

function blink() {
    if (player.blink_cooldown > 0) return
    if (souls < 500) return
    pay_souls(500)

    const player_object = game_objects[player.index]
    let closest = closest_enemy_to_point(player_object.x, player_object.y, [])
    if (closest == null) return

    player_object.x = closest.x;
    player_object.y = closest.y;

    let explosion: Explosion = {
        inner_radius: 0,
        outer_radius: player.blink_explosion_radius,
        damage: player.blink_explosion_damage,
        x: closest.x,
        y: closest.y
    }

    explosions.push(explosion)

    player.blink_cooldown = 1 / player.cast_speed
}


function aura_update() {
    if (!control_state.aura_pressed) {
        player.aura_active = false
        return false
    }
    player.aura_active = true

    pay_souls(0.1)

    const player_object = game_objects[player.index]

    for (const item of enemies) {
        const object = game_objects[item.index]

        if (item.dead) continue;

        let dx = player_object.x - object.x;
        let dy = player_object.y - object.y;
        let dist = dx * dx + dy * dy

        if (dist < aura_range() * aura_range()) {
            change_hp(item, -player.aura_damage)
        }
    }
}

function projectiles_update() {
    for(let i = 0; i < projectiles.length; i++) {
        for (let j = 0; j < enemies.length; j++) {
            let projectile = projectiles[i]
            let enemy = enemies[j]

            if (projectile.dead) continue;
            if (enemy.dead) continue;
            if (projectile.shot_indices[enemy.index]) continue;

            let a = game_objects[projectile.index]
            let b = game_objects[enemy.index]

            if (a.x + a.w < b.x - b.w) continue;
            if (a.x - a.w > b.x + b.w) continue;
            if (a.y + a.h < b.y - b.h) continue;
            if (a.y - a.h > b.y + b.h) continue;

            change_hp(enemy, -projectile.damage)

            if (projectile.chained_times >= player.spell_chain) {
                projectile.dead = true
                game_objects[projectile.index].hidden = true
            } else {
                projectile.shot_indices[enemy.index] = true
                projectile.chained_times += 1
                direct_spell_toward_closest_enemy(projectile)
            }
        }
    }
}


function update_boss(timer: number) {
    let player_object = game_objects[player.index]
    let reset_flag = false
    for (let item of bosses) {
        let boss_object = game_objects[item.index_body]

        let boss_entity = enemies[item.enemy]

        if (boss_entity == undefined || boss_entity.dead) {
            item.phase = -1
            continue
        }

        while (item.adds.length < 30) {
            let index = create_enemy(boss_object.x + 50, boss_object.y + 50, 20, 20, boss_object.x, boss_object.y, 3)
            enemies[index].destroy_on_reaching_target = false
            item.adds.push(index)
        }

        let to_remove: number[] = []

        for (let i = 0; i < 30; i++) {
            let add = enemies[item.adds[i]]

            if (add == undefined || add.dead) {
                to_remove.push(i)
            } else {
                add.target_x = boss_object.x + Math.sin(timer + Math.PI * 2 / 30 * i) * 400 * (2 + Math.sin(Math.PI * i / 3))
                add.target_y = boss_object.y + Math.cos(timer + Math.PI * 2 / 30 * i) * 400 * (2 + Math.sin(Math.PI * i / 3))
            }
        }

        for (let dead_add of to_remove) {
            item.adds.splice(dead_add, 1)
        }

        while (item.areas.length < 3) {
            let area : ResetArea = {
                x: boss_object.x, y: boss_object.y, radius: 40, inner_radius: 20
            }
            item.areas.push(area)
        }

        for (let i = 0; i < 3; i++) {
            let area = item.areas[i]

            let x = Math.cos(Math.PI * i / 3 * 2 + timer / 10000)
            let y = Math.sin(Math.PI * i / 3 * 2 + timer / 10000)

            let r = Math.sin(timer / 1000) * 200

            area.x = boss_object.x + x * r
            area.y = boss_object.y + y * r

            let dist = (area.x - player_object.x) * (area.x - player_object.x) + (area.y - player_object.y) * (area.y - player_object.y)

            if (dist < 40 * 40) {
                reset_flag = true
            }
        }
    }
    if (reset_flag)
        reset()
}

function clear_enemies() {
    enemies.sort((a, b) => Number(a.dead) - Number(b.dead))
    let j = 0
    for (let enemy of enemies) {
        if (enemy.dead) continue;
        j++
    }
    enemies.length = j
}

function clear_explosions() {
    explosions.sort((a, b) => -a.damage + b.damage)
    let i = 0
    for (let item of explosions) {
        if (item.damage <= 0) break;
        i += 1
    }
    explosions.length = i
}

function update_game_state(timer) {
    update_boss(timer)

    open_breaches();
    aura_update();
    projectiles_update();
    clear_enemies();
    clear_explosions();

    for (let item of explosions) {
        if (item.damage <= 0) break;
        for (let enemy of enemies) {
            if (enemy.dead) continue;

            let b = game_objects[enemy.index]

            let rsquare = (b.x - item.x) * (b.x - item.x) + (b.y - item.y) * (b.y - item.y)

            if (rsquare < item.inner_radius * item.inner_radius) continue
            if (rsquare > item.outer_radius * item.outer_radius) continue

            change_hp(enemy, -item.damage)

            if (enemy.dead) {
                let explosion: Explosion = {
                    inner_radius: 0,
                    outer_radius: player.blink_explosion_radius,
                    damage: player.blink_explosion_damage,
                    x: b.x,
                    y: b.y
                }
                explosions.push(explosion)
            }
        }
    }
}

function breach_cost() {
    return 1000 * player.breach_waves + player.breach_radius
}

function open_breaches() {
    for (let chunk of world){
        for (let item of chunk.breaches) {
            if (item.radius > 0) continue;
            if (souls < breach_cost()) continue;

            let a = game_objects[item.index]
            let b = game_objects[player.index]



            if ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) < player.breach_radius * player.breach_radius) {
                a.texture_id = TEXTURE_INDEX.BREACH_DISABLED
                item.radius = 100
                pay_souls(breach_cost())
                for (let wave = 0; wave < player.breach_waves; wave ++) {
                    let radius = 100 + 100 * wave
                    for (let i = 0; i < 40 / (wave + 1); i++) {
                        let phi = Math.random() * Math.PI * 2
                        let r = radius - Math.random() * Math.random() * 50

                        let x = r * Math.cos(phi)
                        let y = r * Math.sin(phi)

                        create_enemy(a.x + x, a.y + y, 10 + Math.random() * 10, 5 + Math.random() * 10, a.x, a.y, 0.20)
                    }
                }
            }
        }
    }
}

function direct_spell_toward_closest_enemy(item : Spell) {
    let object = game_objects[item.index]
    let x = object.x
    let y = object.y
    let ignored = item.shot_indices

    let min_distance = player.spell_range
    let closest: GameObject|null = null

    for (const enemy of enemies) {
        const object = game_objects[enemy.index]

        if (enemy.dead) continue;
        if (ignored[enemy.index]) continue;

        let dist = Math.abs(x - object.x) + Math.abs(y - object.y)

        if (dist < min_distance) {
            min_distance = dist
            closest = object
        }
    }

    if (closest == null) {
        item.dead = true
        return
    }

    let dx = closest.x - x
    let dy = closest.y - y

    let norm = Math.sqrt(dx * dx + dy * dy)

    object.dx = dx / norm * 0.1
    object.dy = dy / norm * 0.1
}


// finds the closest enemy and shoots toward them
function shoot_from_position(x, y) {
    if (player.spell_cooldown > 0) {
        return
    }
    if (souls < 1) return;

    let min_distance = player.spell_range
    let closest: GameObject|null = null

    for (const enemy of enemies) {
        const object = game_objects[enemy.index]

        if (enemy.dead) continue;

        let dist = Math.abs(x - object.x) + Math.abs(y - object.y)

        if (dist < min_distance) {
            min_distance = dist
            closest = object
        }
    }

    if (closest == null) {
        return
    }

    let id = new_object(x, y, 5, 5, 12)
    let item: Spell = {
        index: id,
        damage: player.spell_damage,
        dead: false,
        time_left: player.spell_range * 100,
        chained_times: 0,
        shot_indices: []
    }
    projectiles.push(item)
    pay_souls(1)
    direct_spell_toward_closest_enemy(item)

    player.spell_cooldown = 1 / player.cast_speed
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
uniform float time;

float frac(float x) {
    return x - floor(x);
}

void main() {
    float x = vTextureCoord.x * 2.0 - 1.0;
    float y = vTextureCoord.y * 2.0 - 1.0;
    float r = length(vTextureCoord * 2.0 - vec2(1.0, 1.0));
    float phi = atan(y, x) + time * r / 10.0;

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


function loadShader(gl: WebGLRenderingContext, type: GLenum, source: string) {
    const shader = gl.createShader(type);

    if (shader == null) {
        alert(`Unable to create shader`);
        return null
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(
            `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
        );
    gl.deleteShader(shader);
    return null;
    }

    return shader;
}


function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();

    if (shaderProgram == null) {
        alert(`Unable to create shader program`);
        return null
    }

    if (vertexShader == null) {
        alert(`Unable to create vertex shader`);
        return null
    }

    if (fragmentShader == null) {
        alert(`Unable to create vertex shader`);
        return null
    }

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert(
            `Unable to initialize the shader program: ${gl.getProgramInfoLog(
            shaderProgram,
            )}`,
        );
        return null;
    }

    return shaderProgram;
}

const control_state : ControlState = {
    left_pressed: false,
    right_pressed: false,
    up_pressed: false,
    down_pressed: false,
    aura_pressed: false,
}

window.addEventListener(
    "keydown",
    (event) => {
        let player_object = game_objects[player.index]

        if (event.defaultPrevented) {
            return; // Do nothing if event already handled
        }


        switch (event.code) {
        case "KeyS":
        case "ArrowDown":
            control_state.down_pressed = true
            break;
        case "KeyW":
        case "ArrowUp":
            control_state.up_pressed = true
            break;
        case "KeyA":
        case "ArrowLeft":
            control_state.left_pressed = true
            break;
        case "KeyD":
        case "ArrowRight":
            control_state.right_pressed = true
            break;
        case "Space":
            blink()
            break;
        case "KeyQ":
            control_state.aura_pressed = true
            break
        }



        if (event.code !== "Tab") {
            event.preventDefault();
        }
    },
    true,
);

window.addEventListener(
    "keyup",
    (event) => {
        let player_object = game_objects[player.index]

        if (event.defaultPrevented) {
            return; // Do nothing if event already handled
        }

        switch (event.code) {
        case "KeyS":
        case "ArrowDown":
            control_state.down_pressed = false
            break;
        case "KeyW":
        case "ArrowUp":
            control_state.up_pressed = false
            break;
        case "KeyA":
        case "ArrowLeft":
            control_state.left_pressed = false
            break;
        case "KeyD":
        case "ArrowRight":
            control_state.right_pressed = false
            break;
        case "KeyQ":
            control_state.aura_pressed = false
            break
        }

        if (event.code !== "Tab") {
            event.preventDefault();
        }
    },
    true,
);


function main() {
    const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;

    if (canvas == null) {
        return
    }

    const gl = canvas.getContext("webgl");


    if (gl === null) {
        alert(
            "Unable to initialize WebGL. Your browser or machine may not support it.",
        );
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const shaderProgramAura = initShaderProgram(gl, vsSource, fsSourceAura);

    if (shaderProgram == null || shaderProgramAura == null) {
        alert("Unable to create shader program")
        return
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
            time: gl.getUniformLocation(shaderProgramAura, "time"),
            texture: gl.getUniformLocation(shaderProgramAura, "base_texture"),
            style: gl.getUniformLocation(shaderProgramAura, "style"),
            inner_radius_ratio: gl.getUniformLocation(shaderProgramAura, "inner_radius_ratio"),
            projectionMatrix: gl.getUniformLocation(shaderProgramAura, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(shaderProgramAura, "uModelViewMatrix"),
        },
    }

    generate_world(world_description)

    const buffers = initBuffers(gl)
    // reset_buffers(gl, buffers, game_objects)

    let start = 0

    let camera_x = 0
    let camera_y = 0

    let tick_time = 0
    let expected_update_tick = 1000 / 20

    let textures: WebGLTexture[] = []
    for (let i = 1; i <= 7; i++) {
        textures.push(loadTexture(gl, i + ".svg"))
    }

    textures[10] = loadTexture(gl, "character.svg")
    textures[12] = loadTexture(gl, "flame.svg")

    textures[8000] = loadTexture(gl, "hp-bar.png")
    textures[8001] = loadTexture(gl, "hp-bar-bg.png")

    textures[TEXTURE_INDEX.BREACH] = loadTexture(gl, "breach-active.svg")
    textures[TEXTURE_INDEX.BREACH_DISABLED] = loadTexture(gl, "breach-inactive.svg")

    textures[20] = loadTexture(gl, "trees.svg")

    textures[TEXTURE_INDEX.BG_CREATURA] = loadTexture(gl, "bg-0.svg")
    textures[TEXTURE_INDEX.BG_DUNGEON] = loadTexture(gl, "bg.svg")

    textures[TEXTURE_INDEX.BOSS_DUNGEON_BODY] = loadTexture(gl, "boss-1.svg")
    textures[TEXTURE_INDEX.BOSS_DUNGEON_FLAME] = loadTexture(gl, "boss-1-flame.svg")

    let t = 0
    let current_season = 0

    let payment_timer = document.getElementById("time-until-payment")! as HTMLDivElement


    function update(timestamp) {
        if (start === undefined) {
            start = timestamp;
        }

        let global_slowdown = 1
        if (player.aura_active)
            global_slowdown = 0.4

        const elapsed = Math.min(100, timestamp - start) * global_slowdown;

        start = timestamp;

        tick_time += elapsed
        t += elapsed
        current_season += elapsed

        if (current_season > banking_season_length) {
            current_season -= banking_season_length
            update_loan_payment()
            if (souls < 0) {
                alert("Not enough souls for loan payment. You do not exist.")
                location.reload()
            }
        }
        payment_timer.innerHTML = Math.floor((banking_season_length - current_season) / 1000).toString()


        // console.log(enemies)
        // console.log(game_objects)

        for (let item of explosions) {
            if (item.damage <= 0) continue
            let inner_ratio = 1 - Math.min(item.damage / player.blink_explosion_damage, 1)

            item.outer_radius += 10 * elapsed * 0.001
            item.inner_radius = inner_ratio * item.outer_radius

            item.damage *= Math.exp(- elapsed * 0.01)
        }

        rampage *= Math.exp(- elapsed * 0.01)
        rampage = Math.max(0, rampage)

        while (tick_time > expected_update_tick) {
            tick_time -= expected_update_tick
            update_game_state(t)
        }

        for (let item of bosses) {
            let body = game_objects[item.index_body]
            let flame = game_objects[item.index_flame]

            flame.y = 10 + Math.sin(t / 200) * 10 + body.y
        }

        let player_object = game_objects[player.index]
        player.spell_cooldown = Math.max(0, player.spell_cooldown - elapsed)
        player.blink_cooldown = Math.max(0, player.blink_cooldown - elapsed)

        camera_x = camera_x + (player_object.x - camera_x) * 0.5
        camera_y = camera_y + (player_object.y - camera_y) * 0.5

        shoot_from_position(player_object.x, player_object.y)

        drawScene(
            gl, programInfo, programAuraInfo, buffers,
            game_objects, world_description, world, explosions, enemies, bosses, player, aura_range(),
            camera_x, camera_y, t,
            1 + Math.min(100, 0.01 * rampage) * (Math.sin(t / 10) + 2),
            textures, textures[bg_texture]
        )

        for (let item of projectiles) {
            if (item.dead) continue
            item.time_left -= elapsed
            if (item.time_left < 0) {
                item.dead = true
                game_objects[item.index].hidden = true
            }
        }

        for (let item of enemies) {
            if(item.dead) continue

            let dx = item.target_x - game_objects[item.index].x
            let dy = item.target_y - game_objects[item.index].y

            let n = Math.sqrt(dx * dx + dy * dy) / item.speed



            if ((n < 75) && item.destroy_on_reaching_target) {
                // console.log("return to the abyss")
                item.dead = true
                game_objects[item.index].hidden = true
            }

            if (n > 20) {
                game_objects[item.index].x += (Math.random() - 0.5 + dx / n) * elapsed * 0.1
                game_objects[item.index].y += (Math.random() - 0.5 + dy / n) * elapsed * 0.1
            }
        }

        player_object.dx = 0;
        player_object.dy = 0;

        if (control_state.down_pressed) {
            player_object.dy -= 1
        }
        if (control_state.up_pressed) {
            player_object.dy += 1
        }
        if (control_state.left_pressed) {
            player_object.dx -= 1
        }
        if (control_state.right_pressed) {
            player_object.dx += 1
        }

        let speed = 1
        if (player.aura_active)
            speed = 0.2

        player_object.dx *= speed
        player_object.dy *= speed


        for (let item of game_objects) {
            item.x += item.dx * elapsed;
            item.y += item.dy * elapsed;
        }

        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

main();
