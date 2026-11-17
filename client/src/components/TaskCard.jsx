const NEXT = { todo: 'in-progress', 'in-progress': 'done' };
const NEXT_LABEL = { todo: 'Start', 'in-progress': 'Mark done' };

export default function TaskCard({ task, onMove, onEdit, onDelete }) {
  const overdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date(new Date().toDateString());

  return (
    <article className={`card p-${task.priority}`}>
      <div className="card-top">
        <h3>{task.title}</h3>
        <span className={`tag tag-${task.priority}`}>{task.priority}</span>
      </div>
      {task.description && <p className="desc">{task.description}</p>}
      {task.dueDate && (
        <p className={`due ${overdue ? 'overdue' : ''}`}>
          {overdue ? 'Overdue: ' : 'Due '}
          {new Date(task.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
      <div className="card-actions">
        {NEXT[task.status] && (
          <button className="btn small primary" onClick={() => onMove(task, NEXT[task.status])}>
            {NEXT_LABEL[task.status]}
          </button>
        )}
        <button className="btn small" onClick={() => onEdit(task)}>Edit</button>
        <button className="btn small danger" onClick={() => onDelete(task)}>Delete</button>
      </div>
    </article>
  );
}
