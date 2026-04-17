import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function App() {
  const [tasks, setTasks] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Normal')
  const [dueDate, setDueDate] = useState('')
  const [activity, setActivity] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any | null>(null)

  const fetchTasks = async () => {
    const user = (await supabase.auth.getUser()).data.user
    const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user?.id)
    setTasks(data || [])
  }

  const fetchActivity = async (taskId: string) => {
    const { data } = await supabase
      .from('task_activity')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    setActivity(data || [])
  }

  const createTask = async () => {
    const user = (await supabase.auth.getUser()).data.user

    if (!title) return

    const { data: newTask } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        priority,
        due_date: dueDate || null,
        status: 'todo',
        user_id: user?.id
      })
      .select()
        .single()

    if (newTask) {
      await logActivity(newTask.id, 'Task created')
    }

    setTitle('')
    fetchTasks()
    setDescription('')
    setPriority('Normal')
    setDueDate('')
  }

  const deleteTask = async (id: string) => {
    const confirmed = confirm('Delete this task?')
    if (!confirmed) return
    await logActivity(id, 'Task deleted')
    await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    fetchTasks()
  }

  const logActivity = async (taskId: string, message: string) => {
    const user = (await supabase.auth.getUser()).data.user

    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: user?.id,
      message,
    })
  }

  useEffect(() => {
  const init = async () => {
    const { data } = await supabase.auth.getSession()

    if (!data.session) {
      await supabase.auth.signInAnonymously()
    }

    await fetchTasks()
  }

  init()

  const { data: listener } = supabase.auth.onAuthStateChange(() => {
    fetchTasks()
  })

  return () => {
    listener.subscription.unsubscribe()
  }
}, [])

  return (
    <>
    <div style={{ display: 'flex', gap: 10, margin: 20, flexWrap: 'wrap' }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        style={{ padding: 8 }}
      />

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        style={{ padding: 8 }}
      />

      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
       style={{ padding: 8 }}
      >
        <option value="Low">Low</option>
        <option value="Normal">Normal</option>
        <option value="High">High</option>
      </select>

      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        style={{ padding: 8 }}
      />

      <button
      onClick={createTask}
      style={{
        padding: '10px 16px',
        backgroundColor: '#2563eb', // stronger blue
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        transition: 'all 0.15s ease-in-out',
      }}
      onMouseOver={(e) => {
        (e.currentTarget.style.backgroundColor = '#1d4ed8')
      }}
      onMouseOut={(e) => {
        (e.currentTarget.style.backgroundColor = '#2563eb')
      }}
    >
      Add Task
    </button>
    </div>

    <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
      {['todo', 'in_progress', 'in_review', 'done'].map((status) => (
        <div
          key={status}
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            const taskId = e.dataTransfer.getData('taskId')

            const task = tasks.find(t => t.id === taskId)

            if (task && task.status !== status) {
              await logActivity(taskId, `Moved from ${task.status} → ${status}`)
            }

            await supabase
              .from('tasks')
              .update({ status })
              .eq('id', taskId)

            fetchTasks()
          }}
          style={{
            background: '#f4f4f4',
            padding: 10,
            borderRadius: 8,
            width: 250,
            minHeight: 400
          }}
        >
          <h3>
            {{
              todo: 'To Do',
              in_progress: 'In Progress',
              in_review: 'In Review',
              done: 'Done'
            }[status]}
          </h3>

          {tasks
            .filter((task: any) => task.status === status)
            .map((task: any) => (
              <div
                key={task.id}
                draggable
                onClick={() => {
                  setSelectedTask(task)
                  fetchActivity(task.id)
                }}
                onDragStart={(e) => {
                  e.dataTransfer.setData('taskId', task.id)
                }}
                style={{
                  background: 'white',
                  padding: 10,
                  marginBottom: 10,
                  borderRadius: 6,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  cursor: 'grab',
                  position: 'relative'
                }}
              >

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteTask(task.id)
                }}
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#888'
                }}
            >
              X
            </button>

            <div style={{ fontWeight: 'bold' }}>
              {task.title}
            </div>

            {task.description && (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {task.description}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 12 }}>
                {task.priority}
              </span>

              {task.due_date && (
                <span style={{ fontSize: 12 }}>
                  {task.due_date}
                </span>
              )}
            </div>
          </div>
            ))}
        </div>
      ))}
    </div>
    {selectedTask && (
      <div style={{
        position: 'fixed',
        right: 20,
        top: 20,
        width: 300,
        background: 'white',
        padding: 15,
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        <h3>{selectedTask.title}</h3>

        <h4 style={{ marginTop: 10 }}>Activity</h4>

        {activity.map((a) => (
          <div key={a.id} style={{ fontSize: 12, marginBottom: 8 }}>
            <div>{a.message}</div>
            <div style={{ opacity: 0.5 }}>
              {new Date(a.created_at).toLocaleString()}
            </div>
          </div>
        ))}

        <button 
          onClick={() => setSelectedTask(null)}
          style={{
            marginTop: 10,
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            color: '#444', // darker grey
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Close
        </button>
      </div>
    )}
  </>
)
}

export default App