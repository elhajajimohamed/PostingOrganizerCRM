import { TaskNotificationService } from '../task-notification-service';

// Mock the Notification API
const mockNotification = {
  show: jest.fn(),
  close: jest.fn(),
  onclick: jest.fn(),
};

Object.defineProperty(window, 'Notification', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockNotification),
});

window.Notification.requestPermission = jest.fn();

// Mock Notification.permission as a getter
Object.defineProperty(window.Notification, 'permission', {
  get: jest.fn(() => 'default'),
  set: jest.fn(),
  configurable: true,
});

// Mock HTMLAudioElement
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  currentTime: 0,
  volume: 1,
};

Object.defineProperty(window, 'HTMLAudioElement', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockAudio),
});

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('TaskNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Reset service state
    (TaskNotificationService as any).notificationPermission = 'default';
    (TaskNotificationService as any).scheduledNotifications = new Map();
    (TaskNotificationService as any).audio = null;
  });

  describe('initialize', () => {
    it('should request notification permission', async () => {
      (window.Notification.requestPermission as jest.Mock).mockResolvedValue('granted');

      await TaskNotificationService.initialize();

      expect(window.Notification.requestPermission).toHaveBeenCalled();
      expect((TaskNotificationService as any).notificationPermission).toBe('granted');
    });

    it('should handle denied permission', async () => {
      (window.Notification.requestPermission as jest.Mock).mockResolvedValue('denied');

      await TaskNotificationService.initialize();

      expect((TaskNotificationService as any).notificationPermission).toBe('denied');
    });

    it('should initialize audio element', async () => {
      (window.Notification.requestPermission as jest.Mock).mockResolvedValue('granted');

      await TaskNotificationService.initialize();

      expect((TaskNotificationService as any).audio).toBeInstanceOf(window.HTMLAudioElement);
      expect((TaskNotificationService as any).audio.volume).toBe(0.7);
    });
  });

  describe('scheduleNotification', () => {
    beforeEach(async () => {
      (window.Notification.requestPermission as jest.Mock).mockResolvedValue('granted');
      await TaskNotificationService.initialize();
    });

    it('should not schedule notification for completed tasks', () => {
      const task = {
        id: '1',
        title: 'Test Task',
        time: '12:00',
        date: '2025-11-27',
        completed: true,
        source: 'calendar' as const,
      };

      TaskNotificationService['scheduleNotification'](task);

      expect(setTimeout).not.toHaveBeenCalled();
    });

    it('should not schedule notification for tasks without time', () => {
      const task = {
        id: '1',
        title: 'Test Task',
        date: '2025-11-27',
        completed: false,
        source: 'calendar' as const,
      };

      TaskNotificationService['scheduleNotification'](task);

      expect(setTimeout).not.toHaveBeenCalled();
    });

    it('should schedule notification 10 minutes before task time', () => {
      const task = {
        id: '1',
        title: 'Test Task',
        time: '12:00',
        date: '2025-11-27',
        completed: false,
        source: 'calendar' as const,
      };

      // Mock current time as 11:00
      jest.setSystemTime(new Date('2025-11-27T10:00:00'));

      TaskNotificationService['scheduleNotification'](task);

      // Should schedule for 10:50 (10 minutes before 11:00)
      expect(setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        50 * 60 * 1000 // 50 minutes in milliseconds
      );
    });

    it('should not schedule notification for past tasks', () => {
      const task = {
        id: '1',
        title: 'Test Task',
        time: '10:00', // Past time
        date: '2025-11-27',
        completed: false,
        source: 'calendar' as const,
      };

      // Mock current time as 11:00
      jest.setSystemTime(new Date('2025-11-27T10:00:00'));

      TaskNotificationService['scheduleNotification'](task);

      expect(setTimeout).not.toHaveBeenCalled();
    });
  });

  describe('showNotification', () => {
    beforeEach(async () => {
      (window.Notification.requestPermission as jest.Mock).mockResolvedValue('granted');
      await TaskNotificationService.initialize();
    });

    it('should create notification with correct parameters', () => {
      TaskNotificationService['showNotification']('Test Title', 'Test Body', 'task-1');

      expect(window.Notification).toHaveBeenCalledWith('Test Title', {
        body: 'Test Body',
        icon: '/favicon.ico',
        tag: 'task-task-1',
        requireInteraction: false,
        silent: false,
      });
    });

    it('should play notification sound', () => {
      TaskNotificationService['showNotification']('Test Title', 'Test Body', 'task-1');

      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should auto-close notification after 5 seconds', () => {
      TaskNotificationService['showNotification']('Test Title', 'Test Body', 'task-1');

      expect(setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        5000
      );
    });
  });

  describe('updateNotifications', () => {
    beforeEach(async () => {
      (window.Notification.requestPermission as jest.Mock).mockResolvedValue('granted');
      await TaskNotificationService.initialize();
    });

    it('should clear existing notifications and schedule new ones', () => {
      const tasks = [
        {
          id: '1',
          title: 'Task 1',
          time: '12:00',
          date: '2025-11-27',
          completed: false,
          source: 'calendar' as const,
        },
        {
          id: '2',
          title: 'Task 2',
          time: '13:00',
          date: '2025-11-27',
          completed: false,
          source: 'calendar' as const,
        },
      ];

      // Mock current time
      jest.setSystemTime(new Date('2025-11-27T10:00:00'));

      TaskNotificationService.updateNotifications(tasks);

      expect(setTimeout).toHaveBeenCalledTimes(2);
    });

    it('should only schedule notifications for pending tasks with times', () => {
      const tasks = [
        {
          id: '1',
          title: 'Completed Task',
          time: '12:00',
          date: '2025-11-27',
          completed: true,
          source: 'calendar' as const,
        },
        {
          id: '2',
          title: 'Task without time',
          date: '2025-11-27',
          completed: false,
          source: 'calendar' as const,
        },
        {
          id: '3',
          title: 'Valid Task',
          time: '12:00',
          date: '2025-11-27',
          completed: false,
          source: 'calendar' as const,
        },
      ];

      // Mock current time
      jest.setSystemTime(new Date('2025-11-27T10:00:00'));

      TaskNotificationService.updateNotifications(tasks);

      expect(setTimeout).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should clear all scheduled notifications', () => {
      // Add some mock timeouts
      (TaskNotificationService as any).scheduledNotifications.set('task1', 123);
      (TaskNotificationService as any).scheduledNotifications.set('task2', 456);

      TaskNotificationService.cleanup();

      expect(clearTimeout).toHaveBeenCalledWith(123);
      expect(clearTimeout).toHaveBeenCalledWith(456);
      expect((TaskNotificationService as any).scheduledNotifications.size).toBe(0);
    });
  });

  describe('testNotification', () => {
    beforeEach(async () => {
      (window.Notification.requestPermission as jest.Mock).mockResolvedValue('granted');
      await TaskNotificationService.initialize();
    });

    it('should show test notification', () => {
      TaskNotificationService.testNotification();

      expect(window.Notification).toHaveBeenCalledWith('Test Notification', {
        body: 'This is a test of the task notification system',
        icon: '/favicon.ico',
        tag: 'task-test',
        requireInteraction: false,
        silent: false,
      });
    });
  });
});