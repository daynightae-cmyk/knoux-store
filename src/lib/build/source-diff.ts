/** Find the changed line range without building a quadratic edit matrix. */
export function changedLineRange(before: string, after: string) {
  const first = before.split('\n');
  const second = after.split('\n');
  const shortest = Math.min(first.length, second.length);
  let prefix = 0;
  while (prefix < shortest && first[prefix] === second[prefix]) prefix++;
  let suffix = 0;
  while (suffix < shortest - prefix && first[first.length - suffix - 1] === second[second.length - suffix - 1]) suffix++;
  return {
    startLine: prefix + 1,
    before: first.slice(prefix, first.length - suffix).join('\n'),
    after: second.slice(prefix, second.length - suffix).join('\n'),
  };
}
