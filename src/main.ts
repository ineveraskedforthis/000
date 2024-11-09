

import { initBuffers } from "./init_buffers.js";
import { drawScene } from "./draw.js";
import { Breach, ChunkData, ControlState, Creation, DungeonMaster, Explosion, GameObject, GameObjectReference, Mage, NPC, ResetArea, Spell, WorldDescription } from "./types.js";
import { loadTexture } from "./texture.js";
import { BIOME, QUEST, QUEST_STAGE, TEXTURE_INDEX } from "./enums.js";
import { coord_to_index, for_chunks_in_radius, g_uid, get_chunk, get_chunk_index, get_object } from "./world.js";

const BREACH_SIZE = 50

const player: Mage = {
    spell_chain: 20,
    spell_damage: 50,
    spell_range: 200,
    spell_cooldown: 0,

    blink_cooldown: 0,
    blink_explosion_damage: 10000,
    blink_explosion_radius: 5,

    aura_damage: 100,
    aura_range: 50,
    aura_active: false,
    cast_speed: 0.005,

    object: {
        x: 0, y: 0, w: 5, h: 20, texture_id: 10, dx: 0, dy: 0, hidden: false
    },

    breach_radius: 50,
    breach_waves: 1,

    souls_quality: 1,
}

const world_description : WorldDescription = {
    size_in_chunks: 200,
    chunk_size: 1000,
    unused_uid: 0
}


const world_true_size = world_description.size_in_chunks * world_description.chunk_size

const world : ChunkData[] = []

function new_breach(world_description, x, y) {

    if (x <= 0) return;
    if (x >= world_true_size) return;
    if (y <= 0) return;
    if (y >= world_true_size) return;

    let object = new_object(world_description, x, y, BREACH_SIZE, BREACH_SIZE, TEXTURE_INDEX.BREACH)
    let breach : Breach = {
        index: object,
        radius: 0,
        uid: g_uid(world_description)
    }
    let chunk = get_chunk_index(world_description, x, y)
    world[chunk].breaches.push(breach)
}

function spawn_breaches(world_description: WorldDescription, cx: number, cy: number, intensity: number) {
    // start with basic circles
    while (intensity > 0) {
        for (let i = 0; i < 10; i++) {
            let phi = i / 10 * Math.PI * 2
            let r = intensity * 150 + 100

            let x = cx + Math.cos(phi) * r
            let y = cy + Math.sin(phi) * r

            new_breach(world_description, x, y);
        }

        intensity -= 1
    }
}

interface BiomeCenter {
    x: number,
    y: number,
    biome: BIOME
}

