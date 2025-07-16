import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestimonialsService {
  constructor(private prisma: PrismaService) {}

  async create(createTestimonialDto: CreateTestimonialDto, imageUrl: string | null) {
    return this.prisma.testimonial.create({
      data: {
        author: createTestimonialDto.author,
        quote: createTestimonialDto.quote, // Bisa object multilang!
        rating: createTestimonialDto.rating,
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

  update(id: number, updateTestimonialDto: UpdateTestimonialDto) {
    return this.prisma.testimonial.update({
      where: { id },
      data: updateTestimonialDto,
    });
  }

  remove(id: number) {
    return this.prisma.testimonial.delete({
      where: { id },
    });
  }
}
