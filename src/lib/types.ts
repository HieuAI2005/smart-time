export type TaskCategory = "assignment" | "lecture" | "exam" | "work" | "personal";
export type TaskStatus = "todo" | "in_progress" | "done";
export type Visibility = "private" | "friends" | "public";


export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  plannedMinutes: number;
  actualMinutes?: number;
  startAt?: string;
  dueAt?: string;     
  createdAt: string;  
  updatedAt: string;  
  completedAt?: string; 
  status: TaskStatus;
  runningFrom?: string;
  tags?: string[];
  checklist?: Subtask[]; 

  dailyMinutes: number;     
  startDate: string;      
  dueDate: string;    
  estimateTotalMin?: number;      
  procrastinationFactor?: number;     

  autoScheduleRule?: {
    earliestHHmm: string;    
    daysOfWeek?: number[];
  }    
  visibility?: Visibility;            

  progress: Record<string, number>; 
}

export interface FilterState {
  q: string;
  cat: TaskCategory | "all";
  status: TaskStatus | "all";
}