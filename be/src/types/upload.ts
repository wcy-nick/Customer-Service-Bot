// 文件上传相关的数据类型定义

// 通用文件上传响应
export interface FileUploadResponse {
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}
