/**
 * Image Upload API
 *
 * API functions for uploading images to the server.
 */

import { apiClient } from "../lib/api-client";

export interface UploadImageResponse {
  success: boolean;
  url: string;
  filename: string;
  size: number;
  content_type: string;
}

/**
 * Upload an image file to the server
 *
 * @param file - The image file to upload
 * @returns Upload result with URL and metadata
 * @throws Error if the upload fails
 */
export async function uploadImage(file: File): Promise<UploadImageResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.upload<UploadImageResponse>('/api/images/upload', formData);
}
