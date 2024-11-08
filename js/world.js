export function get_chunk(w, x, y) {
    return [Math.floor(x / w.chunk_size), Math.floor(y / w.chunk_size)];
}
export function get_chunk_index(w, x, y) {
    return Math.floor(x / w.chunk_size) * w.size_in_chunks + Math.floor(y / w.chunk_size);
}
export function coord_to_index(w, a) {
    return a[0] * w.size_in_chunks + a[1];
}
