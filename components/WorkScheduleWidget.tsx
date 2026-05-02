"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WorkTask } from "@/lib/types";

function GripIcon() {
  return (
    <svg
      viewBox="0 0 8 12"
      width="8"
      height="12"
      className="text-gray-600"
      aria-hidden
    >
      <circle cx="2" cy="2"  r="1.2" fill="currentColor" />
      <circle cx="6" cy="2"  r="1.2" fill="currentColor" />
      <circle cx="2" cy="6"  r="1.2" fill="currentColor" />
      <circle cx="6" cy="6"  r="1.2" fill="currentColor" />
      <circle cx="2" cy="10" r="1.2" fill="currentColor" />
      <circle cx="6" cy="10" r="1.2" fill="currentColor" />
    </svg>
  );
}

export default function WorkScheduleWidget() {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/work-tasks")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setTasks(json.data as WorkTask[]);
      })
      .catch(() => toast.error("Failed to load tasks"))
      .finally(() => setLoading(false));
  }, []);

  async function addTask() {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/work-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setTasks((prev) => [...prev, json.data as WorkTask]);
      setNewTitle("");
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to add task");
    } finally {
      setAdding(false);
    }
  }

  async function toggleDone(task: WorkTask) {
    const newDone = !task.done;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: newDone } : t))
    );
    try {
      const res = await fetch("/api/work-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, done: newDone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, done: task.done } : t))
      );
      toast.error("Failed to update task");
    }
  }

  async function deleteTask(task: WorkTask) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      const res = await fetch(`/api/work-tasks?id=${task.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch {
      setTasks((prev) =>
        [...prev, task].sort((a, b) => a.sort_order - b.sort_order)
      );
      toast.error("Failed to delete task");
    }
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex((prev) => (prev === index ? prev : index));
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...tasks];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    const updated = reordered.map((t, i) => ({ ...t, sort_order: i }));

    setTasks(updated);
    setDragIndex(null);
    setDragOverIndex(null);

    const originalOrder = new Map(tasks.map((t) => [t.id, t.sort_order]));
    updated.forEach((task) => {
      if (originalOrder.get(task.id) !== task.sort_order) {
        fetch("/api/work-tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: task.id, sort_order: task.sort_order }),
        });
      }
    });
  }

  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 min-h-48 widget-card">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">
          Work Schedule
        </p>
        {!loading && total > 0 && (
          <span className="text-xs tabular-nums">
            <span
              className={
                done === total ? "text-emerald-400 font-semibold" : "text-gray-300"
              }
            >
              {done}
            </span>
            <span className="text-gray-600"> / {total}</span>
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* New task input */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Add a task…"
              disabled={adding}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500 disabled:opacity-50"
            />
            <button
              onClick={addTask}
              disabled={adding || !newTitle.trim()}
              className="px-3 py-2 min-h-[44px] text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {/* Task list */}
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-600 py-1">No tasks for today.</p>
          ) : (
            <ul className="space-y-0.5">
              {tasks.map((task, idx) => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`flex items-center gap-2 px-2 py-2 rounded-lg group select-none
                    ${dragIndex === idx ? "opacity-40" : "hover:bg-gray-800"}
                    ${
                      dragOverIndex === idx && dragIndex !== idx
                        ? "border-t-2 border-indigo-500"
                        : "border-t-2 border-transparent"
                    }`}
                >
                  {/* Grip */}
                  <span className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
                    <GripIcon />
                  </span>

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleDone(task)}
                    aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      task.done
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-gray-600 bg-transparent hover:border-gray-400"
                    }`}
                  >
                    {task.done && (
                      <svg
                        className="w-3 h-3 text-white"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Title with animated strikethrough */}
                  <span
                    className={`flex-1 text-sm min-w-0 relative overflow-hidden transition-colors duration-200 ${
                      task.done ? "text-gray-500" : "text-gray-300"
                    }`}
                  >
                    <span
                      className="absolute left-0 top-1/2 h-px bg-gray-500 transition-[width] duration-300 ease-out"
                      style={{ width: task.done ? "100%" : "0%" }}
                      aria-hidden
                    />
                    <span className="block truncate">{task.title}</span>
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => deleteTask(task)}
                    aria-label={`Delete "${task.title}"`}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
