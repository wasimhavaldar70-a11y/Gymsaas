"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dumbbell,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  X,
  RefreshCw,
  Flame
} from "lucide-react";
import { fetchApi } from "../../lib/api-client";

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_group: string;
  equipment: string;
  difficulty: string;
  instructions: string;
}

export default function WorkoutsPage() {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const queryClient = useQueryClient();

  const [newExercise, setNewExercise] = useState({
    name: "",
    category: "STRENGTH",
    muscle_group: "CHEST",
    equipment: "BARBELL",
    difficulty: "INTERMEDIATE",
    instructions: ""
  });

  const { data: exercises, isLoading } = useQuery<Exercise[]>({
    queryKey: ["exercises", selectedCategory],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "ALL") params.set("category", selectedCategory);
      return fetchApi<Exercise[]>(`/workouts/exercises?${params.toString()}`);
    }
  });

  const addExerciseMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi("/workouts/exercises", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      setIsAddExerciseOpen(false);
      setNewExercise({
        name: "",
        category: "STRENGTH",
        muscle_group: "CHEST",
        equipment: "BARBELL",
        difficulty: "INTERMEDIATE",
        instructions: ""
      });
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    }
  });

  const filteredExercises = (exercises || []).filter((ex) =>
    searchTerm ? ex.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-gym-red" />
            <span>Workout & Exercise Library</span>
          </h1>
          <p className="text-xs text-gym-muted mt-0.5">
            Manage gym exercise library, muscle groups, and assign customized workout plans.
          </p>
        </div>

        <button
          onClick={() => setIsAddExerciseOpen(true)}
          className="flex items-center gap-2 bg-gym-red hover:bg-gym-redHover text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-red-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Exercise</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="p-4 rounded-2xl bg-gym-card/60 border border-gym-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search exercises by name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gym-bg border border-gym-border text-xs md:text-sm text-white focus:outline-none focus:border-gym-red"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["ALL", "STRENGTH", "CARDIO", "CORE"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-gym-red text-white shadow-md shadow-red-500/20"
                  : "bg-gym-surface text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* EXERCISES GRID */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-gym-muted">Loading exercises...</div>
      ) : filteredExercises.length === 0 ? (
        <div className="py-16 text-center text-sm text-gym-muted">No exercises found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map((ex) => (
            <div
              key={ex.id}
              className="p-5 rounded-2xl bg-gym-card/60 border border-gym-border hover:bg-gym-cardHover/70 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-white text-sm md:text-base">{ex.name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-gym-border text-slate-300 uppercase">
                  {ex.difficulty}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-lg bg-red-500/10 text-gym-red border border-red-500/20 font-medium">
                  {ex.muscle_group}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  {ex.equipment}
                </span>
              </div>

              {ex.instructions && (
                <p className="text-xs text-gym-muted line-clamp-2 leading-relaxed">{ex.instructions}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ADD EXERCISE MODAL */}
      {isAddExerciseOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-surface border border-gym-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gym-border pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-gym-red" />
                <span>Add Custom Exercise</span>
              </h2>
              <button
                onClick={() => setIsAddExerciseOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gym-card text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addExerciseMutation.mutate(newExercise);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Exercise Name *</label>
                <input
                  type="text"
                  required
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  placeholder="e.g. Incline Dumbbell Hammer Curl"
                  className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Category</label>
                  <select
                    value={newExercise.category}
                    onChange={(e) => setNewExercise({ ...newExercise, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                  >
                    <option value="STRENGTH">Strength</option>
                    <option value="CARDIO">Cardio</option>
                    <option value="CORE">Core</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Muscle Group</label>
                  <select
                    value={newExercise.muscle_group}
                    onChange={(e) => setNewExercise({ ...newExercise, muscle_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                  >
                    <option value="CHEST">Chest</option>
                    <option value="BACK">Back</option>
                    <option value="LEGS">Legs</option>
                    <option value="SHOULDERS">Shoulders</option>
                    <option value="ARMS">Arms</option>
                    <option value="CORE">Core</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Instructions / Form Notes</label>
                <textarea
                  rows={2}
                  value={newExercise.instructions}
                  onChange={(e) => setNewExercise({ ...newExercise, instructions: e.target.value })}
                  placeholder="Elbows fixed, squeeze at top..."
                  className="w-full px-3 py-2 rounded-xl bg-gym-bg border border-gym-border text-white focus:outline-none focus:border-gym-red"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddExerciseOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gym-border text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addExerciseMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-gym-red hover:bg-gym-redHover text-white font-semibold flex items-center gap-1.5"
                >
                  {addExerciseMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Save Exercise</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
