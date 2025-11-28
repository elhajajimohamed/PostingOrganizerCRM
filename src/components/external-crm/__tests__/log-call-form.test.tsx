import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CallCentersList } from '../call-centers-list';
import { CallCenter } from '@/lib/types/external-crm';

// Mock the external dependencies
jest.mock('@/lib/services/phone-detection-service', () => ({
  PhoneDetectionService: {
    detectPhone: jest.fn(() => ({
      original: '+1234567890',
      phone_norm: '+1234567890',
      country_code: 'US',
      nsn: '234567890',
      is_mobile: true,
      whatsapp_confidence: 0.8,
      mobile_detection_reason: 'test'
    }))
  }
}));

// Mock fetch
global.fetch = jest.fn();

const mockCallCenters: CallCenter[] = [
  {
    id: '1',
    name: 'Test Call Center',
    country: 'Morocco',
    city: 'Casablanca',
    positions: 10,
    status: 'New',
    phones: ['+212600000000'],
    phone_infos: [{
      original: '+212600000000',
      phone_norm: '+212600000000',
      country_code: 'MA',
      nsn: '600000000',
      is_mobile: true,
      whatsapp_confidence: 0.8,
      mobile_detection_reason: 'test'
    }],
    emails: [],
    website: '',
    address: '',
    source: 'test',
    type: 'call-center',
    tags: [],
    markets: [],
    competitors: [],
    socialMedia: [],
    foundDate: '',
    lastContacted: null,
    notes: '',
    summary: '',
    destinations: [],
    no_whatsapp_phones: [],
    whatsapp_excluded_until: undefined,
    dnc_until: undefined,
    nwt_notification: false,
    satisfied_followup_date: undefined,
    satisfied_notification: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const mockProps = {
  callCenters: mockCallCenters,
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onBatchDelete: jest.fn(),
  onBatchTag: jest.fn(),
  hasMore: false,
  onLoadMore: jest.fn(),
  totalCount: 1,
  onViewDuplicates: jest.fn(),
};

describe('Log Call Form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true })
    });
  });

  it('should render Log Call button', () => {
    render(<CallCentersList {...mockProps} />);
    expect(screen.getByText('Log Call')).toBeInTheDocument();
  });

  it('should open Log Call dialog when button is clicked', async () => {
    const user = userEvent.setup();
    render(<CallCentersList {...mockProps} />);

    const logCallButton = screen.getByText('Log Call');
    await user.click(logCallButton);

    expect(screen.getByText('Log New Call')).toBeInTheDocument();
  });

  it('should display form fields in Log Call dialog', async () => {
    const user = userEvent.setup();
    render(<CallCentersList {...mockProps} />);

    const logCallButton = screen.getByText('Log Call');
    await user.click(logCallButton);

    expect(screen.getByLabelText(/Call Date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Call Time/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duration/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Call Outcome/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<CallCentersList {...mockProps} />);

    const logCallButton = screen.getByText('Log Call');
    await user.click(logCallButton);

    const saveButton = screen.getByText('Save Call Log');
    expect(saveButton).toBeDisabled();

    // Fill required fields
    const notesTextarea = screen.getByLabelText(/Notes/);
    await user.type(notesTextarea, 'Test call notes');

    // Select outcome
    const outcomeSelect = screen.getByLabelText(/Call Outcome/);
    await user.click(outcomeSelect);
    const connectedOption = screen.getByText('Connected');
    await user.click(connectedOption);

    // Should still be disabled if no phone is selected for answered calls
    expect(saveButton).toBeDisabled();

    // Select phone
    const phoneCheckbox = screen.getByDisplayValue('+212600000000');
    await user.click(phoneCheckbox);

    expect(saveButton).toBeEnabled();
  });

  it('should submit form with correct data', async () => {
    const user = userEvent.setup();
    render(<CallCentersList {...mockProps} />);

    const logCallButton = screen.getByText('Log Call');
    await user.click(logCallButton);

    // Fill form
    const notesTextarea = screen.getByLabelText(/Notes/);
    await user.type(notesTextarea, 'Test call notes');

    const outcomeSelect = screen.getByLabelText(/Call Outcome/);
    await user.click(outcomeSelect);
    const connectedOption = screen.getByText('Connected');
    await user.click(connectedOption);

    const phoneCheckbox = screen.getByDisplayValue('+212600000000');
    await user.click(phoneCheckbox);

    // Set time
    const timeInput = screen.getByLabelText(/Call Time/);
    await user.clear(timeInput);
    await user.type(timeInput, '14:30');

    const saveButton = screen.getByText('Save Call Log');
    await user.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/external-crm/daily-calls/call-log',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('14:30') // Time should be in the request
        })
      );
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    const user = userEvent.setup();
    render(<CallCentersList {...mockProps} />);

    const logCallButton = screen.getByText('Log Call');
    await user.click(logCallButton);

    // Fill required fields
    const notesTextarea = screen.getByLabelText(/Notes/);
    await user.type(notesTextarea, 'Test call notes');

    const outcomeSelect = screen.getByLabelText(/Call Outcome/);
    await user.click(outcomeSelect);
    const voicemailOption = screen.getByText('Voicemail');
    await user.click(voicemailOption);

    const saveButton = screen.getByText('Save Call Log');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Error saving call log/)).toBeInTheDocument();
    });
  });

  it('should close dialog after successful submission', async () => {
    const user = userEvent.setup();
    render(<CallCentersList {...mockProps} />);

    const logCallButton = screen.getByText('Log Call');
    await user.click(logCallButton);

    expect(screen.getByText('Log New Call')).toBeInTheDocument();

    // Fill required fields
    const notesTextarea = screen.getByLabelText(/Notes/);
    await user.type(notesTextarea, 'Test call notes');

    const outcomeSelect = screen.getByLabelText(/Call Outcome/);
    await user.click(outcomeSelect);
    const voicemailOption = screen.getByText('Voicemail');
    await user.click(voicemailOption);

    const saveButton = screen.getByText('Save Call Log');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByText('Log New Call')).not.toBeInTheDocument();
    });
  });

  it('should handle different call outcomes', async () => {
    const user = userEvent.setup();
    render(<CallCentersList {...mockProps} />);

    const logCallButton = screen.getByText('Log Call');
    await user.click(logCallButton);

    const outcomeSelect = screen.getByLabelText(/Call Outcome/);
    await user.click(outcomeSelect);

    // Check that all expected outcomes are available
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Voicemail')).toBeInTheDocument();
    expect(screen.getByText('No Answer')).toBeInTheDocument();
    expect(screen.getByText('Busy')).toBeInTheDocument();
    expect(screen.getByText('Wrong Number')).toBeInTheDocument();
    expect(screen.getByText('Callback Requested')).toBeInTheDocument();
  });

  it('should require disposition for answered calls', async () => {
    const user = userEvent.setup();
    render(<CallCentersList {...mockProps} />);

    const logCallButton = screen.getByText('Log Call');
    await user.click(logCallButton);

    // Fill notes
    const notesTextarea = screen.getByLabelText(/Notes/);
    await user.type(notesTextarea, 'Test call notes');

    // Select connected (answered call)
    const outcomeSelect = screen.getByLabelText(/Call Outcome/);
    await user.click(outcomeSelect);
    const connectedOption = screen.getByText('Connected');
    await user.click(connectedOption);

    // Select phone
    const phoneCheckbox = screen.getByDisplayValue('+212600000000');
    await user.click(phoneCheckbox);

    // Should require disposition
    const saveButton = screen.getByText('Save Call Log');
    expect(saveButton).toBeDisabled();

    // Select disposition
    const dispositionSelect = screen.getByLabelText(/Disposition/);
    await user.click(dispositionSelect);
    const interestedOption = screen.getByText('INT — Intéressé');
    await user.click(interestedOption);

    expect(saveButton).toBeEnabled();
  });
});