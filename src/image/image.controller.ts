import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageService } from './image.service';
import { Response } from 'express';
import { Multer, memoryStorage } from 'multer';

@Controller('automobiles/:id/images')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  /**
   * POST /automobiles/:id/images
   * Form field: 'file'
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB por ejemplo
    }),
  )
  async upload(
    @Param('id') automobileId: string,
    @UploadedFile() file: Multer.File,
  ) {
    const objectName = await this.imageService.uploadImage(
      automobileId,
      file.originalname,
      file.buffer,
    );
    // Devuelve la ruta donde estará disponible
    return {
      message: 'Imagen subida',
      path: `/automobiles/${automobileId}/images/${file.originalname}`,
      objectName,
    };
  }

  /**
   * GET /automobiles/:id/images/:fileName
   * Descarga la imagen
   */
  @Get(':fileName')
  async download(
    @Param('id') automobileId: string,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const fileBuffer = await this.imageService.getImage(automobileId, fileName);
    res
      .type(fileName.split('.').pop() || 'octet-stream')
      .set({
        'Content-Disposition': `inline; filename="${fileName}"`,
      })
      .send(fileBuffer);
  }
}
