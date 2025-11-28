import React from 'react';
import { render, screen } from '@testing-library/react';
import { InteractionHistory } from '../interaction-history';
import { CallLog } from '@/lib/types/external-crm';

// Mock the external services
jest.mock('@/lib/services/external-crm-service', () => ({
  ExternalCRMSubcollectionsService: {
    getSteps: jest.fn().mockResolvedValue([]),
    getCallHistory: jest.fn(),
    getRecharges: jest.fn().mockResolvedValue([])
  }
}));

const mockCallLogs: CallLog[] = [
  {
    id: '1',
    date: '2025-11-19T14:30:00.000Z', // 2:30 PM UTC
    duration: 15,
    outcome: 'connected',
    notes: 'Successful call',
    followUp: 'Follow up next week',
    callTime: '14:30'
  },
  {
    id: '2',
    date: '2025-11-19T09:15:00.000Z', // 9:15 AM UTC
    duration: 5,
    outcome: 'voicemail',
    notes: 'Left message',
    followUp: '',
    callTime: '09:15'
  },
  {
    id: '3',
    date: '2025-11-19T00:00:00.000Z', // Midnight UTC (should show callTime)
    duration: 0,
    outcome: 'no-answer',
    notes: 'No answer',
    followUp: '',
    callTime: '16:45'
  }
];

describe('InteractionHistory Call Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display call time correctly when callTime is available', async () => {
    // Mock the service to return our test data
    const { ExternalCRMSubcollectionsService } = require('@/lib/services/external-crm-service');
    ExternalCRMSubcollectionsService.getCallHistory.mockResolvedValue(mockCallLogs);

    render(<InteractionHistory callCenterId="test-id" callCenterName="Test Center" />);

    // Wait for the data to load
    await screen.findByText('Call History (3)');

    // Check that call times are displayed correctly
    expect(screen.getByText('11/19/2025 at 14:30')).toBeInTheDocument();
    expect(screen.getByText('11/19/2025 at 09:15')).toBeInTheDocument();
    expect(screen.getByText('11/19/2025 at 16:45')).toBeInTheDocument();
  });

  it('should handle calls without callTime gracefully', async () => {
    const callLogsWithoutTime: CallLog[] = [
      {
        id: '1',
        date: '2025-11-19T14:30:00.000Z',
        duration: 15,
        outcome: 'connected',
        notes: 'Call without time',
        followUp: '',
        // No callTime field
      }
    ];

    const { ExternalCRMSubcollectionsService } = require('@/lib/services/external-crm-service');
    ExternalCRMSubcollectionsService.getCallHistory.mockResolvedValue(callLogsWithoutTime);

    render(<InteractionHistory callCenterId="test-id" callCenterName="Test Center" />);

    await screen.findByText('Call History (1)');

    // Should display N/A when callTime is not available
    expect(screen.getByText('11/19/2025 at N/A')).toBeInTheDocument();
  });

  it('should display call outcomes correctly', async () => {
    const { ExternalCRMSubcollectionsService } = require('@/lib/services/external-crm-service');
    ExternalCRMSubcollectionsService.getCallHistory.mockResolvedValue(mockCallLogs);

    render(<InteractionHistory callCenterId="test-id" callCenterName="Test Center" />);

    await screen.findByText('Call History (3)');

    expect(screen.getByText('connected')).toBeInTheDocument();
    expect(screen.getByText('voicemail')).toBeInTheDocument();
    expect(screen.getByText('no-answer')).toBeInTheDocument();
  });

  it('should display duration when greater than 0', async () => {
    const { ExternalCRMSubcollectionsService } = require('@/lib/services/external-crm-service');
    ExternalCRMSubcollectionsService.getCallHistory.mockResolvedValue(mockCallLogs);

    render(<InteractionHistory callCenterId="test-id" callCenterName="Test Center" />);

    await screen.findByText('Call History (3)');

    expect(screen.getByText('15min')).toBeInTheDocument();
    expect(screen.getByText('5min')).toBeInTheDocument();
  });

  it('should not display duration when 0', async () => {
    const { ExternalCRMSubcollectionsService } = require('@/lib/services/external-crm-service');
    ExternalCRMSubcollectionsService.getCallHistory.mockResolvedValue(mockCallLogs);

    render(<InteractionHistory callCenterId="test-id" callCenterName="Test Center" />);

    await screen.findByText('Call History (3)');

    // The third call has duration 0, so no "0min" should appear
    expect(screen.queryByText('0min')).not.toBeInTheDocument();
  });

  it('should display follow-up notes when available', async () => {
    const { ExternalCRMSubcollectionsService } = require('@/lib/services/external-crm-service');
    ExternalCRMSubcollectionsService.getCallHistory.mockResolvedValue(mockCallLogs);

    render(<InteractionHistory callCenterId="test-id" callCenterName="Test Center" />);

    await screen.findByText('Call History (3)');

    expect(screen.getByText('Follow-up needed:')).toBeInTheDocument();
    expect(screen.getByText('Follow up next week')).toBeInTheDocument();
  });

  it('should show empty state when no calls', async () => {
    const { ExternalCRMSubcollectionsService } = require('@/lib/services/external-crm-service');
    ExternalCRMSubcollectionsService.getCallHistory.mockResolvedValue([]);

    render(<InteractionHistory callCenterId="test-id" callCenterName="Test Center" />);

    await screen.findByText('Call History (0)');

    expect(screen.getByText('No call history yet.')).toBeInTheDocument();
    expect(screen.getByText('Start logging your calls to track communication history.')).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    render(<InteractionHistory callCenterId="test-id" callCenterName="Test Center" />);

    // Should show some loading indicator or empty state initially
    expect(screen.getByText('Interaction History - Test Center')).toBeInTheDocument();
  });
});