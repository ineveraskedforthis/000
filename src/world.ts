import { WorldDescription } from "./types.js"

export function get_chunk(w: WorldDescription, x: number, y: number): [number, number] {
    return [Math.floor(x / w.chunk_size), Math.floor(y / w.chunk_size)]
}

export function get_chunk_index(w: WorldDescription, x: number, y: number): number {
    return Math.floor(x / w.chunk_size) * w.size_in_chunks + Math.floor(y / w.chunk_size)
}

export function coord_to_index(w: WorldDescription, a: [number, number]) {
    return a[0] * w.size_in_chunks + a[1]
}