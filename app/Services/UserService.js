const { prismaService } = require('../../framework/config/prisma');
const bcrypt = require('bcryptjs');
const JWTSessionService = require('../../framework/services/JWTSessionService');
const Logger = require('../../framework/helpers/Logger');

class UserService {
  constructor() {
    this.prisma = prismaService.getClient();
  }

  async createUser({ email, firstName, lastName, password, role = 'USER' }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    return this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async registerUser({ email, firstName, lastName, password, userAgent, ipAddress }) {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create user
      const user = await this.createUser({ email, firstName, lastName, password });

      // Generate JWT token with session
      const tokenResult = await JWTSessionService.generateToken({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }, {
        userAgent,
        ipAddress,
        metadata: { registeredAt: new Date().toISOString() }
      });

      Logger.info(`User registered: ${email}`);

      return {
        user,
        token: tokenResult.token,
        sessionId: tokenResult.sessionId,
        expiresAt: tokenResult.expiresAt
      };
    } catch (error) {
      Logger.error('User registration failed:', error);
      throw error;
    }
  }

  async loginUser({ email, password, userAgent, ipAddress }) {
    try {
      // Find user with password for verification
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          sessions: {
            where: {
              expiresAt: {
                gt: new Date()
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Generate JWT token with session
      const tokenResult = await JWTSessionService.generateToken({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }, {
        userAgent,
        ipAddress,
        metadata: { loginAt: new Date().toISOString() }
      });

      Logger.info(`User logged in: ${email}`);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token: tokenResult.token,
        sessionId: tokenResult.sessionId,
        expiresAt: tokenResult.expiresAt
      };
    } catch (error) {
      Logger.error('User login failed:', error);
      throw error;
    }
  }

  async logoutUser(token) {
    try {
      await JWTSessionService.revokeToken(token);
      Logger.info('User logged out successfully');
      return true;
    } catch (error) {
      Logger.error('User logout failed:', error);
      throw error;
    }
  }

  async refreshUserToken(token) {
    try {
      const tokenResult = await JWTSessionService.refreshToken(token);
      Logger.debug('User token refreshed');
      return tokenResult;
    } catch (error) {
      Logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  async getUserSessions(userId) {
    try {
      return await JWTSessionService.getUserSessions(userId);
    } catch (error) {
      Logger.error('Failed to get user sessions:', error);
      throw error;
    }
  }

  async revokeUserSessions(userId, excludeSessionId = null) {
    try {
      const revokedCount = await JWTSessionService.revokeUserSessions(userId, excludeSessionId);
      Logger.info(`Revoked ${revokedCount} sessions for user ${userId}`);
      return revokedCount;
    } catch (error) {
      Logger.error('Failed to revoke user sessions:', error);
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user with password
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });

      // Revoke all existing sessions except current one (user needs to log in again)
      await this.revokeUserSessions(userId);

      Logger.info(`Password changed for user ${userId}`);
      return true;
    } catch (error) {
      Logger.error('Password change failed:', error);
      throw error;
    }
  }

  async getAllUsers(options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = '',
      role = null,
      isActive = null
    } = options;

    const where = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== null) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getUserById(id) {
    return this.prisma.user.findUnique({ 
      where: { id: parseInt(id, 10) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        bio: true,
        avatarUrl: true,
        phone: true,
        location: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true
      }
    });
  }

  async updateUser(id, updateData) {
    try {
      // First check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id: parseInt(id, 10) }
      });

      if (!existingUser) {
        return null;
      }

      const data = {};
      
      // Only update fields that are provided
      if (updateData.email !== undefined) data.email = updateData.email;
      if (updateData.firstName !== undefined) data.firstName = updateData.firstName;
      if (updateData.lastName !== undefined) data.lastName = updateData.lastName;
      if (updateData.bio !== undefined) data.bio = updateData.bio;
      if (updateData.avatarUrl !== undefined) data.avatarUrl = updateData.avatarUrl;
      if (updateData.phone !== undefined) data.phone = updateData.phone;
      if (updateData.location !== undefined) data.location = updateData.location;
      if (updateData.isActive !== undefined) data.isActive = updateData.isActive;
      if (updateData.role !== undefined) data.role = updateData.role;

      // Handle password separately with hashing
      if (updateData.password) {
        data.password = await bcrypt.hash(updateData.password, 12);
      }

      return this.prisma.user.update({
        where: { id: parseInt(id, 10) },
        data,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          bio: true,
          avatarUrl: true,
          phone: true,
          location: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true
        }
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      // First check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id: parseInt(id, 10) }
      });

      if (!existingUser) {
        return null;
      }

      // Revoke all user sessions before deletion
      await this.revokeUserSessions(parseInt(id, 10));

      // Delete user (cascade will handle related records)
      await this.prisma.user.delete({ 
        where: { id: parseInt(id, 10) } 
      });
      
      Logger.info(`User deleted: ${existingUser.email}`);
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async deactivateUser(id) {
    try {
      const user = await this.updateUser(id, { isActive: false });
      if (user) {
        // Revoke all sessions when deactivating
        await this.revokeUserSessions(parseInt(id, 10));
        Logger.info(`User deactivated: ${user.email}`);
      }
      return user;
    } catch (error) {
      Logger.error('User deactivation failed:', error);
      throw error;
    }
  }

  async activateUser(id) {
    try {
      const user = await this.updateUser(id, { isActive: true });
      if (user) {
        Logger.info(`User activated: ${user.email}`);
      }
      return user;
    } catch (error) {
      Logger.error('User activation failed:', error);
      throw error;
    }
  }

  // Utility methods
  async getUserByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true
      }
    });
  }

  async getUserCount(filters = {}) {
    const where = {};
    
    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    
    return this.prisma.user.count({ where });
  }

  async getActiveUserCount() {
    return this.getUserCount({ isActive: true });
  }
}

module.exports = new UserService(); 