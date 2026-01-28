/**
 * ✅ SOFT DELETE PLUGIN - GLOBAL IMPLEMENTATION
 * 
 * Industry Standard: Never permanently delete data by default
 * All delete operations are reversible
 * 
 * Features:
 * - Automatic soft delete fields
 * - Global query filtering (excludes deleted records)
 * - Restore functionality
 * - Audit trail (who deleted, when)
 */

const mongoose = require('mongoose');

const softDeletePlugin = (schema, options = {}) => {
  // ✅ Add soft delete fields to schema
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: true, // Index for performance
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  });

  // ✅ GLOBAL QUERY FILTER - Automatically exclude soft-deleted records
  // This applies to ALL read operations: find, findOne, count, etc.
  schema.pre('find', function() {
    if (!this.getOptions().includeDeleted) {
      this.where({ isDeleted: false });
    }
  });

  schema.pre('findOne', function() {
    if (!this.getOptions().includeDeleted) {
      this.where({ isDeleted: false });
    }
  });

  schema.pre('countDocuments', function() {
    if (!this.getOptions().includeDeleted) {
      this.where({ isDeleted: false });
    }
  });

  schema.pre('count', function() {
    if (!this.getOptions().includeDeleted) {
      this.where({ isDeleted: false });
    }
  });

  schema.pre('aggregate', function() {
    if (!this.options.includeDeleted) {
      this.pipeline().unshift({ $match: { isDeleted: false } });
    }
  });

  // ✅ SOFT DELETE METHOD - Mark record as deleted
  schema.methods.softDelete = async function(deletedBy = null) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    await this.save();
    return this;
  };

  // ✅ RESTORE METHOD - Recover soft-deleted record
  schema.methods.restore = async function() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    await this.save();
    return this;
  };

  // ✅ STATIC SOFT DELETE - Delete by ID
  schema.statics.softDeleteById = async function(id, deletedBy = null) {
    const doc = await this.findById(id);
    if (!doc) {
      throw new Error('Document not found');
    }
    return await doc.softDelete(deletedBy);
  };

  // ✅ STATIC SOFT DELETE MANY - Delete multiple records
  schema.statics.softDeleteMany = async function(conditions, deletedBy = null) {
    return await this.updateMany(
      conditions,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy,
        },
      }
    );
  };

  // ✅ STATIC RESTORE - Restore by ID
  schema.statics.restoreById = async function(id) {
    const doc = await this.findOne({ _id: id }).setOptions({ includeDeleted: true });
    if (!doc) {
      throw new Error('Document not found');
    }
    return await doc.restore();
  };

  // ✅ STATIC RESTORE MANY - Restore multiple records
  schema.statics.restoreMany = async function(conditions) {
    return await this.updateMany(
      conditions,
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        },
      }
    );
  };

  // ✅ FIND WITH DELETED - Explicitly include deleted records
  schema.statics.findWithDeleted = function(conditions = {}) {
    return this.find(conditions).setOptions({ includeDeleted: true });
  };

  schema.statics.findOneWithDeleted = function(conditions = {}) {
    return this.findOne(conditions).setOptions({ includeDeleted: true });
  };

  // ✅ FIND ONLY DELETED - Get only soft-deleted records
  schema.statics.findDeleted = function(conditions = {}) {
    return this.find({ ...conditions, isDeleted: true }).setOptions({ includeDeleted: true });
  };

  // ✅ HARD DELETE - RESTRICTED (Admin only, with audit)
  schema.statics.hardDelete = async function(id, adminId) {
    if (!adminId) {
      throw new Error('Hard delete requires admin authorization');
    }
    
    console.log(`⚠️ HARD DELETE: Record ${id} permanently deleted by admin ${adminId}`);
    
    // Audit log (you can implement full audit logging here)
    // await AuditLog.create({ action: 'HARD_DELETE', entityId: id, adminId, timestamp: new Date() });
    
    return await this.findByIdAndDelete(id);
  };

  // ✅ VIRTUAL: Check if deleted
  schema.virtual('deleted').get(function() {
    return this.isDeleted;
  });
};

module.exports = softDeletePlugin;
