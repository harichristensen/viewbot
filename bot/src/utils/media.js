const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const ffprobe = promisify(require('fluent-ffmpeg').ffprobe);
const sharp = require('sharp');
const logger = require('./logger');

class MediaUtils {
  constructor() {
    this.supportedVideoFormats = ['.mp4', '.avi', '.mov', '.webm', '.mkv'];
    this.supportedImageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  }

  /**
   * Select a random media file from the bot media directory
   */
  async selectRandomMedia(mediaDir) {
    try {
      // Check if media directory exists
      try {
        await fs.access(mediaDir, fs.constants.R_OK);
      } catch (error) {
        throw new Error(`Media directory does not exist or is not readable: ${mediaDir}`);
      }

      // Get all subdirectories
      const subdirs = await fs.readdir(mediaDir);
      if (subdirs.length === 0) {
        throw new Error(`Media directory is empty: ${mediaDir}`);
      }
      
      const mediaFiles = [];

      // Scan each subdirectory
      for (const subdir of subdirs) {
        const subdirPath = path.join(mediaDir, subdir);
        let stat;
        try {
          stat = await fs.stat(subdirPath);
        } catch (error) {
          logger.warn(`Unable to access ${subdirPath}: ${error.message}`);
          continue;
        }
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(subdirPath);
          
          for (const file of files) {
            const filePath = path.join(subdirPath, file);
            const fileExt = path.extname(file).toLowerCase();
            
            // Check if file is supported media
            if (this.isSupportedMedia(fileExt)) {
              mediaFiles.push({
                filename: file,
                path: filePath,
                type: this.getMediaType(fileExt),
                extension: fileExt
              });
            }
          }
        }
      }

      if (mediaFiles.length === 0) {
        throw new Error(`No supported media files found in bot media directory: ${mediaDir}. Supported formats: ${[...this.supportedVideoFormats, ...this.supportedImageFormats].join(', ')}`);
      }

      // Select random file
      const randomIndex = Math.floor(Math.random() * mediaFiles.length);
      return mediaFiles[randomIndex];
    } catch (error) {
      logger.error('Failed to select random media:', error);
      throw error;
    }
  }

  /**
   * Check if file extension is supported
   */
  isSupportedMedia(extension) {
    return this.supportedVideoFormats.includes(extension) || 
           this.supportedImageFormats.includes(extension);
  }

  /**
   * Get media type from extension
   */
  getMediaType(extension) {
    if (this.supportedVideoFormats.includes(extension)) {
      return 'video';
    }
    if (this.supportedImageFormats.includes(extension)) {
      return 'image';
    }
    return 'unknown';
  }

  /**
   * Get content type from extension
   */
  getContentType(extension) {
    const contentTypes = {
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    return contentTypes[extension] || 'application/octet-stream';
  }

  /**
   * Get media metadata
   */
  async getMediaMetadata(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const type = this.getMediaType(extension);
    const contentType = this.getContentType(extension);

    const metadata = {
      type,
      contentType,
      extension,
      size: 0,
      duration: null,
      width: null,
      height: null,
      thumbnailUrl: null
    };

    try {
      const stats = await fs.stat(filePath);
      metadata.size = stats.size;

      if (type === 'video') {
        // Get video metadata using ffprobe
        try {
          const data = await ffprobe(filePath);
          
          // Get video stream
          const videoStream = data.streams.find(s => s.codec_type === 'video');
          if (videoStream) {
            metadata.width = videoStream.width;
            metadata.height = videoStream.height;
            metadata.duration = Math.floor(parseFloat(data.format.duration));
          }
        } catch (error) {
          logger.warn(`Failed to get video metadata for ${filePath}:`, error.message);
        }
      } else if (type === 'image') {
        // Get image metadata using sharp
        try {
          const imageMetadata = await sharp(filePath).metadata();
          metadata.width = imageMetadata.width;
          metadata.height = imageMetadata.height;
        } catch (error) {
          logger.warn(`Failed to get image metadata for ${filePath}:`, error.message);
        }
      }
    } catch (error) {
      logger.error(`Failed to get metadata for ${filePath}:`, error);
    }

    return metadata;
  }

  /**
   * Generate a thumbnail for video
   */
  async generateVideoThumbnail(videoPath, outputPath) {
    const ffmpeg = require('fluent-ffmpeg');
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['10%'], // Take screenshot at 10% of video duration
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '320x240'
        })
        .on('end', () => {
          logger.info(`Thumbnail generated: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Failed to generate thumbnail:', err);
          reject(err);
        });
    });
  }

  /**
   * Optimize image for upload
   */
  async optimizeImage(imagePath, maxWidth = 1920, maxHeight = 1080) {
    try {
      const outputPath = path.join(
        path.dirname(imagePath),
        `optimized_${path.basename(imagePath)}`
      );

      await sharp(imagePath)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(outputPath);

      logger.info(`Image optimized: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('Failed to optimize image:', error);
      throw error;
    }
  }

  /**
   * Get media files by type
   */
  async getMediaFilesByType(mediaDir, mediaType) {
    const extensions = mediaType === 'video' ? 
      this.supportedVideoFormats : 
      this.supportedImageFormats;

    const mediaFiles = [];

    try {
      const subdirs = await fs.readdir(mediaDir);

      for (const subdir of subdirs) {
        const subdirPath = path.join(mediaDir, subdir);
        const stat = await fs.stat(subdirPath);

        if (stat.isDirectory()) {
          const files = await fs.readdir(subdirPath);

          for (const file of files) {
            const fileExt = path.extname(file).toLowerCase();
            
            if (extensions.includes(fileExt)) {
              mediaFiles.push({
                filename: file,
                path: path.join(subdirPath, file),
                type: mediaType,
                extension: fileExt
              });
            }
          }
        }
      }

      return mediaFiles;
    } catch (error) {
      logger.error(`Failed to get ${mediaType} files:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const mediaUtils = new MediaUtils();

// Export individual functions
module.exports = {
  selectRandomMedia: (mediaDir) => mediaUtils.selectRandomMedia(mediaDir),
  getMediaMetadata: (filePath) => mediaUtils.getMediaMetadata(filePath),
  generateVideoThumbnail: (videoPath, outputPath) => mediaUtils.generateVideoThumbnail(videoPath, outputPath),
  optimizeImage: (imagePath, maxWidth, maxHeight) => mediaUtils.optimizeImage(imagePath, maxWidth, maxHeight),
  getMediaFilesByType: (mediaDir, mediaType) => mediaUtils.getMediaFilesByType(mediaDir, mediaType),
  getContentType: (extension) => mediaUtils.getContentType(extension)
};