/**
 * Integration Test for Task Notification Service
 *
 * This test demonstrates the notification system functionality.
 * Run this in the browser console or as a manual test.
 */

import { TaskNotificationService } from '../task-notification-service';

// Test data
const testTasks = [
  {
    id: 'test-task-1',
    title: 'Test Meeting',
    description: 'A test meeting for notification system',
    date: new Date().toISOString().split('T')[0], // Today
    time: new Date(Date.now() + 2 * 60 * 1000).toTimeString().substring(0, 5), // 2 minutes from now
    completed: false,
    source: 'calendar' as const,
  },
  {
    id: 'test-task-2',
    title: 'Test Call',
    description: 'A test call for notification system',
    date: new Date().toISOString().split('T')[0], // Today
    time: new Date(Date.now() + 5 * 60 * 1000).toTimeString().substring(0, 5), // 5 minutes from now
    completed: false,
    source: 'calendar' as const,
  },
];

export async function runNotificationIntegrationTest() {
  console.log('🧪 Starting Task Notification Integration Test');

  try {
    // Test 1: Initialize the service
    console.log('📋 Test 1: Initializing notification service...');
    await TaskNotificationService.initialize();
    console.log('✅ Service initialized successfully');

    // Test 2: Check permission status
    console.log('📋 Test 2: Checking notification permission...');
    const permission = TaskNotificationService.getNotificationPermission();
    console.log('ℹ️  Notification permission:', permission);

    if (permission !== 'granted') {
      console.log('⚠️  Notification permission not granted. Please allow notifications in your browser.');
      return;
    }

    // Test 3: Test notification
    console.log('📋 Test 3: Testing notification display...');
    TaskNotificationService.testNotification();
    console.log('✅ Test notification sent');

    // Test 4: Schedule notifications for test tasks
    console.log('📋 Test 4: Scheduling notifications for test tasks...');
    TaskNotificationService.updateNotifications(testTasks);
    console.log('✅ Notifications scheduled for test tasks');

    console.log('🎉 Integration test completed successfully!');
    console.log('⏰ Notifications should appear in 2 and 5 minutes respectively');
    console.log('🔊 You should hear the notification sound when they trigger');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

// Manual test functions for browser console
export function testNotificationNow() {
  console.log('🔔 Testing notification immediately...');
  TaskNotificationService.testNotification();
}

export function scheduleTestNotifications() {
  console.log('📅 Scheduling test notifications...');
  TaskNotificationService.updateNotifications(testTasks);
}

export function checkNotificationPermission() {
  const permission = TaskNotificationService.getNotificationPermission();
  console.log('🔐 Notification permission:', permission);
  return permission;
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  console.log('🚀 Task Notification Integration Test loaded');
  console.log('💡 Run the following commands in the console:');
  console.log('   - runNotificationIntegrationTest() // Full integration test');
  console.log('   - testNotificationNow() // Test notification immediately');
  console.log('   - scheduleTestNotifications() // Schedule test notifications');
  console.log('   - checkNotificationPermission() // Check permission status');

  // Make functions available globally for console testing
  (window as any).runNotificationIntegrationTest = runNotificationIntegrationTest;
  (window as any).testNotificationNow = testNotificationNow;
  (window as any).scheduleTestNotifications = scheduleTestNotifications;
  (window as any).checkNotificationPermission = checkNotificationPermission;
}