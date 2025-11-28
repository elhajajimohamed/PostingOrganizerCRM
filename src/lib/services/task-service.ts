import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task, CreateTaskData } from '@/lib/types';

const COLLECTION_NAME = 'tasks';

export class TaskService {
  // Get all tasks
  static async getAllTasks(): Promise<Task[]> {
    try {

      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        doneAt: doc.data().doneAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Task[];
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  // Get task by ID
  static async getTaskById(taskId: string): Promise<Task | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, taskId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          date: data.date?.toDate(),
          doneAt: data.doneAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
        } as Task;
      }
      return null;
    } catch (error) {
      console.error('Error getting task:', error);
      throw new Error('Failed to fetch task');
    }
  }

  // Create new task
  static async createTask(taskData: CreateTaskData): Promise<string> {
    try {
      console.log('🔄 TaskService: Creating task with data:', taskData);

      const newTask = {
        ...taskData,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      console.log('📝 TaskService: Final task object:', newTask);

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newTask);
      console.log('✅ TaskService: Task created successfully with ID:', docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('❌ TaskService: Error creating task:', error);
      console.error('❌ TaskService: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        taskData: taskData
      });
      throw new Error('Failed to create task');
    }
  }

  // Update task
  static async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      // Convert dates to timestamps if present
      if (updates.date) {
        updateData.date = updates.date;
      }
      if (updates.doneAt) {
        updateData.doneAt = updates.doneAt;
      }

      const taskRef = doc(db, COLLECTION_NAME, taskId);
      await updateDoc(taskRef, updateData);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Failed to update task');
    }
  }

  // Delete task
  static async deleteTask(taskId: string): Promise<void> {
    try {
      const taskRef = doc(db, COLLECTION_NAME, taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }

  // Mark task as done
  static async markTaskAsDone(taskId: string): Promise<void> {
    try {
      // First get the task to access its data
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Update task status without changing notes
      await this.updateTask(taskId, {
        status: 'completed',
        doneAt: new Date(),
      });

      // Create post history entry
      if (task.accountId && task.groupId) {
        try {
          const { PostHistoryService } = await import('./post-history-service');
          await PostHistoryService.logCompletedPost(
            task.accountId,
            task.groupId,
            task.templateId,
            task.content || 'Task completed',
            task.assignedTo,
            `Task completed at ${new Date().toLocaleString()}`
          );
          console.log('✅ Post history created for completed task');
        } catch (error) {
          console.error('❌ Failed to create post history:', error);
          // Don't throw error here - task is already marked as done
        }
      }
    } catch (error) {
      console.error('Error marking task as done:', error);
      throw new Error('Failed to mark task as done');
    }
  }

  // Get tasks by assigned user
  static async getTasksByUser(assignedTo: string): Promise<Task[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('assignedTo', '==', assignedTo),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        doneAt: doc.data().doneAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Task[];
    } catch (error) {
      console.error('Error getting tasks by user:', error);
      throw new Error('Failed to fetch user tasks');
    }
  }

  // Get tasks by status
  static async getTasksByStatus(status: 'pending' | 'in_progress' | 'completed' | 'cancelled'): Promise<Task[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', status),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        doneAt: doc.data().doneAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Task[];
    } catch (error) {
      console.error('Error getting tasks by status:', error);
      throw new Error('Failed to fetch tasks by status');
    }
  }

  // Get today's tasks
  static async getTodayTasks(): Promise<Task[]> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const q = query(
        collection(db, COLLECTION_NAME),
        where('date', '>=', startOfDay),
        where('date', '<', endOfDay),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        doneAt: doc.data().doneAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Task[];
    } catch (error) {
      console.error('Error getting today\'s tasks:', error);
      throw new Error('Failed to fetch today\'s tasks');
    }
  }

  // Get upcoming tasks
  static async getUpcomingTasks(days: number = 7): Promise<Task[]> {
    try {
      const today = new Date();
      const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));

      const q = query(
        collection(db, COLLECTION_NAME),
        where('date', '>=', today),
        where('date', '<=', futureDate),
        orderBy('date', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        doneAt: doc.data().doneAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Task[];
    } catch (error) {
      console.error('Error getting upcoming tasks:', error);
      throw new Error('Failed to fetch upcoming tasks');
    }
  }

  // Generate daily tasks (placeholder for automation)
  static async generateDailyTasks(): Promise<void> {
    try {
      // This would typically be called by a Firebase Cloud Function
      // For now, it's a placeholder for the scheduling logic
      console.log('Generating daily tasks...');
    } catch (error) {
      console.error('Error generating daily tasks:', error);
      throw new Error('Failed to generate daily tasks');
    }
  }

  // Generate daily tasks using the scheduling service
  static async generateScheduledTasks(
    assignedTo: string,
    postsPerDay: number = 20
  ): Promise<string[]> {
    try {
      const { SchedulingService } = await import('./scheduling-service');

      const taskIds = await SchedulingService.generateAndSaveDailyTasks(assignedTo, {
        postsPerDay,
      });

      console.log(`Generated ${taskIds.length} scheduled tasks`);
      return taskIds;
    } catch (error) {
      console.error('Error generating scheduled tasks:', error);
      throw new Error('Failed to generate scheduled tasks');
    }
  }

  // Generate weekly tasks (placeholder for automation)
  static async generateWeeklyTasks(): Promise<void> {
    try {
      // This would typically be called by a Firebase Cloud Function
      // For now, it's a placeholder for the scheduling logic
      console.log('Generating weekly tasks...');
    } catch (error) {
      console.error('Error generating weekly tasks:', error);
      throw new Error('Failed to generate weekly tasks');
    }
  }

  // Get task statistics
  static async getTaskStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  }> {
    try {
      const tasks = await this.getAllTasks();
      const today = new Date();

      return {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t =>
          t.status !== 'completed' &&
          t.date &&
          t.date < today
        ).length,
      };
    } catch (error) {
      console.error('Error getting task stats:', error);
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
      };
    }
  }
}