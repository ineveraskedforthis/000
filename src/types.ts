import { BIOME, NPC_CORE, TEXTURE_INDEX } from "./enums.js"

export interface Mage {
    spell_chain: number,
    spell_damage: number,
    spell_range: number
    spell_cooldown: number,

    blink_explosion_radius: number
    blink_explosion_damage: number
    blink_cooldown: number

    aura_damage: number,
    aura_range: number
    aura_active: boolean

    object: GameObject,
    cast_speed: number,

    breach_radius_level: number
    breach_waves: number

    souls_quality: number
}

export interface UIDEnrichedObject {
    uid: number
}

export interface NPC {
    reputation: number,
    souls: number,
    x: number, y: number,
    w: number, h: number,
    texture: TEXTURE_INDEX,
    core: NPC_CORE,
}

export interface Upgrade {
    base_price_souls: number,
    base_price_cores: number,
    price_increase_per_level: number,
}

export interface ResetArea {
    x: number,
    y: number

    radius: number
    inner_radius: number
}

export interface DungeonMaster extends UIDEnrichedObject {
    phase: number

    index_body: GameObjectReference
    index_flame: GameObjectReference
    enemy: EnemyReference

    adds: EnemyReference[]
    areas: ResetArea[]
}

export interface ControlState {
    left_pressed: boolean
    right_pressed: boolean
    up_pressed: boolean
    down_pressed: boolean
    aura_pressed: boolean
}

export interface Creation extends UIDEnrichedObject {
    hp: number
    max_hp: number

    index: GameObjectReference
    dead: boolean
    target_x: number
    target_y: number

    speed: number

    destroy_on_reaching_target: boolean
}

export interface Spell extends UIDEnrichedObject {
    index: GameObjectReference

    damage: number
    time_left: number
    dead: boolean
    chained_times: number
    shot_indices: Record<number, boolean>
}

export interface Explosion extends UIDEnrichedObject {
    damage: number
    max_radius: number
    inner_radius: number
    outer_radius: number

    multiplier: number

    prev_inner_radius: number
    x: number
    y: number
}

export interface Breach extends UIDEnrichedObject {
    index: GameObjectReference
    radius: number
}

export interface GameObjectReference {
    index: number,
    chunk: number
}

export interface EnemyReference {
    index: number,
    chunk: number
}

export interface GameObject {
    x: number
    y: number
    w: number
    h: number
    dx: number
    dy: number
    texture_id: number
    hidden: boolean
}

export interface ChunkData {
    biome: BIOME
    breaches: Breach[]
    passive_objects: GameObject[]
    game_objects: GameObject[]
    enemies: Creation[]
}

export interface WorldDescription {
    size_in_chunks: number
    chunk_size: number,
    unused_uid: number,
}