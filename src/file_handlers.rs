use crate::models::{DirectoryListing, FileInfo, UploadResponse};
use axum::{
    body::Body,
    extract::{Multipart, Path, Query},
    http::{header, StatusCode},
    response::{Json, Response},
};
use serde::Deserialize;
use std::path::{Path as StdPath, PathBuf};
use tokio::fs;
use tokio_util::io::ReaderStream;
use tracing::{error, info};

#[derive(Deserialize)]
pub struct FileQuery {
    pub path: Option<String>,
}

// 获取文件列表
pub async fn list_files_handler(
    Query(query): Query<FileQuery>,
) -> Result<Json<DirectoryListing>, StatusCode> {
    // 默认根目录，生产环境中应该限制在特定目录
    let base_path = std::env::var("FILE_STORAGE_PATH").unwrap_or_else(|_| "/home/xianyu/uploads".to_string());
    let requested_path = query.path.unwrap_or_else(|| ".".to_string());
    
    // 构建完整路径并确保安全性
    let full_path = PathBuf::from(&base_path).join(&requested_path);
    let full_path = match full_path.canonicalize() {
        Ok(p) => p,
        Err(_) => return Err(StatusCode::NOT_FOUND),
    };
    
    // 确保路径在允许的基础路径内
    if !full_path.starts_with(&base_path) {
        return Err(StatusCode::FORBIDDEN);
    }
    
    // 读取目录
    let mut entries = match fs::read_dir(&full_path).await {
        Ok(e) => e,
        Err(_) => return Err(StatusCode::NOT_FOUND),
    };
    
    let mut files = Vec::new();
    
    while let Ok(Some(entry)) = entries.next_entry().await {
        let metadata = match entry.metadata().await {
            Ok(m) => m,
            Err(_) => continue,
        };
        
        let name = entry.file_name().to_string_lossy().to_string();
        let path = entry.path().to_string_lossy().to_string();
        
        // 获取修改时间
        let modified = metadata.modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        
        // 获取权限（Unix-like系统）
        #[cfg(unix)]
        let permissions = {
            use std::os::unix::fs::PermissionsExt;
            format!("{:o}", metadata.permissions().mode() & 0o777)
        };
        #[cfg(not(unix))]
        let permissions = "---".to_string();
        
        files.push(FileInfo {
            name,
            path: path.strip_prefix(&base_path).unwrap_or(&path).to_string(),
            size: metadata.len(),
            is_dir: metadata.is_dir(),
            is_file: metadata.is_file(),
            is_symlink: metadata.is_symlink(),
            modified,
            permissions,
            owner: None,
            group: None,
        });
    }
    
    // 排序：目录在前，然后按名称排序
    files.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    
    // 计算父目录路径
    let parent = if full_path != StdPath::new(&base_path) {
        full_path.parent()
            .and_then(|p| p.strip_prefix(&base_path).ok())
            .map(|p| p.to_string_lossy().to_string())
    } else {
        None
    };
    
    Ok(Json(DirectoryListing {
        path: full_path.strip_prefix(&base_path)
            .unwrap_or(&full_path)
            .to_string_lossy()
            .to_string(),
        parent,
        files,
    }))
}

// 文件上传
pub async fn upload_file_handler(
    Query(query): Query<FileQuery>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, StatusCode> {
    let base_path = std::env::var("FILE_STORAGE_PATH").unwrap_or_else(|_| "/home/xianyu/uploads".to_string());
    let upload_dir = query.path.unwrap_or_else(|| ".".to_string());
    
    // 确保上传目录存在
    let target_dir = PathBuf::from(&base_path).join(&upload_dir);
    if let Err(e) = fs::create_dir_all(&target_dir).await {
        error!("Failed to create upload directory: {}", e);
        return Ok(Json(UploadResponse {
            success: false,
            message: format!("Failed to create upload directory: {}", e),
            file_path: None,
        }));
    }
    
    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        let _name = field.name().unwrap_or("file").to_string();
        let file_name = field.file_name()
            .map(|n| n.to_string())
            .unwrap_or_else(|| format!("unnamed_{}", chrono::Utc::now().timestamp()));
        
        let file_path = target_dir.join(&file_name);
        
        // 安全检查
        match file_path.canonicalize() {
            Ok(p) if !p.starts_with(&base_path) => {
                return Ok(Json(UploadResponse {
                    success: false,
                    message: "Invalid file path".to_string(),
                    file_path: None,
                }));
            }
            _ => {}
        }
        
        // 获取文件数据
        let data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?;
        
        // 写入文件
        match fs::write(&file_path, &data).await {
            Ok(_) => {
                info!("File uploaded successfully: {:?}", file_path);
                return Ok(Json(UploadResponse {
                    success: true,
                    message: format!("File '{}' uploaded successfully", file_name),
                    file_path: Some(file_path.strip_prefix(&base_path)
                        .unwrap_or(&file_path)
                        .to_string_lossy()
                        .to_string()),
                }));
            }
            Err(e) => {
                error!("Failed to save file: {}", e);
                return Ok(Json(UploadResponse {
                    success: false,
                    message: format!("Failed to save file: {}", e),
                    file_path: None,
                }));
            }
        }
    }
    
    Ok(Json(UploadResponse {
        success: false,
        message: "No file received".to_string(),
        file_path: None,
    }))
}

