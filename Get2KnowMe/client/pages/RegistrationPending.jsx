import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import '../styles/RegistrationPending.css';

const RegistrationPending = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address'); return; }
    setIsLoading(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/users/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (response.ok) {
        setSent(true);
        setStatus('A new confirmation link has been sent — please check your inbox and spam folder.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Could not send email. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="registration-pending-container">
      <h1 className="registration-pending-title">Registration Almost Complete!</h1>
      <p className="registration-pending-message">
        Thank you for registering. Please check your email inbox for a confirmation link to activate your account.
      </p>
      <p className="registration-pending-message">
        <strong>Can't find the email? Check your junk or spam folder.</strong>
      </p>

      {!sent ? (
        <div className="mt-4">
          <p className="registration-pending-message">Still nothing? Enter your email below to resend the confirmation link.</p>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleResend} className="d-flex flex-column align-items-center gap-2" style={{ maxWidth: '360px', margin: '0 auto' }}>
            <Form.Control
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" className="w-100" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Resend Confirmation Email'}
            </Button>
          </Form>
        </div>
      ) : (
        <Alert variant="success" className="mt-4" style={{ maxWidth: '400px', margin: '1rem auto 0' }}>
          {status}
        </Alert>
      )}
    </div>
  );
};

export default RegistrationPending;
