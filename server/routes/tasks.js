const router = require('express').Router();
const ctrl = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.use(protect); // every task route requires a valid JWT

router.get('/stats', ctrl.getStats); // must be declared before '/:id'
router.route('/').get(ctrl.getTasks).post(ctrl.createTask);
router.route('/:id').put(ctrl.updateTask).delete(ctrl.deleteTask);

module.exports = router;
