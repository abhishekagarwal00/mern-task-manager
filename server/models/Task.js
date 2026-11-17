const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    // Reference to the owner -> every query is scoped by this field
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index: speeds up "my tasks filtered by status, newest first"
taskSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
