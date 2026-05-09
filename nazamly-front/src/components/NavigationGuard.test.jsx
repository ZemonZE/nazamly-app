import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router-dom';
import { NavigationGuard } from './NavigationGuard';

const TestPage = ({ hasUnsavedData, isGenerating, onConfirm, onCancel }) => {
  const navigate = useNavigate();
  
  return (
    <div>
      <h1>Test Page</h1>
      <NavigationGuard
        when={hasUnsavedData || isGenerating}
        message={
          isGenerating
            ? "AI schedule generation is in progress. Are you sure you want to leave?"
            : "You have unsaved schedule data. Are you sure you want to leave?"
        }
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
      <button onClick={() => navigate('/other')}>Navigate Away</button>
      <p>Has unsaved data: {hasUnsavedData ? 'Yes' : 'No'}</p>
      <p>Is generating: {isGenerating ? 'Yes' : 'No'}</p>
    </div>
  );
};

const OtherPage = () => <div><h1>Other Page</h1></div>;

const renderWithRouter = (initialProps = {}) => {
  const defaultProps = {
    hasUnsavedData: false,
    isGenerating: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  
  const props = { ...defaultProps, ...initialProps };
  
  const router = createMemoryRouter(
    [
      {
        path: '/test',
        element: <TestPage {...props} />,
      },
      {
        path: '/other',
        element: <OtherPage />,
      },
    ],
    {
      initialEntries: ['/test'],
      initialIndex: 0,
    }
  );
  
  return {
    ...render(<RouterProvider router={router} />),
    props,
    router,
  };
};

describe('NavigationGuard', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('when form has unsaved data', () => {
    it('should block navigation when hasUnsavedData is true', async () => {
      renderWithRouter({ hasUnsavedData: true });
      
      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.getByText('Has unsaved data: Yes')).toBeInTheDocument();
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Navigation')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/you have unsaved schedule data/i)).toBeInTheDocument();
      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.queryByText('Other Page')).not.toBeInTheDocument();
    });

    it('should show correct message for unsaved data', async () => {
      renderWithRouter({ hasUnsavedData: true });
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/you have unsaved schedule data/i)).toBeInTheDocument();
      });
    });

    it('should cancel navigation when "Stay" button is clicked', async () => {
      const onCancel = vi.fn();
      renderWithRouter({ hasUnsavedData: true, onCancel });
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Navigation')).toBeInTheDocument();
      });
      
      const stayButton = screen.getByRole('button', { name: /stay/i });
      await user.click(stayButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Confirm Navigation')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.queryByText('Other Page')).not.toBeInTheDocument();
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should allow navigation when "Leave" button is clicked', async () => {
      const onConfirm = vi.fn();
      renderWithRouter({ hasUnsavedData: true, onConfirm });
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Navigation')).toBeInTheDocument();
      });
      
      const leaveButton = screen.getByRole('button', { name: /leave/i });
      await user.click(leaveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Other Page')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Test Page')).not.toBeInTheDocument();
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('when AI generation is in progress', () => {
    it('should block navigation when isGenerating is true', async () => {
      renderWithRouter({ isGenerating: true });
      
      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.getByText('Is generating: Yes')).toBeInTheDocument();
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Navigation')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/ai schedule generation is in progress/i)).toBeInTheDocument();
      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.queryByText('Other Page')).not.toBeInTheDocument();
    });

    it('should show correct message for AI generation', async () => {
      renderWithRouter({ isGenerating: true });
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/ai schedule generation is in progress/i)).toBeInTheDocument();
      });
    });

    it('should cancel navigation when "Stay" button is clicked during AI generation', async () => {
      const onCancel = vi.fn();
      renderWithRouter({ isGenerating: true, onCancel });
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Navigation')).toBeInTheDocument();
      });
      
      const stayButton = screen.getByRole('button', { name: /stay/i });
      await user.click(stayButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Confirm Navigation')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.queryByText('Other Page')).not.toBeInTheDocument();
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should allow navigation when "Leave" button is clicked during AI generation', async () => {
      const onConfirm = vi.fn();
      renderWithRouter({ isGenerating: true, onConfirm });
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Navigation')).toBeInTheDocument();
      });
      
      const leaveButton = screen.getByRole('button', { name: /leave/i });
      await user.click(leaveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Other Page')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Test Page')).not.toBeInTheDocument();
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('when no unsaved work exists', () => {
    it('should allow navigation without showing dialog', async () => {
      renderWithRouter({ hasUnsavedData: false, isGenerating: false });
      
      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.getByText('Has unsaved data: No')).toBeInTheDocument();
      expect(screen.getByText('Is generating: No')).toBeInTheDocument();
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Other Page')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Confirm Navigation')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Page')).not.toBeInTheDocument();
    });

    it('should not call onConfirm or onCancel when navigation is not blocked', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      renderWithRouter({ hasUnsavedData: false, isGenerating: false, onConfirm, onCancel });
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Other Page')).toBeInTheDocument();
      });
      
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('dialog behavior', () => {
    it('should display "Stay" button with outline variant', async () => {
      renderWithRouter({ hasUnsavedData: true });
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        const stayButton = screen.getByRole('button', { name: /stay/i });
        expect(stayButton).toBeInTheDocument();
      });
    });

    it('should display "Leave" button with destructive variant', async () => {
      renderWithRouter({ hasUnsavedData: true });
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        const leaveButton = screen.getByRole('button', { name: /leave/i });
        expect(leaveButton).toBeInTheDocument();
      });
    });

    it('should display dialog title "Confirm Navigation"', async () => {
      renderWithRouter({ hasUnsavedData: true });
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Navigation')).toBeInTheDocument();
      });
    });
  });

  describe('combined conditions', () => {
    it('should block navigation when both hasUnsavedData and isGenerating are true', async () => {
      renderWithRouter({ hasUnsavedData: true, isGenerating: true });
      
      const navigateButton = screen.getByRole('button', { name: /navigate away/i });
      await user.click(navigateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Navigation')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/ai schedule generation is in progress/i)).toBeInTheDocument();
      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.queryByText('Other Page')).not.toBeInTheDocument();
    });
  });
});
