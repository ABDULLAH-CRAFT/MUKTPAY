import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.users.findOne({ where: { email: normalizeEmail(email) } });
  }

  /** Only login needs the hash. */
  findByEmailWithPassword(email: string) {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: normalizeEmail(email) })
      .getOne();
  }

  create(data: { name: string; email: string; passwordHash: string }) {
    return this.users.save(
      this.users.create({ name: data.name.trim(), email: normalizeEmail(data.email), passwordHash: data.passwordHash }),
    );
  }

  async touchLastLogin(id: string) {
    await this.users.update({ id }, { lastLoginAt: new Date() });
  }
}
