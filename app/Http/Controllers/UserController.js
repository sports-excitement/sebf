const UserService = require('../../Services/UserService');
const Response = require('../../../framework/helpers/Response');
const { validationResult } = require('express-validator');

class UserController {
  // Authentication endpoints
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return Response.badRequest(res, 'Validation failed', errors.array());
      }

      const { email, firstName, lastName, password } = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;

      const result = await UserService.registerUser({
        email,
        firstName,
        lastName,
        password,
        userAgent,
        ipAddress
      });

      return Response.success(res, 'User registered successfully', {
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt
      }, 201);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return Response.badRequest(res, error.message);
      }
      return Response.internalServerError(res, 'Registration failed', error);
    }
  }

  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return Response.badRequest(res, 'Validation failed', errors.array());
      }

      const { email, password } = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;

      const result = await UserService.loginUser({
        email,
        password,
        userAgent,
        ipAddress
      });

      return Response.success(res, 'Login successful', {
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt
      });
    } catch (error) {
      if (error.message.includes('Invalid email') || error.message.includes('deactivated')) {
        return Response.unauthorized(res, error.message);
      }
      return Response.internalServerError(res, 'Login failed', error);
    }
  }

  async logout(req, res) {
    try {
      await UserService.logoutUser(req.jwtToken);
      return Response.success(res, 'Logout successful');
    } catch (error) {
      return Response.internalServerError(res, 'Logout failed', error);
    }
  }

  async refreshToken(req, res) {
    try {
      const result = await UserService.refreshUserToken(req.jwtToken);
      return Response.success(res, 'Token refreshed successfully', result);
    } catch (error) {
      return Response.unauthorized(res, 'Token refresh failed');
    }
  }

  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return Response.badRequest(res, 'Validation failed', errors.array());
      }

      const { currentPassword, newPassword } = req.body;
      await UserService.changePassword(req.user.id, currentPassword, newPassword);
      
      return Response.success(res, 'Password changed successfully');
    } catch (error) {
      if (error.message.includes('incorrect')) {
        return Response.badRequest(res, error.message);
      }
      return Response.internalServerError(res, 'Password change failed', error);
    }
  }

  // User management endpoints
  async index(req, res) {
    try {
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc',
        search: req.query.search || '',
        role: req.query.role || null,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : null
      };

      const result = await UserService.getAllUsers(options);
      return Response.success(res, 'Users retrieved successfully', result);
    } catch (error) {
      return Response.internalServerError(res, 'Failed to retrieve users', error);
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(parseInt(id));
      
      if (!user) {
        return Response.notFound(res, 'User not found');
      }

      return Response.success(res, 'User retrieved successfully', user);
    } catch (error) {
      return Response.internalServerError(res, 'Failed to retrieve user', error);
    }
  }

  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return Response.badRequest(res, 'Validation failed', errors.array());
      }

      const { id } = req.params;
      const updateData = req.body;

      // Regular users can only update their own profile
      if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN' && req.user.id !== parseInt(id)) {
        return Response.forbidden(res, 'You can only update your own profile');
      }

      // Only admins can update role and isActive
      if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
        delete updateData.role;
        delete updateData.isActive;
      }

      const user = await UserService.updateUser(parseInt(id), updateData);
      
      if (!user) {
        return Response.notFound(res, 'User not found');
      }

      return Response.success(res, 'User updated successfully', user);
    } catch (error) {
      return Response.internalServerError(res, 'Failed to update user', error);
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;

      // Only admins can delete users
      if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
        return Response.forbidden(res, 'Insufficient permissions');
      }

      // Prevent self-deletion
      if (req.user.id === parseInt(id)) {
        return Response.badRequest(res, 'You cannot delete your own account');
      }

      const result = await UserService.deleteUser(parseInt(id));
      
      if (!result) {
        return Response.notFound(res, 'User not found');
      }

      return Response.success(res, 'User deleted successfully');
    } catch (error) {
      return Response.internalServerError(res, 'Failed to delete user', error);
    }
  }

  // Profile management
  async getProfile(req, res) {
    try {
      const user = await UserService.getUserById(req.user.id);
      return Response.success(res, 'Profile retrieved successfully', user);
    } catch (error) {
      return Response.internalServerError(res, 'Failed to retrieve profile', error);
    }
  }

  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return Response.badRequest(res, 'Validation failed', errors.array());
      }

      const updateData = req.body;
      
      // Users cannot update their own role or isActive status
      delete updateData.role;
      delete updateData.isActive;

      const user = await UserService.updateUser(req.user.id, updateData);
      return Response.success(res, 'Profile updated successfully', user);
    } catch (error) {
      return Response.internalServerError(res, 'Failed to update profile', error);
    }
  }

  // Session management
  async getUserSessions(req, res) {
    try {
      const sessions = await UserService.getUserSessions(req.user.id);
      return Response.success(res, 'Sessions retrieved successfully', sessions);
    } catch (error) {
      return Response.internalServerError(res, 'Failed to retrieve sessions', error);
    }
  }

  async revokeUserSessions(req, res) {
    try {
      const excludeCurrentSession = req.body.excludeCurrent !== false;
      const excludeSessionId = excludeCurrentSession ? req.user.sessionId : null;

      const revokedCount = await UserService.revokeUserSessions(req.user.id, excludeSessionId);
      
      return Response.success(res, 'Sessions revoked successfully', {
        revokedCount,
        message: excludeCurrentSession ? 
          'All other sessions have been revoked' : 
          'All sessions have been revoked'
      });
    } catch (error) {
      return Response.internalServerError(res, 'Failed to revoke sessions', error);
    }
  }

  // Admin endpoints
  async deactivateUser(req, res) {
    try {
      const { id } = req.params;

      if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
        return Response.forbidden(res, 'Insufficient permissions');
      }

      if (req.user.id === parseInt(id)) {
        return Response.badRequest(res, 'You cannot deactivate your own account');
      }

      const user = await UserService.deactivateUser(parseInt(id));
      
      if (!user) {
        return Response.notFound(res, 'User not found');
      }

      return Response.success(res, 'User deactivated successfully', user);
    } catch (error) {
      return Response.internalServerError(res, 'Failed to deactivate user', error);
    }
  }

  async activateUser(req, res) {
    try {
      const { id } = req.params;

      if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
        return Response.forbidden(res, 'Insufficient permissions');
      }

      const user = await UserService.activateUser(parseInt(id));
      
      if (!user) {
        return Response.notFound(res, 'User not found');
      }

      return Response.success(res, 'User activated successfully', user);
    } catch (error) {
      return Response.internalServerError(res, 'Failed to activate user', error);
    }
  }

  // File upload placeholder (implement with multer if needed)
  async uploadAvatar(req, res) {
    try {
      // This would be implemented with file upload middleware
      return Response.success(res, 'Avatar upload functionality not implemented yet');
    } catch (error) {
      return Response.internalServerError(res, 'Avatar upload failed', error);
    }
  }
}

module.exports = new UserController(); 