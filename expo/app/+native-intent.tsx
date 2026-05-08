export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  if (path && path.startsWith("/task/")) return path;
  if (path === "/new-task") return path;
  return "/";
}
