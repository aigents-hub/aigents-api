import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MinioService } from './minio.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly bucket = process.env.MINIO_BUCKET_IMAGE || 'automobiles';

  constructor(private readonly minio: MinioService) {}

  /** Sube un buffer como imagen bajo el path `automobileId/fileName` */
  async uploadImage(
    automobileId: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<string> {
    // 1) Asegurarse de que exista el bucket
    const exists = await this.minio
      .bucketExists(this.bucket)
      .catch(() => false);
    if (!exists) {
      await this.minio.makeBucket(this.bucket);
      this.logger.log(`Bucket ${this.bucket} creado.`);
    }

    // 2) Generar objectName
    const objectName = `${automobileId}/${fileName}`;
    await this.minio.create(this.bucket, objectName, buffer);
    this.logger.log(`Imagen subida como ${objectName}`);
    return objectName;
  }

  /** Descarga la imagen como Buffer */
  async getImage(automobileId: string, fileName: string): Promise<Buffer> {
    const objectName = `${automobileId}/${fileName}`;
    const exists = await this.minio.exists(this.bucket, objectName);
    if (!exists) {
      throw new NotFoundException(`Imagen no encontrada: ${objectName}`);
    }
    return this.minio.get(this.bucket, objectName);
  }
}
