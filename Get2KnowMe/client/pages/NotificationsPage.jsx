import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AuthService from "../utils/auth.js";
import "../styles/Home.css";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!AuthService.loggedIn()) {
      navigate("/login");
      return;
    }
    fetchNotifications();
    markAllRead();
  }, [navigate]);

  const fetchNotifications = async () => {
    try {
      const token = AuthService.getToken();
      const res = await fetch("/api/notifications/?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      } else {
        setError("Failed to load notifications");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await AuthService.authenticatedFetch("/api/notifications/mark-all-read", { method: "PATCH" });
    } catch {
      // silently ignore
    }
  };

  const handleAcceptFollow = async (notif) => {
    setActionLoading(prev => ({ ...prev, [notif._id]: 'accepting' }));
    try {
      const res = await AuthService.authenticatedFetch(`/api/follow/accept/${notif.sender._id}`, { method: "POST" });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n._id === notif._id ? { ...n, actionTaken: true } : n)
        );
      }
    } catch {
      // silently ignore
    } finally {
      setActionLoading(prev => ({ ...prev, [notif._id]: null }));
    }
  };

  const handleRejectFollow = async (notif) => {
    setActionLoading(prev => ({ ...prev, [notif._id]: 'rejecting' }));
    try {
      const res = await AuthService.authenticatedFetch(`/api/follow/reject/${notif.sender._id}`, { method: "POST" });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n._id === notif._id ? { ...n, actionTaken: true } : n)
        );
      }
    } catch {
      // silently ignore
    } finally {
      setActionLoading(prev => ({ ...prev, [notif._id]: null }));
    }
  };

  const handleDelete = async (notifId) => {
    try {
      await AuthService.authenticatedFetch(`/api/notifications/${notifId}`, { method: "DELETE" });
      setNotifications(prev => prev.filter(n => n._id !== notifId));
    } catch {
      // silently ignore
    }
  };

  const getNotifIcon = (type) => {
    if (type === 'follow_request') return { icon: 'user-plus', color: '#4c93a1' };
    if (type === 'follow_accepted') return { icon: 'user-check', color: '#22c55e' };
    if (type === 'passport_update') return { icon: 'id-card', color: '#f59e0b' };
    return { icon: 'bell', color: '#6b7280' };
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading notifications...</p>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col lg={8}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">
              <FontAwesomeIcon icon="bell" className="me-2" style={{ color: 'var(--primary-color)' }} />
              Notifications
            </h2>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          {notifications.length === 0 ? (
            <Card className="home-card text-center p-5">
              <FontAwesomeIcon icon="bell" style={{ fontSize: '3rem', color: 'var(--text-muted)', opacity: 0.4 }} />
              <p className="text-muted mt-3 mb-0">You're all caught up — no notifications yet.</p>
            </Card>
          ) : (
            <div className="d-flex flex-column gap-3">
              {notifications.map(notif => {
                const { icon, color } = getNotifIcon(notif.type);
                const isLoading = actionLoading[notif._id];

                return (
                  <Card key={notif._id} className={`home-card ${!notif.read ? 'notification-unread' : ''}`}>
                    <Card.Body className="p-3">
                      <div className="d-flex gap-3 align-items-start">
                        <div
                          className="notification-icon-wrap flex-shrink-0"
                          style={{ background: `${color}20`, color }}
                        >
                          <FontAwesomeIcon icon={icon} />
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <p className="mb-1 fw-semibold" style={{ fontSize: '0.95rem' }}>{notif.title}</p>
                              <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>{notif.message}</p>
                            </div>
                            <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-2">
                              <small className="text-muted">{notif.timeAgo}</small>
                              <Button
                                variant="link"
                                size="sm"
                                className="text-muted p-0"
                                onClick={() => handleDelete(notif._id)}
                                title="Dismiss"
                              >
                                <FontAwesomeIcon icon="times" />
                              </Button>
                            </div>
                          </div>

                          {/* Action buttons */}
                          {notif.type === 'follow_request' && !notif.actionTaken && (
                            <div className="d-flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleAcceptFollow(notif)}
                                disabled={!!isLoading}
                                style={{ borderRadius: '20px', fontSize: '0.8rem' }}
                              >
                                {isLoading === 'accepting' ? <Spinner size="sm" animation="border" /> : 'Accept'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => handleRejectFollow(notif)}
                                disabled={!!isLoading}
                                style={{ borderRadius: '20px', fontSize: '0.8rem' }}
                              >
                                {isLoading === 'rejecting' ? <Spinner size="sm" animation="border" /> : 'Decline'}
                              </Button>
                            </div>
                          )}

                          {notif.type === 'follow_request' && notif.actionTaken && (
                            <small className="text-muted mt-1 d-block">Response sent</small>
                          )}

                          {notif.type === 'passport_update' && notif.data?.passcode && (
                            <div className="mt-2">
                              <Link
                                to={`/passport/view/${notif.data.passcode}`}
                                className="btn btn-sm btn-outline-primary"
                                style={{ borderRadius: '20px', fontSize: '0.8rem' }}
                              >
                                <FontAwesomeIcon icon="id-card" className="me-1" />
                                View Passport
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default NotificationsPage;
