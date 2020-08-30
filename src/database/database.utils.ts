export function escapeLike(str: string): string {
  return str.split("\\").join("\\\\").split("_").join("\\_").split("%").join("\\%");
}
