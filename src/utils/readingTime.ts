export function getReadingTime(content: string | undefined): string {
  const words = (content ?? '').trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}
