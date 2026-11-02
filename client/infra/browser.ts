export const isDesktopLinux = (): boolean => {
  const userAgent = navigator.userAgent ?? '';
  return /Linux/.test(userAgent) && !/Android/.test(userAgent);
};
