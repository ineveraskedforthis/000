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

    index: number,
    cast_speed: number
}

export interface ResetArea {
    x: number,
    y: number

    radius: number
    inner_radius: number
}

export interface DungeonMaster {
    phase: number

    index_body: number
    index_flame: number
    enemy: number

    adds: number[]
    areas: ResetArea[]
}

export interface ControlState {
    left_pressed: boolean
    right_pressed: boolean
    up_pressed: boolean
    down_pressed: boolean
}

export interface Creation {
    hp: number
    index: number
    dead: boolean
    target_x: number
    target_y: number

    speed: number

    destroy_on_reaching_target: boolean
}

export interface Spell {
    index: number

    damage: number
    time_left: number
    dead: boolean
    chained_times: number
    shot_indices: Record<number, boolean>
}

export interface Explosion {
    damage: number
    inner_radius: number
    outer_radius: number
    x: number
    y: number
}

export interface Breach {
    index: number
    radius: number
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
