import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AuthService from "../../utils/auth.js";
import "../../styles/Home.css";

const CaregiverSettings = () => {
  const [delegates, setDelegates] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [managedProfiles, setManagedProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState("");
  const [invitePermissions, setInvitePermissions] = useState("view");
  const [acceptToken, setAcceptToken] = useState("");
  const [generating, setGenerating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = AuthService.getToken();
      const [delegateRes, managedRes] = await Promise.all([
        fetch("/api/delegate/delegates", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include"
        }),
        fetch("/api/delegate/managed", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include"
        })
      ]);

      if (delegateRes.ok) {
        const d = await delegateRes.json();
        setDelegates(d.delegates || []);
        setPendingInvites(d.pendingInvites || []);
      }
      if (managedRes.ok) {
        const m = await managedRes.json();
        setManagedProfiles(m.managedProfiles || []);
      }
    } catch {
      setMessage({ type: "danger", text: "Failed to load caregiver settings." });
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async () => {
    setGenerating(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await AuthService.authenticatedFetch("/api/delegate/invite", {
        method: "POST",
        body: JSON.stringify({ permissions: invitePermissions })
      });
      if (res.ok) {
        const data = await res.json();
        setInviteToken(data.token);
        setPendingInvites(prev => [...prev, data]);
        setMessage({ type: "success", text: "Invite token generated! Share it with your caregiver." });
      } else {
        setMessage({ type: "danger", text: "Failed to generate invite." });
      }
    } catch {
      setMessage({ type: "danger", text: "Network error." });
    } finally {
      setGenerating(false);
    }
  };

  const acceptInvite = async (e) => {
    e.preventDefault();
    if (!acceptToken.trim()) return;
    setAccepting(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await AuthService.authenticatedFetch(`/api/delegate/accept/${acceptToken.trim()}`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: `You now have ${data.permissions} access to ${data.owner.username}'s passport.` });
        setAcceptToken("");
        fetchData();
      } else {
        const err = await res.json();
        setMessage({ type: "danger", text: err.error || "Invalid or expired token." });
      }
    } catch {
      setMessage({ type: "danger", text: "Network error." });
    } finally {
      setAccepting(false);
    }
  };

  const removeDelegate = async (userId) => {
    try {
      const res = await AuthService.authenticatedFetch(`/api/delegate/delegate/${userId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setDelegates(prev => prev.filter(d => d._id !== userId));
        setMessage({ type: "success", text: "Delegate removed." });
      }
    } catch {
      setMessage({ type: "danger", text: "Failed to remove delegate." });
    }
  };

  const revokeManaged = async (ownerId) => {
    try {
      const res = await AuthService.authenticatedFetch(`/api/delegate/managed/${ownerId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setManagedProfiles(prev => prev.filter(p => p._id !== ownerId));
        setMessage({ type: "success", text: "Access revoked." });
      }
    } catch {
      setMessage({ type: "danger", text: "Failed to revoke access." });
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col lg={8}>
          <h2 className="fw-bold mb-1">
            <FontAwesomeIcon icon="users" className="me-2" style={{ color: 'var(--primary-color)' }} />
            Caregiver Access
          </h2>
          <p className="text-muted mb-4">
            Allow trusted people to view (or edit) your passport, or accept access to manage someone else's.
          </p>

          {message.text && (
            <Alert variant={message.type} dismissible onClose={() => setMessage({ type: "", text: "" })}>
              {message.text}
            </Alert>
          )}

          {/* Section 1: Grant access to a caregiver */}
          <Card className="home-card mb-4">
            <Card.Body className="p-4">
              <h5 className="fw-semibold mb-3">
                <FontAwesomeIcon icon="user-plus" className="me-2" style={{ color: 'var(--primary-color)' }} />
                Grant Someone Access to My Passport
              </h5>
              <p className="text-muted small mb-3">
                Generate a one-time token and share it with your caregiver. They enter it in the "Accept Access" section. Tokens expire in 7 days.
              </p>
              <Form.Group className="mb-3">
                <Form.Label>Access Level</Form.Label>
                <Form.Select
                  value={invitePermissions}
                  onChange={e => setInvitePermissions(e.target.value)}
                  style={{ maxWidth: 280 }}
                >
                  <option value="view">View only</option>
                  <option value="edit">View and edit</option>
                </Form.Select>
              </Form.Group>
              <Button
                onClick={generateInvite}
                disabled={generating}
                className="cta-button"
                style={{ fontSize: '0.9rem', padding: '10px 20px' }}
              >
                {generating ? <Spinner size="sm" animation="border" className="me-1" /> : <FontAwesomeIcon icon="key" className="me-1" />}
                Generate Invite Token
              </Button>

              {inviteToken && (
                <div className="mt-3 p-3 rounded" style={{ background: 'var(--neutral-bg)', border: '1px solid var(--border-color)' }}>
                  <small className="text-muted d-block mb-1">Share this token with your caregiver:</small>
                  <code style={{ fontSize: '1rem', wordBreak: 'break-all', color: 'var(--primary-color)' }}>
                    {inviteToken}
                  </code>
                </div>
              )}

              {pendingInvites.length > 0 && (
                <div className="mt-3">
                  <small className="text-muted fw-semibold">Active invite tokens:</small>
                  {pendingInvites.map((inv, i) => (
                    <div key={i} className="d-flex justify-content-between align-items-center mt-1">
                      <code style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {inv.token.slice(0, 12)}...
                      </code>
                      <Badge bg="secondary" className="ms-2">{inv.permissions}</Badge>
                      <small className="text-muted ms-auto">
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Section 2: Current delegates */}
          <Card className="home-card mb-4">
            <Card.Body className="p-4">
              <h5 className="fw-semibold mb-3">
                <FontAwesomeIcon icon="shield-alt" className="me-2" style={{ color: 'var(--primary-color)' }} />
                People With Access to My Passport
              </h5>
              {delegates.length === 0 ? (
                <p className="text-muted small mb-0">No one has access to your passport yet.</p>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {delegates.map(d => (
                    <div key={d._id} className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: 'var(--neutral-bg)', border: '1px solid var(--border-color)' }}>
                      <div>
                        <span className="fw-semibold">{d.username}</span>
                        <Badge bg={d.permissions === 'edit' ? 'warning' : 'info'} className="ms-2" style={{ fontSize: '0.7rem' }}>
                          {d.permissions === 'edit' ? 'Edit access' : 'View only'}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        style={{ borderRadius: '20px', fontSize: '0.75rem' }}
                        onClick={() => removeDelegate(d._id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Section 3: Accept access to someone else's passport */}
          <Card className="home-card mb-4">
            <Card.Body className="p-4">
              <h5 className="fw-semibold mb-3">
                <FontAwesomeIcon icon="key" className="me-2" style={{ color: 'var(--primary-color)' }} />
                Accept Caregiver Access
              </h5>
              <p className="text-muted small mb-3">
                Enter a token shared with you to gain access to someone's passport.
              </p>
              <Form onSubmit={acceptInvite} className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder="Paste invite token here"
                  value={acceptToken}
                  onChange={e => setAcceptToken(e.target.value)}
                />
                <Button type="submit" disabled={accepting || !acceptToken.trim()} className="cta-button" style={{ fontSize: '0.9rem', padding: '10px 20px', whiteSpace: 'nowrap' }}>
                  {accepting ? <Spinner size="sm" animation="border" /> : 'Accept'}
                </Button>
              </Form>
            </Card.Body>
          </Card>

          {/* Section 4: Profiles I manage */}
          <Card className="home-card">
            <Card.Body className="p-4">
              <h5 className="fw-semibold mb-3">
                <FontAwesomeIcon icon="id-card" className="me-2" style={{ color: 'var(--primary-color)' }} />
                Passports I Manage
              </h5>
              {managedProfiles.length === 0 ? (
                <p className="text-muted small mb-0">You don't have access to any passports yet.</p>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {managedProfiles.map(p => (
                    <div key={p._id} className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: 'var(--neutral-bg)', border: '1px solid var(--border-color)' }}>
                      <div className="d-flex align-items-center gap-2">
                        {p.profilePhoto ? (
                          <img src={p.profilePhoto} alt={p.displayName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FontAwesomeIcon icon="user" style={{ color: 'white', fontSize: '0.9rem' }} />
                          </div>
                        )}
                        <div>
                          <span className="fw-semibold">{p.displayName}</span>
                          <Badge bg={p.permissions === 'edit' ? 'warning' : 'info'} className="ms-2" style={{ fontSize: '0.7rem' }}>
                            {p.permissions === 'edit' ? 'Edit access' : 'View only'}
                          </Badge>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        {p.passcode && (
                          <Link
                            to={`/passport/view/${p.passcode}`}
                            className="btn btn-sm btn-outline-primary"
                            style={{ borderRadius: '20px', fontSize: '0.75rem' }}
                          >
                            View
                          </Link>
                        )}
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          style={{ borderRadius: '20px', fontSize: '0.75rem' }}
                          onClick={() => revokeManaged(p._id)}
                        >
                          Leave
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CaregiverSettings;
