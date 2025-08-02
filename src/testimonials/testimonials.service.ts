import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestimonialsService {
  constructor(private prisma: PrismaService) {}

  async create(body: any, imageUrl: string) {
    let quote;
    try {
      if (typeof body.quote === 'string') {
        quote = JSON.parse(body.quote);
      } else {
        quote = body.quote;
      }
    } catch {
      throw new BadRequestException('Invalid JSON format for quote');
    }

    return this.prisma.testimonial.create({
      data: {
        author: body.author,
        quote,
        rating: parseInt(body.rating, 10),
        imageUrl: imageUrl,
      },
    });
  }

  findAll() {
    return this.prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const testimonial = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!testimonial) throw new NotFoundException(`Testimonial with ID #${id} not found`);
    return testimonial;
  }

  async update(id: number, body: any, imageUrl?: string) {
    await this.findOne(id); // Cek apakah testimoni ada

    const dataToUpdate: any = {};

    if (body.author) dataToUpdate.author = body.author;
    if (body.rating) dataToUpdate.rating = parseInt(body.rating, 10);
    if (imageUrl) dataToUpdate.imageUrl = imageUrl;

    if (body.quote) {
      try {
        if (typeof body.quote === 'string') {
          dataToUpdate.quote = JSON.parse(body.quote);
        } else {
          dataToUpdate.quote = body.quote;
        }
      } catch {
        throw new BadRequestException('Invalid JSON format for quote');
      }
    }

    return this.prisma.testimonial.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Cek apakah testimoni ada sebelum menghapus
    // Anda bisa menambahkan logika untuk menghapus file dari storage di sini
    return this.prisma.testimonial.delete({
      where: { id },
    });
  }
}
