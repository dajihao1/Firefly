const DEFAULT_PUBLIC_TITLE_LENGTH = 10;

export function getPublicPostTitle(
	title: string,
	shouldMask = false,
	maxLength = DEFAULT_PUBLIC_TITLE_LENGTH,
): string {
	if (!shouldMask) return title;
	if (!title || title.length <= maxLength) return title;
	return `${title.slice(0, maxLength)}...`;
}