function generate_world(world_description: WorldDescription) {

    let biomes: BiomeCenter[] = [
        {
            x: Math.floor(Math.random() * world_description.size_in_chunks),
            y: Math.floor(Math.random() * world_description.size_in_chunks),
            biome: BIOME.RED_SOURCE
        },
        {
            x: Math.floor(Math.random() * world_description.size_in_chunks),
            y: Math.floor(Math.random() * world_description.size_in_chunks),
            biome: BIOME.RED_SOURCE
        },
        {
            x: Math.floor(Math.random() * world_description.size_in_chunks),
            y: Math.floor(Math.random() * world_description.size_in_chunks),
            biome: BIOME.RED_SOURCE
        },
        {
            x: Math.floor(Math.random() * world_description.size_in_chunks),
            y: Math.floor(Math.random() * world_description.size_in_chunks),
            biome: BIOME.SOULS_PLANES
        },
        {
            x: Math.floor(Math.random() * world_description.size_in_chunks),
            y: Math.floor(Math.random() * world_description.size_in_chunks),
            biome: BIOME.SOULS_PLANES
        },
        {
            x: Math.floor(Math.random() * world_description.size_in_chunks),
            y: Math.floor(Math.random() * world_description.size_in_chunks),
            biome: BIOME.SOULS_PLANES
        },
        {
            x: Math.floor(Math.random() * world_description.size_in_chunks),
            y: Math.floor(Math.random() * world_description.size_in_chunks),
            biome: BIOME.SOULS_PLANES
        },
    ]

    let dungeon_biome = [world_description.size_in_chunks / 2, world_description.size_in_chunks / 2]

    for (let i = 0; i < world_description.size_in_chunks; i++) {
        for (let j = 0; j < world_description.size_in_chunks; j++) {
            world[i * world_description.size_in_chunks + j] = {
                biome: BIOME.SOULS_PLANES,
                breaches: [],
                passive_objects: [],
                game_objects: [],
                enemies: []
            }
            let closest_biome = BIOME.RED_SOURCE
            let min_dist_square = world_description.size_in_chunks * world_description.size_in_chunks
            for (let item of biomes) {
                if ((i - item.x) * (i - item.x) + (j - item.y) * (j - item.y) < min_dist_square) {
                    closest_biome = item.biome
                    min_dist_square = (i - item.x) * (i - item.x) + (j - item.y) * (j - item.y)
                }
            }
            world[i * world_description.size_in_chunks + j].biome = closest_biome
        }
    }

    for (let i = 0; i < 100; i++) {
        spawn_breaches(world_description, world_true_size * Math.random(), world_true_size * Math.random(), Math.floor(Math.random() * 10) + 1)
    }


    for (let i = 0; i < 100000; i ++) {
        new_breach(world_description, world_true_size * Math.random(), world_true_size * Math.random());
    }


}

let player_object = player.object
player_object.x = world_true_size / 2
player_object.y = world_true_size / 2

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

