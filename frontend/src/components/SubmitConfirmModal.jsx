import React, { useState } from 'react';
import api from '../api/client';
import { Button } from './ui/Button';
import { ErrorMessage } from './ui/ErrorMessage';

export default function SubmitConfirmModal({
  assignment,
  isOpen,
  hasGroup = true,
  onClose,
  onSuccess,
  onError409,
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !assignment) return null;

  const isGroup = hasGroup && assignment?.submission_type !== 'individual';

  const handleClose = () => {
    if (submitting) return;
    setStep(1);
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post(`/assignments/${assignment.id}/confirm`);
      handleClose();
      onSuccess(res.data.submission);
    } catch (err) {
      if (err?.response?.status === 409) {
        handleClose();
        onError409();
      } else {
        setError(err?.response?.data?.error || 'Failed to confirm submission');
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 1 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              1
            </span>
            <span className="text-slate-300">&mdash;</span>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 2 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              2
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Step {step} of 2
          </span>
        </div>

        {error && <ErrorMessage message={error} className="mb-4" onDismiss={() => setError('')} />}

        {/* Step 1: Upload verification */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 leading-snug">
                  Upload Verification
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-[260px] font-medium">
                  {assignment.title}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Have you uploaded your {isGroup ? "team's" : 'completed'} work to the OneDrive submission folder?
            </p>

            {assignment.onedrive_link && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium truncate max-w-[200px]">
                  {assignment.onedrive_link}
                </span>
                <a
                  href={assignment.onedrive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 font-semibold hover:underline flex items-center gap-1 flex-shrink-0 ml-2"
                >
                  Verify link &rarr;
                </a>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setStep(2)}>
                Yes, I have submitted
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Final confirmation (changes text based on isGroup) */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 leading-snug">
                  {isGroup ? 'Confirm Group Submission' : 'Confirm Individual Submission'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Final confirmation</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {isGroup
                ? 'Confirm submission for your whole group? This cannot be undone.'
                : 'Confirm your individual submission? This cannot be undone.'}
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1">
              {isGroup ? (
                <>
                  <p>• Your name will be recorded as the member who confirmed.</p>
                  <p>• All group members will have this assignment marked as submitted.</p>
                </>
              ) : (
                <>
                  <p>• Your submission will be recorded for your student account.</p>
                  <p>• Your professor will be notified of your individual submission.</p>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                loading={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
