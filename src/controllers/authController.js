const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { username, email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists with this email or username',
        });
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        firstName,
        lastName,
      });

      await user.save();

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Send verification email
      await emailService.sendVerificationEmail(user.email, verificationToken);

      logger.auth('User registered successfully', {
        userId: user._id,
        username: user.username,
        email: user.email,
      });

      res.status(201).json({
        message: 'User registered successfully. Please check your email for verification.',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal server error during registration',
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid email or password',
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Invalid email or password',
        });
      }

      // Update last login
      await user.updateLastLogin();

      // Generate tokens
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      await user.save();

      logger.auth('User logged in successfully', {
        userId: user._id,
        username: user.username,
        email: user.email,
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: 'Internal server error during login',
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const user = req.user;
      const oldRefreshToken = req.refreshToken;

      // Generate new tokens
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Remove old refresh token
      await user.revokeRefreshToken(oldRefreshToken);
      await user.save();

      logger.auth('Token refreshed successfully', {
        userId: user._id,
        username: user.username,
      });

      res.json({
        message: 'Token refreshed successfully',
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Internal server error during token refresh',
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      res.json({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          avatar: user.avatar,
          preferences: user.preferences,
          apiQuota: user.apiQuota,
          apiUsage: user.apiUsage,
          lastLogin: user.lastLogin,
          loginCount: user.loginCount,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching profile',
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { firstName, lastName, preferences } = req.body;
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      // Update fields
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (preferences) user.preferences = { ...user.preferences, ...preferences };

      await user.save();

      logger.auth('Profile updated successfully', {
        userId: user._id,
        username: user.username,
      });

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          preferences: user.preferences,
        },
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        error: 'Internal server error while updating profile',
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;
      
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          error: 'Current password is incorrect',
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Revoke all refresh tokens for security
      await user.revokeAllRefreshTokens();

      logger.auth('Password changed successfully', {
        userId: user._id,
        username: user.username,
      });

      res.json({
        message: 'Password changed successfully. Please login again.',
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        error: 'Internal server error while changing password',
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        const user = await User.findById(req.user.userId);
        if (user) {
          await user.revokeRefreshToken(refreshToken);
        }
      }

      logger.auth('User logged out successfully', {
        userId: req.user.userId,
        username: req.user.username,
      });

      res.json({
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal server error during logout',
      });
    }
  }

  // Logout from all devices
  async logoutAll(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (user) {
        await user.revokeAllRefreshTokens();
      }

      logger.auth('User logged out from all devices', {
        userId: req.user.userId,
        username: req.user.username,
      });

      res.json({
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      logger.error('Logout all error:', error);
      res.status(500).json({
        error: 'Internal server error during logout',
      });
    }
  }

  // Generate API key
  async generateApiKey(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      await user.generateApiKey();

      logger.auth('API key generated', {
        userId: user._id,
        username: user.username,
      });

      res.json({
        message: 'API key generated successfully',
        apiKey: user.apiKey,
      });
    } catch (error) {
      logger.error('Generate API key error:', error);
      res.status(500).json({
        error: 'Internal server error while generating API key',
      });
    }
  }

  // Revoke API key
  async revokeApiKey(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      user.apiKey = undefined;
      await user.save();

      logger.auth('API key revoked', {
        userId: user._id,
        username: user.username,
      });

      res.json({
        message: 'API key revoked successfully',
      });
    } catch (error) {
      logger.error('Revoke API key error:', error);
      res.status(500).json({
        error: 'Internal server error while revoking API key',
      });
    }
  }

  // Forgot password
  async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email } = req.body;
      
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({
          message: 'If the email exists, a password reset link has been sent.',
        });
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // Send reset email
      await emailService.sendPasswordResetEmail(user.email, resetToken);

      logger.auth('Password reset requested', {
        userId: user._id,
        email: user.email,
      });

      res.json({
        message: 'If the email exists, a password reset link has been sent.',
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Internal server error while processing password reset',
      });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { token, password } = req.body;
      
      const user = await User.findByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired reset token',
        });
      }

      // Update password and clear reset token
      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // Revoke all refresh tokens for security
      await user.revokeAllRefreshTokens();

      logger.auth('Password reset successfully', {
        userId: user._id,
        email: user.email,
      });

      res.json({
        message: 'Password reset successfully. Please login with your new password.',
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({
        error: 'Internal server error while resetting password',
      });
    }
  }

  // Verify email
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      const user = await User.findByEmailVerificationToken(token);
      if (!user) {
        return res.status(400).json({
          error: 'Invalid or expired verification token',
        });
      }

      // Mark email as verified
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      logger.auth('Email verified successfully', {
        userId: user._id,
        email: user.email,
      });

      res.json({
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(500).json({
        error: 'Internal server error while verifying email',
      });
    }
  }

  // Admin: Get all users
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 20, search, role, isActive } = req.query;
      
      const query = {};
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
        ];
      }
      if (role) query.role = role;
      if (isActive !== undefined) query.isActive = isActive === 'true';

      const users = await User.find(query)
        .select('-password -refreshTokens')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await User.countDocuments(query);

      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching users',
      });
    }
  }

  // Admin: Get user by ID
  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await User.findById(userId).select('-password -refreshTokens');
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      res.json({ user });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching user',
      });
    }
  }

  // Admin: Update user
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Remove sensitive fields
      delete updates.password;
      delete updates.refreshTokens;
      
      const user = await User.findByIdAndUpdate(userId, updates, { new: true })
        .select('-password -refreshTokens');
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      logger.auth('User updated by admin', {
        adminId: req.user.userId,
        targetUserId: userId,
        updates: Object.keys(updates),
      });

      res.json({
        message: 'User updated successfully',
        user,
      });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({
        error: 'Internal server error while updating user',
      });
    }
  }

  // Admin: Delete user
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      logger.auth('User deleted by admin', {
        adminId: req.user.userId,
        deletedUserId: userId,
        deletedUsername: user.username,
      });

      res.json({
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        error: 'Internal server error while deleting user',
      });
    }
  }

  // Admin: Activate user
  async activateUser(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: true },
        { new: true }
      ).select('-password -refreshTokens');
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      logger.auth('User activated by admin', {
        adminId: req.user.userId,
        targetUserId: userId,
      });

      res.json({
        message: 'User activated successfully',
        user,
      });
    } catch (error) {
      logger.error('Activate user error:', error);
      res.status(500).json({
        error: 'Internal server error while activating user',
      });
    }
  }

  // Admin: Deactivate user
  async deactivateUser(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      ).select('-password -refreshTokens');
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      // Revoke all refresh tokens
      await user.revokeAllRefreshTokens();

      logger.auth('User deactivated by admin', {
        adminId: req.user.userId,
        targetUserId: userId,
      });

      res.json({
        message: 'User deactivated successfully',
        user,
      });
    } catch (error) {
      logger.error('Deactivate user error:', error);
      res.status(500).json({
        error: 'Internal server error while deactivating user',
      });
    }
  }
}

module.exports = new AuthController();
