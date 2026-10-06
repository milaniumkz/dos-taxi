import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type UploadInput = {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
};

@Injectable()
export class S3StorageService {
  constructor(private readonly configService: ConfigService) {}

  private client: S3Client | null = null;

  async uploadExecutorDocument(params: {
    executorId: string;
    documentType: string;
    file: Express.Multer.File;
  }): Promise<string> {
    const bucket = this.getRequiredConfig('S3_BUCKET');
    const key = `executors/${params.executorId}/${Date.now()}-${params.documentType}-${params.file.originalname}`;
    await this.upload({
      bucket,
      key,
      body: params.file.buffer,
      contentType: params.file.mimetype,
    });

    return this.buildPublicUrl(bucket, key);
  }

  private async upload(input: UploadInput): Promise<void> {
    const client = this.getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  private getClient(): S3Client {
    if (this.client) {
      return this.client;
    }

    this.client = new S3Client({
      region: this.configService.get<string>('S3_REGION') ?? 'auto',
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
      forcePathStyle:
        this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: this.getRequiredConfig('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.getRequiredConfig('S3_SECRET_ACCESS_KEY'),
      },
    });

    return this.client;
  }

  private buildPublicUrl(bucket: string, key: string): string {
    const endpoint = this.getRequiredConfig('S3_ENDPOINT').replace(/\/$/, '');
    const forcePathStyle =
      this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    if (forcePathStyle) {
      return `${endpoint}/${bucket}/${key}`;
    }

    const url = new URL(endpoint);
    return `${url.protocol}//${bucket}.${url.host}/${key}`;
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required storage configuration: ${key}`);
    }

    return value;
  }
}
