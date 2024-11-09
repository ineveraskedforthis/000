import { ChunkData, GameObjectReference, WorldDescription } from "./types.js"

export function get_chunk(w: WorldDescription, x: number, y: number): [number, number] {
    return [Math.floor(x / w.chunk_size), Math.floor(y / w.chunk_size)]
}

export function get_chunk_index(w: WorldDescription, x: number, y: number): number {
    return Math.floor(x / w.chunk_size) * w.size_in_chunks + Math.floor(y / w.chunk_size)
}

export function coord_to_index(w: WorldDescription, a: [number, number]) {
    return a[0] * w.size_in_chunks + a[1]
}

export function get_object(world: ChunkData[], ref: GameObjectReference) {
    return world[ref.chunk].game_objects[ref.index]
}

export function g_uid(w: WorldDescription) {
    w.unused_uid += 1
    return w.unused_uid
}

export function for_chunks_in_radius(
    world: ChunkData[], desc: WorldDescription,
    radius: number, center_x: number, center_y: number,
    action: (chunk: ChunkData, x: number, y: number) => void,
) {
    let int_radius = Math.floor(radius)
    for (let i = -int_radius; i <= int_radius; i++) {
        for (let j = -int_radius; j <= int_radius; j++) {
            let x = i + center_x
            let y = j + center_y

            if (x <= 0) continue;
            if (y <= 0) continue;
            if (x >= desc.size_in_chunks) continue;
            if (y >= desc.size_in_chunks) continue;
            action(world[coord_to_index(desc, [x, y])], x, y)
        }
    }
}