// 文件下载
pub async fn download_file_handler(
    Path(file_path): Path<String>,
) -> Result<Response<Body>, StatusCode> {
    let base_path = std::env::var("FILE_STORAGE_PATH").unwrap_or_else(|_| "/home/xianyu/uploads".to_string());
    let full_path = PathBuf::from(&base_path).join(&file_path);
    
    // 安全检查
    let full_path = match full_path.canonicalize() {
        Ok(p) if p.starts_with(&base_path) => p,
        _ => return Err(StatusCode::FORBIDDEN),
    };
    
    // 检查文件是否存在
    if !full_path.exists() || !full_path.is_file() {
        return Err(StatusCode::NOT_FOUND);
    }
    
    // 获取文件名
    let file_name = full_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("download");
    
    // 读取文件
    let file = match tokio::fs::File::open(&full_path).await {
        Ok(f) => f,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };
    
    // 获取文件大小
    let metadata = match file.metadata().await {
        Ok(m) => m,
        Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };
    
    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);
    
    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/octet-stream")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", file_name),
        )
        .header(header::CONTENT_LENGTH, metadata.len())
        .body(body)
        .unwrap())
}

// 创建目录
#[derive(Deserialize)]
pub struct CreateDirRequest {
    pub path: String,
    pub name: String,
}

pub async fn create_directory_handler(
    Json(req): Json<CreateDirRequest>,
) -> Result<Json<UploadResponse>, StatusCode> {
    let base_path = std::env::var("FILE_STORAGE_PATH").unwrap_or_else(|_| "/home/xianyu/uploads".to_string());
    let dir_path = PathBuf::from(&base_path).join(&req.path).join(&req.name);
    
    // 安全检查
    if !dir_path.starts_with(&base_path) {
        return Ok(Json(UploadResponse {
            success: false,
            message: "Invalid directory path".to_string(),
            file_path: None,
        }));
    }
    
    match fs::create_dir_all(&dir_path).await {
        Ok(_) => Ok(Json(UploadResponse {
            success: true,
            message: format!("Directory '{}' created successfully", req.name),
            file_path: Some(dir_path.strip_prefix(&base_path)
                .unwrap_or(&dir_path)
                .to_string_lossy()
                .to_string()),
        })),
        Err(e) => Ok(Json(UploadResponse {
            success: false,
            message: format!("Failed to create directory: {}", e),
            file_path: None,
        })),
    }
}

// 删除文件或目录
#[derive(Deserialize)]
pub struct DeleteRequest {
    pub path: String,
}

pub async fn delete_file_handler(
    Json(req): Json<DeleteRequest>,
) -> Result<Json<UploadResponse>, StatusCode> {
    let base_path = std::env::var("FILE_STORAGE_PATH").unwrap_or_else(|_| "/home/xianyu/uploads".to_string());
    let file_path = PathBuf::from(&base_path).join(&req.path);
    
    // 安全检查
    let file_path = match file_path.canonicalize() {
        Ok(p) if p.starts_with(&base_path) => p,
        _ => {
            return Ok(Json(UploadResponse {
                success: false,
                message: "Invalid file path".to_string(),
                file_path: None,
            }));
        }
    };
    
    let result = if file_path.is_dir() {
        fs::remove_dir_all(&file_path).await
    } else {
        fs::remove_file(&file_path).await
    };
    
    match result {
        Ok(_) => Ok(Json(UploadResponse {
            success: true,
            message: "File deleted successfully".to_string(),
            file_path: None,
        })),
        Err(e) => Ok(Json(UploadResponse {
            success: false,
            message: format!("Failed to delete file: {}", e),
            file_path: None,
        })),
    }
}