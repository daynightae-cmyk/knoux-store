'use client';

import { useId, useState } from 'react';

/**
 * Auth field.
 *
 * One implementation behind all three routes so the label, the error and the
 * password toggle are wired identically everywhere. Built on the site's
 * existing `.field` vocabulary rather than a new control language.
 *
 * Accessibility is carried by real semantics: a real `<label for>`, a real
 * `type`, `aria-invalid` and `aria-describedby` for the error, and a toggle
 * that reports its state through `aria-pressed` instead of a colour change.
 */

type FieldProps = {
  label: string;
  name: string;
  type?: 'email' | 'password' | 'text';
  autoComplete: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** Renders the visibility control. Only meaningful for a password field. */
  toggleable?: boolean;
  defaultValue?: string;
  disabled?: boolean;
};

export function AuthField({
  label,
  name,
  type = 'text',
  autoComplete,
  required = true,
  error,
  hint,
  toggleable = false,
  defaultValue,
  disabled = false,
}: FieldProps) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const [revealed, setRevealed] = useState(false);

  // The error is announced through the same description as the hint, so a
  // screen reader is given the reason without the message stealing focus.
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field auth-field ${error ? 'is-invalid' : ''}`} data-stagger={name}>
      <label htmlFor={fieldId}>{label}</label>

      <div className="auth-field__control">
        <input
          id={fieldId}
          name={name}
          // A revealed password stays a password field for password managers,
          // which key their behaviour off the autocomplete token.
          type={toggleable && revealed ? 'text' : type}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          spellCheck={false}
          autoCapitalize="none"
        />

        {toggleable ? (
          <button
            className="auth-field__toggle"
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-pressed={revealed}
            aria-controls={fieldId}
            // Names the action, so it never depends on the icon being read.
            aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            tabIndex={0}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {revealed ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.6 5.1A9.9 9.9 0 0112 5c5 0 9 4.5 10 7-.4 1-1.6 2.8-3.2 4.2" />
                  <path d="M6.2 6.2C3.9 7.8 2.2 10.3 2 12c1 2.5 5 7 10 7 1.4 0 2.7-.3 3.8-.8" />
                </>
              ) : (
                <>
                  <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7-1.5 0-2.9-.35-4.1-.95" />
                  <circle cx="12" cy="12" r="3.2" />
                </>
              )}
            </svg>
          </button>
        ) : null}
      </div>

      {hint ? (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}

      {error ? (
        <span className="auth-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
