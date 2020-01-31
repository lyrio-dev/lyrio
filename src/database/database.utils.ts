export function escapeLike(str: string) {
  return str
    .split("\\")
    .join("\\\\")
    .split("_")
    .join("\\_")
    .split("%")
    .join("\\%");
}
