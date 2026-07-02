const DEFAULT_PUBLIC_TITLE_LENGTH = 10;
const DEFAULT_PROTECTED_POST_PASSWORD = "82281228";

type PasswordProtectedPostMeta = {
	password?: string;
	passwordProtected?: boolean;
};

export function isPasswordProtectedPost(data: PasswordProtectedPostMeta): boolean {
	return data.passwordProtected === true || !!data.password;
}

export function getProtectedPostPassword(data: PasswordProtectedPostMeta): string {
	if (!isPasswordProtectedPost(data)) return "";
	return data.password || DEFAULT_PROTECTED_POST_PASSWORD;
}

export function getPublicPostTitle(
	title: string,
	shouldMask = false,
	maxLength = DEFAULT_PUBLIC_TITLE_LENGTH,
): string {
	if (!shouldMask) return title;
	if (!title || title.length <= maxLength) return title;
	return `${title.slice(0, maxLength)}...`;
}
