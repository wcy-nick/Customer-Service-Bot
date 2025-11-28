/**
 * Windows路径名净化工具函数
 * 处理Windows文件系统中的非法字符和路径格式问题
 */

/**
 * 净化Windows路径名
 * 移除或替换Windows文件系统中不允许的字符
 * @param path 原始路径名
 * @param replacement 替换字符，默认为下划线
 * @returns 净化后的安全路径名
 */
export function sanitizeWindowsPath(
  path: string,
  replacement: string = "_"
): string {
  if (!path) return "";

  // Windows文件系统中不允许的字符：< > : " / \ | ? *
  const illegalCharsRegex = /[<>:"/\\|?*]/g;

  // 替换非法字符
  let sanitized = path.replace(illegalCharsRegex, replacement);

  // 移除控制字符
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, replacement);

  // 处理保留文件名（CON, PRN, AUX, NUL等）
  const reservedNames = [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
  ];

  // 分割路径处理每个部分
  const pathParts = sanitized.split(/[\\/]/);
  const sanitizedParts = pathParts.map((part) => {
    // 检查是否是保留名称（忽略扩展名）
    const baseName = part.split(".")[0].toUpperCase();
    if (reservedNames.includes(baseName)) {
      return part + replacement;
    }
    return part;
  });

  // 重新组合路径，使用统一的分隔符
  sanitized = sanitizedParts.join("\\");

  // 移除末尾的点和空格（Windows不允许文件名以点或空格结尾）
  sanitized = sanitized.replace(/[. ]+$/, replacement);

  // 确保路径不为空
  if (sanitized.trim() === "") {
    sanitized = replacement;
  }

  return sanitized;
}

export function normalizeWindowsPathSeparators(path: string): string {
  return path.replace(/\//g, "\\");
}

export function processWindowsPath(path: string): string {
  let result = sanitizeWindowsPath(path);
  result = normalizeWindowsPathSeparators(result);
  return result;
}
