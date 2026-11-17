const Task = require('../models/Task');

// Only these fields can be set by the client (prevents mass-assignment of `user`, etc.)
const pickFields = (body) => {
  const allowed = ['title', 'description', 'status', 'priority', 'dueDate'];
  return Object.fromEntries(allowed.filter((k) => k in body).map((k) => [k, body[k]]));
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/tasks?status=&priority=&search=&sort=&page=&limit=
exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, search, sort = '-createdAt' } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

    const filter = { user: req.user._id };
    if (status) filter.status = String(status);
    if (priority) filter.priority = String(priority);
    if (search) filter.title = { $regex: escapeRegex(String(search)), $options: 'i' };

    const sortable = ['createdAt', '-createdAt', 'dueDate', '-dueDate'];
    const sortBy = sortable.includes(sort) ? sort : '-createdAt';

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit),
      Task.countDocuments(filter),
    ]);

    res.json({ tasks, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/tasks/stats  -> counts per status using an aggregation pipeline
exports.getStats = async (req, res, next) => {
  try {
    const rows = await Task.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const stats = { todo: 0, 'in-progress': 0, done: 0 };
    rows.forEach((r) => (stats[r._id] = r.count));
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

// POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const task = await Task.create({ ...pickFields(req.body), user: req.user._id });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    // Filtering by BOTH _id and user => users can never touch someone else's task
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      pickFields(req.body),
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task deleted', id: task._id });
  } catch (err) {
    next(err);
  }
};
