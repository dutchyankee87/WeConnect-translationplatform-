import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export interface UploadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

export class FileUpload {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  async ensureUploadDir(): Promise<void> {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }

  async saveUploadedFile(file: File, subDir?: string): Promise<UploadResult> {
    try {
      await this.ensureUploadDir();

      // Create subdirectory if specified
      const targetDir = subDir ? path.join(this.uploadDir, subDir) : this.uploadDir;
      if (!existsSync(targetDir)) {
        await mkdir(targetDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = path.join(targetDir, fileName);

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      return {
        success: true,
        filePath,
        fileName: file.name,
        fileSize: file.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file',
      };
    }
  }

  async handleFormDataUpload(request: NextRequest): Promise<{
    file?: UploadResult;
    formData: { [key: string]: string };
  }> {
    const formData = await request.formData();
    const result: { file?: UploadResult; formData: { [key: string]: string } } = {
      formData: {},
    };

    // Extract form fields
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (key === 'file') {
          result.file = await this.saveUploadedFile(value, 'jobs');
        }
      } else {
        result.formData[key] = value.toString();
      }
    }

    return result;
  }

  getFilePath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }

  validateFileType(fileName: string, allowedExtensions: string[]): boolean {
    const extension = path.extname(fileName).toLowerCase();
    return allowedExtensions.includes(extension);
  }

  validateFileSize(fileSize: number, maxSizeBytes: number): boolean {
    return fileSize <= maxSizeBytes;
  }
}

export const fileUpload = new FileUpload();