function reset() {
    player_object.x = world_true_size / 2
    player_object.y = world_true_size / 2
    change_souls(-20000)
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

// function init_dungeon() {
//     bg_texture = TEXTURE_INDEX.BG_DUNGEON

//     let flames = new_object(50, 50, 50, 150, TEXTURE_INDEX.BOSS_DUNGEON_FLAME)
//     let body = new_object(50, 50, 50, 150, TEXTURE_INDEX.BOSS_DUNGEON_BODY)

//     let enemy_body : Creation = {
//         hp: 1000000,
//         max_hp: 1000000,
//         index: body,
//         dead: false,
//         target_x: 50,
//         target_y: 50,
//         destroy_on_reaching_target: false,
//         speed: 0
//     }

//     enemies.push(enemy_body)

//     let master : DungeonMaster = {
//         phase: 0,

//         index_body: body,
//         index_flame: flames,
//         enemy: enemies.length - 1,

//         adds: [],
//         areas: []
//     }

//     bosses.push(master)
// }

let soul_counter = document.getElementById("souls-counter")! as HTMLDivElement;
let loan_counter = document.getElementById("loan-counter")! as HTMLDivElement;
let loan_payment_counter= document.getElementById("expected-loan-payment")! as HTMLDivElement;
let cashback_counter = document.getElementById("cashback")! as HTMLDivElement;

function change_souls(ds) {
    souls += ds
    if (souls < 0) {
        loan_souls(-souls)
    }
    soul_counter.innerHTML = Math.floor(souls).toString()
}

function update_cashback() {
    cashback_rate = 1 - Math.exp(-owed_souls / 1000000)
    cashback_counter.innerHTML = (Math.floor(cashback_rate * 10000) / 100).toString() + "%"
}

let loan_limit = 100000

function pay_souls(s) {
    change_souls(cashback_rate * s - s)
    soul_counter.innerHTML = Math.floor(souls).toString()
}

function loan_souls(loan: number) {
    change_souls(loan)
    owed_souls += loan

    if (owed_souls > loan_limit) {
        if (souls == 0) {
            alert("You have hit souls loan limit and you can't pay it back. You stop existing.")
            location.reload()
        } else {
            let change = Math.min(souls, owed_souls)
            owed_souls -= change
            change_souls(-change)
        }
    }

    update_cashback()
    loan_counter.innerHTML = Math.floor(owed_souls).toString() + "/" + loan_limit
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
    pay_souls(1000)
    player.aura_range += 1
}
let aura_damage_button  = document.getElementById("improve-aura-damage")! as HTMLButtonElement

aura_damage_button.onclick = () => {
    pay_souls(1000)
    player.aura_damage += 5
}

let spell_chain_button  = document.getElementById("improve-spell-chain")! as HTMLButtonElement
spell_chain_button.onclick = () => {
    pay_souls(1000)
    player.spell_chain += 2
}
let spell_damage_button  = document.getElementById("improve-spell-damage")! as HTMLButtonElement

spell_damage_button.onclick = () => {
    pay_souls(1000)
    player.spell_damage += 10
}

let blink_damage_button  = document.getElementById("improve-blink-damage")! as HTMLButtonElement
blink_damage_button.onclick = () => {
    pay_souls(10000)
    player.blink_explosion_damage += 500
}


let blink_radius_button  = document.getElementById("improve-blink-radius")! as HTMLButtonElement
blink_radius_button.onclick = () => {
    pay_souls(10000)
    player.blink_explosion_radius += 10
}

let breach_radius_button = document.getElementById("increase-breach-radius")! as HTMLButtonElement
breach_radius_button.onclick = () => {
    pay_souls(3000)
    player.breach_radius += 25
}

let breach_waves_button = document.getElementById("increase-breach-waves")! as HTMLButtonElement
breach_waves_button.onclick = () => {
    pay_souls(3000)
    player.breach_waves += 1
}

let breach_tier_button = document.getElementById("increase-souls-quality")! as HTMLButtonElement
breach_tier_button.onclick = () => {
    pay_souls(5000)
    player.souls_quality += 1
}


function new_object(wd: WorldDescription, x:number, y:number, w:number, h:number, texture: TEXTURE_INDEX): GameObjectReference {
    let chunk = get_chunk_index(wd, x, y)
    for (let i = 0; i < world[chunk].game_objects.length; i++) {
        let object = world[chunk].game_objects[i]
        if (object.hidden) {
            object.x = x
            object.y = y
            object.dx = 0
            object.dy = 0
            object.w = w
            object.h = h
            object.texture_id = texture
            object.hidden = false
            return {
                chunk: chunk,
                index: i
            }
        }
    }

    world[chunk].game_objects.push({x : x, y : y, w : w, h: h, dx: 0, dy: 0, hidden: false, texture_id: texture})
    return {
        chunk: chunk,
        index: world[chunk].game_objects.length - 1
    }
}

function create_enemy(x, y, w, h, target_x, target_y, speed) {
    let ref = new_object(world_description, x, y, w, h, 1 + Math.floor(Math.random() * 6))
    world[ref.chunk].enemies.push({
        hp: 500,
        max_hp: 500,
        index: ref,
        dead: false,
        target_x: target_x,
        target_y: target_y,
        destroy_on_reaching_target: true,
        speed: speed,
        uid: g_uid(world_description)
    })
    return {
        chunk: ref.chunk,
        index: world[ref.chunk].enemies.length - 1
    }
}

function change_hp(creation: Creation, x: number) {
    creation.hp += x
    if (creation.hp <= 0) {
        creation.dead = true
        get_object(world, creation.index).hidden = true;
        change_souls(30 * player.souls_quality)
        rampage += 1
    }
}


loan_souls(10000)
change_souls(-5000)

function closest_enemy_to_point(x: number, y: number, ignored: Record<number, boolean>, max_radius: number) {
    let min_distance = max_radius
    let closest: GameObject|null = null

    let center = get_chunk(world_description, x, y)
    let window_size = max_radius * 2 / world_description.chunk_size;

    for_chunks_in_radius(world, world_description, window_size, center[0], center[1], (chunk) => {
        for (const enemy of chunk.enemies) {
            const object = get_object(world, enemy.index)

            if (enemy.dead) continue;
            if (ignored[enemy.uid]) continue;

            let dist = Math.abs(x - object.x) + Math.abs(y - object.y)

            if (dist < min_distance) {
                min_distance = dist
                closest = object
            }
        }
    })

    return closest as GameObject|null
}

function blink() {
    if (player.blink_cooldown > 0) return
    pay_souls(500)

    let closest = closest_enemy_to_point(player_object.x, player_object.y, [], 1000)
    if (closest == null) return

    player_object.x = closest.x;
    player_object.y = closest.y;

    let explosion: Explosion = {
        inner_radius: 0,
        outer_radius: 10,
        max_radius: player.blink_explosion_radius,
        damage: player.blink_explosion_damage,
        x: closest.x,
        y: closest.y,
        prev_inner_radius: 0,
        uid: g_uid(world_description),
        multiplier: 1
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

    let player_chunk = get_chunk(world_description, player_object.x, player_object.y)

    for_chunks_in_radius(world, world_description, aura_range() * 2 / world_description.chunk_size + 1, player_chunk[0], player_chunk[1], (chunk, x, y) => {
        for (const item of chunk.enemies) {
            const object = get_object(world, item.index)

            if (item.dead) continue;

            let dx = player_object.x - object.x;
            let dy = player_object.y - object.y;
            let dist = dx * dx + dy * dy

            if (dist < aura_range() * aura_range()) {
                change_hp(item, -player.aura_damage)
            }
        }
    })

}

function projectiles_update() {

    for(let i = 0; i < projectiles.length; i++) {
        let projectile = projectiles[i]
        if (projectile.dead) continue;
        let a = get_object(world, projectile.index)
        let chunk_coord = get_chunk(world_description, a.x, a.y)

        for_chunks_in_radius(world, world_description, 100 / world_description.chunk_size + 1, chunk_coord[0], chunk_coord[1], (chunk, x, y) => {
            if (chunk == undefined) {
                console.log(x, y)
                console.log(a)
            }
            for (let j = 0; j < chunk.enemies.length; j++) {
                let enemy = chunk.enemies[j]
                if (enemy.dead) continue;
                if (projectile.shot_indices[enemy.uid]) continue;

                let b = get_object(world, enemy.index)

                if (a.x + a.w < b.x - b.w) continue;
                if (a.x - a.w > b.x + b.w) continue;
                if (a.y + a.h < b.y - b.h) continue;
                if (a.y - a.h > b.y + b.h) continue;

                change_hp(enemy, -projectile.damage)

                if (projectile.chained_times >= player.spell_chain) {
                    projectile.dead = true
                    a.hidden = true
                } else {
                    projectile.shot_indices[enemy.uid] = true
                    projectile.chained_times += 1
                    direct_spell_toward_closest_enemy(projectile)
                }
            }
        })
    }
}


function update_boss(timer: number) {
    let reset_flag = false
    for (let item of bosses) {
        let boss_object = get_object(world, item.index_body)

        let boss_entity = world[item.enemy.chunk].enemies[item.enemy.index]

        if (boss_entity == undefined || boss_entity.dead) {
            item.phase = -1
            continue
        }

        while (item.adds.length < 30) {
            let index = create_enemy(boss_object.x + 50, boss_object.y + 50, 20, 20, boss_object.x, boss_object.y, 3)
            world[index.chunk].enemies[index.index].destroy_on_reaching_target = false
            item.adds.push(index)
        }

        let to_remove: number[] = []

        for (let i = 0; i < 30; i++) {
            let ref = item.adds[i]
            let add = world[ref.chunk].enemies[ref.index]
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

function clear_enemies(chunk: ChunkData) {
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
    // clear_enemies();
    clear_explosions();

    for (let item of explosions) {
        if (item.damage <= 0) break;

        let item_chunk = get_chunk(world_description, item.x, item.y)

        //check closest chunks
        for_chunks_in_radius(world, world_description, (item.outer_radius * 1.4) / world_description.chunk_size + 2, item_chunk[0], item_chunk[1], (chunk) => {
            for (let enemy of chunk.enemies) {
                if (enemy.dead) continue;

                let b = get_object(world, enemy.index)

                let rsquare = (b.x - item.x) * (b.x - item.x) + (b.y - item.y) * (b.y - item.y)

                // if (rsquare < item.prev_inner_radius * item.prev_inner_radius - 40) continue
                if (rsquare > item.outer_radius * item.outer_radius + 20) continue

                change_hp(enemy, -item.damage * item.multiplier)

                if (enemy.dead) {
                    if (Math.sqrt(rsquare) < 0.0000005 * item.outer_radius * Math.log(item.damage + 1) * item.max_radius) {
                        item.multiplier += 1
                    } else {
                        let explosion: Explosion = {
                            inner_radius: 0,
                            outer_radius: 0,
                            prev_inner_radius: 0,
                            max_radius: item.max_radius * 0.5,
                            damage: player.blink_explosion_damage,
                            x: b.x,
                            y: b.y,
                            uid: g_uid(world_description),
                            multiplier: 1
                        }
                        explosions.push(explosion)
                    }
                }
            }
        })

        for_chunks_in_radius(world, world_description, (item.outer_radius + BREACH_SIZE * 2) / world_description.chunk_size + 1, item_chunk[0], item_chunk[1], (chunk) => {
            for (let breach of chunk.breaches) {
                if (breach.radius != 0) continue
                let b = get_object(world, breach.index)
                let rsquare = (b.x - item.x) * (b.x - item.x) + (b.y - item.y) * (b.y - item.y);
                if (rsquare > (item.outer_radius + BREACH_SIZE) * (item.outer_radius + BREACH_SIZE)) continue;
                open_breach(breach)
            }
        })

        item.prev_inner_radius = item.inner_radius
    }
}

function breach_cost() {
    return 1000 * player.breach_waves + player.breach_radius
}


function open_breach(item: Breach) {
    let a = get_object(world, item.index)
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

            if (a.x + x <= 0) continue
            if (a.y + y <= 0) continue
            if (a.x + x >= world_true_size) continue
            if (a.y + y >= world_true_size) continue

            create_enemy(a.x + x, a.y + y, 10 + Math.random() * 10, 5 + Math.random() * 10, a.x, a.y, 0.20)
        }
    }
}

function open_breaches() {
    let b = player_object
    let chunk_coord = get_chunk(world_description, player_object.x, player_object.y)
    for_chunks_in_radius(world, world_description, player.breach_radius * 2 + 20, chunk_coord[0], chunk_coord[1], (chunk) => {
        for (let item of chunk.breaches) {
            if (item.radius > 0) continue;
            let a = get_object(world, item.index)
            if ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) < player.breach_radius * player.breach_radius) {
                open_breach(item)
            }
        }
    });
}

function direct_spell_toward_closest_enemy(item : Spell) {
    let object = get_object(world, item.index)
    let x = object.x
    let y = object.y
    let ignored = item.shot_indices
    let closest = closest_enemy_to_point(x, y, ignored, player.spell_range * 1.2)

    if (closest == null) {
        item.dead = true
        return
    }

    let dx = closest.x - x
    let dy = closest.y - y

    let norm = Math.sqrt(dx * dx + dy * dy)

    if (norm > 0.01) {
        object.dx = dx / norm * 0.1
        object.dy = dy / norm * 0.1
    } else {
        object.dx = 1
        object.dy = 0
    }
}


// finds the closest enemy and shoots toward them
function shoot_from_position(x, y) {
    if (player.spell_cooldown > 0) {
        return
    }
    if (souls < 1) return;
    let closest = closest_enemy_to_point(x, y, {}, player.spell_range * 1.2)
    if (closest == null) return;

    let id = new_object(world_description, x, y, 5, 5, TEXTURE_INDEX.BASIC_SPELL)
    let item: Spell = {
        index: id,
        damage: player.spell_damage,
        dead: false,
        time_left: player.spell_range * 100,
        chained_times: 0,
        shot_indices: [],
        uid: g_uid(world_description)
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
    textures[TEXTURE_INDEX.BASIC_SPELL] = loadTexture(gl, "flame.svg")

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
        }
        payment_timer.innerHTML = Math.floor((banking_season_length - current_season) / 1000).toString()


        // console.log(enemies)
        // console.log(game_objects)

        for (let item of explosions) {
            let inner_ratio = 1 - Math.min(item.damage / player.blink_explosion_damage, 1)
            inner_ratio = inner_ratio * inner_ratio * inner_ratio

            if (inner_ratio > 0.999)  {
                item.damage = 0
                continue
            }

            item.outer_radius += 0.01 * elapsed * item.max_radius
            item.inner_radius = inner_ratio * item.outer_radius

            item.damage *= Math.exp(-elapsed * 0.01)
        }

        rampage *= Math.exp(- elapsed * 0.01)
        rampage = Math.max(0, rampage)

        while (tick_time > expected_update_tick) {
            tick_time -= expected_update_tick
            update_game_state(t)
        }

        for (let item of bosses) {
            let body = get_object(world, item.index_body)
            let flame = get_object(world, item.index_flame)

            flame.y = 10 + Math.sin(t / 200) * 10 + body.y
        }

        player.spell_cooldown = Math.max(0, player.spell_cooldown - elapsed)
        player.blink_cooldown = Math.max(0, player.blink_cooldown - elapsed)

        camera_x = camera_x + (player_object.x - camera_x) * 0.5
        camera_y = camera_y + (player_object.y - camera_y) * 0.5

        shoot_from_position(player_object.x, player_object.y)

        for (let item of projectiles) {
            if (item.dead) continue
            item.time_left -= elapsed
            if (item.time_left < 0) {
                item.dead = true
                get_object(world, item.index).hidden = true
            }
        }

        let player_chunk = get_chunk(world_description, player_object.x, player_object.y)

        for_chunks_in_radius(world, world_description, 4000 / world_description.chunk_size + 1, player_chunk[0], player_chunk[1], (chunk) => {
            for (let item of chunk.enemies) {
                if(item.dead) continue
                let object = get_object(world, item.index)
                let dx = item.target_x - object.x
                let dy = item.target_y - object.y
                let n = Math.sqrt(dx * dx + dy * dy) / item.speed
                if ((n < 75) && item.destroy_on_reaching_target) {
                    item.dead = true
                    object.hidden = true
                }
                if (n > 20) {
                    object.x += (Math.random() - 0.5 + dx / n) * elapsed * 0.1
                    object.y += (Math.random() - 0.5 + dy / n) * elapsed * 0.1
                }
            }
        })

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

        let p_chunk = get_chunk(world_description, player_object.x, player.object.y)
        for_chunks_in_radius(world, world_description, 10, p_chunk[0], p_chunk[1], (chunk) => {
            for (let j = 0; j < chunk.game_objects.length; j++) {
                let item = chunk.game_objects[j]
                item.x += item.dx * elapsed;
                item.y += item.dy * elapsed;

                item.x = Math.max(item.x, 0)
                item.y = Math.max(item.y, 0)

                item.x = Math.min(item.x, world_true_size)
                item.y = Math.min(item.y, world_true_size)
            }
        })

        player_object.x += player_object.dx * elapsed;
        player_object.y += player_object.dy * elapsed;


        drawScene(
            gl, programInfo, programAuraInfo, buffers,
            world_description, world, explosions, bosses, player, aura_range(),
            camera_x, camera_y, t,
            1 + Math.min(200, 0.01 * rampage) * 2 + Math.sqrt(Math.min(20, 0.01 * rampage)) * Math.sin(t / 10000) * 0.01,
            textures
        )


        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

main();