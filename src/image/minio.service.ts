import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService {
  private readonly minioClient: Minio.Client;
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL:
        this.configService
          .get<string>('MINIO_USE_SSL', 'false')
          .toLowerCase() === 'true',
      accessKey: this.configService.get<string>('MINIO_ROOT_USER'),
      secretKey: this.configService.get<string>('MINIO_ROOT_PASSWORD'),
    });
  }

  /**
   * Verifica si un objeto existe en el bucket.
   * @param bucketName - Nombre del bucket.
   * @param objectName - Nombre del objeto.
   * @returns Promise<boolean>
   */
  async exists(bucketName: string, objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(bucketName, objectName, {}); // Se pasa un objeto de opciones vacío
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Obtiene un objeto del bucket como Buffer.
   * @param bucketName - Nombre del bucket.
   * @param objectName - Nombre del objeto.
   * @returns Promise<Buffer>
   */
  async get(bucketName: string, objectName: string): Promise<Buffer> {
    const dataStream: Readable = await this.minioClient.getObject(
      bucketName,
      objectName,
    );
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      dataStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      dataStream.on('end', () => resolve(Buffer.concat(chunks)));
      dataStream.on('error', (err) => reject(err));
    });
  }

  /**
   * Crea (sube) un objeto al bucket especificado.
   * @param bucketName - Nombre del bucket.
   * @param objectName - Nombre del objeto.
   * @param buffer - Contenido del objeto en Buffer.
   * @param metaData - Metadatos opcionales para el objeto.
   * @returns Promise<any> (generalmente retorna el etag del objeto)
   */
  async create(
    bucketName: string,
    objectName: string,
    buffer: Buffer,
    metaData: any = {},
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.minioClient.putObject(
        bucketName,
        objectName,
        buffer,
        metaData,
        (err, etag) => {
          if (err) {
            return reject(err);
          }
          resolve(etag);
        },
      );
    });
  }

  // Nuevo método: verifica si existe un bucket
  async bucketExists(bucketName: string): Promise<boolean> {
    const buckets = await this.minioClient.listBuckets();
    return buckets.some((bucket) => bucket.name === bucketName);
  }

  // Nuevo método: crea un bucket si no existe, utilizando la versión promisificada
  async makeBucket(bucketName: string, region: string = ''): Promise<void> {
    await this.minioClient.makeBucket(bucketName, region);
    this.logger.log(
      `Bucket ${bucketName} creado en la región: ${region || 'default'}`,
    );
  }
}
