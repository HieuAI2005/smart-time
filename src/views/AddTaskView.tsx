import TaskForm from "../components/TaskForm";

export default function AddTaskView() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Add a new task</h2>
      <TaskForm />
    </div>
  );
}