import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Modal } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AuthService from "../utils/auth.js";
import QRCodeGenerator from "../components/QRCodeGenerator.jsx";
import { usePassportData } from "../hooks/usePassportData.js";
import '../styles/Home.css';

const useManagedProfiles = () => {
  const [managedProfiles, setManagedProfiles] = useState([]);
  useEffect(() => {
    if (!AuthService.loggedIn()) return;
    const token = AuthService.getToken();
    fetch('/api/delegate/managed', {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    })
      .then(r => r.ok ? r.json() : { managedProfiles: [] })
      .then(d => setManagedProfiles(d.managedProfiles || []))
      .catch(() => {});
  }, []);
  return managedProfiles;
};

const ONBOARDING_KEY = 'onboarding_seen';

const Profile = () => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true);
    }
  }, []);

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const startPassport = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
    navigate('/create-passport');
  };

  // Get user info if logged in
  let user = null;
  try {
    user = AuthService.getProfile();
  } catch {
    // User not logged in, redirect would be handled by route protection
    user = null;
  }

  const { hasPassport, isLoading, displayName, passportCode, passportData } = usePassportData();
  const managedProfiles = useManagedProfiles();
  const viewCount = passportData?.passportViewCount || 0;

  // If no user, show a message (this page should be protected)
  if (!user) {
    return (
      <Container className="home-container">
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="home-card">
              <Card.Body className="text-center p-5">
                <h3>Please Log In</h3>
                <p>You need to be logged in to view your profile.</p>
                <Link to="/login" className="cta-button">
                  <FontAwesomeIcon icon="sign-in-alt" />
                  Sign In
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="home-container">
      {/* Onboarding welcome modal */}
      <Modal show={showOnboarding} onHide={dismissOnboarding} centered size="md">
        <Modal.Header closeButton>
          <Modal.Title>Welcome to Get2KnowMe! 👋</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="mb-3">
            Your account is ready. Now let's build your <strong>Communication Passport</strong> — a personal profile that helps others understand how to communicate with you.
          </p>
          <p className="mb-3">It takes about <strong>5 minutes</strong> and we'll guide you through it step by step. You can save a draft and come back any time.</p>
          <p className="text-muted small mb-0">Once it's done, you'll get a QR code to share with anyone — teachers, doctors, employers, or anyone you meet.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={dismissOnboarding}>I'll do it later</Button>
          <Button variant="primary" onClick={startPassport}>Let's build my passport →</Button>
        </Modal.Footer>
      </Modal>

      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          {/* Main Profile Card */}
          <Card className="home-card mb-4">
            <Card.Body className="p-5">
              <div className="welcome-message">
                {/* <h1 className="display-5 mb-3">
                  <FontAwesomeIcon icon="user-circle" className="me-2" />
                  My Profile
                </h1> */}
                <h3>
                  Hello, {displayName || user.username || user.email}!
                </h3>
                <p className="mb-4">
                  {isLoading
                    ? "Loading your passport status..."
                    : hasPassport
                    ? "This is where you can manage your Communication Passport and easily share it with others. Simply select Share My QR Code below and ask them to scan it with their smartphone camera and follow the link provided, or use Communication Passport lookup tools at get2know.me/passport-lookup to scan your QR code or enter your passcode." 
                    : "Create your Communication Passport to help others understand your communication needs."}
                </p>
              </div>

              {/* View count stat */}
              {hasPassport && viewCount > 0 && (
                <div className="mb-4">
                  <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                    <FontAwesomeIcon icon="eye" className="me-1" style={{ color: 'var(--primary-color)' }} />
                    Your passport has been viewed <strong>{viewCount}</strong> {viewCount === 1 ? 'time' : 'times'}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="cta-buttons">
                {!hasPassport && (
                  <Link
                    to="/create-passport"
                    className={`cta-button ${isLoading ? 'disabled' : ''}`}
                  >
                    <FontAwesomeIcon icon="id-card" />
                    {isLoading ? "Loading..." : "Create My Passport"}
                  </Link>
                )}
                {hasPassport && passportCode && (
                  <button
                    className="cta-button primary large"
                    onClick={() => setShowQRModal(true)}
                    title="Generate QR code to share your passport"
                  >
                    <FontAwesomeIcon icon="qrcode" />
                    Share My QR Code
                  </button>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Managed Profiles Card */}
          {managedProfiles.length > 0 && (
            <Card className="home-card mb-4">
              <Card.Body className="p-4">
                <h5>
                  <FontAwesomeIcon icon="users" className="me-2" style={{ color: 'var(--primary-color)' }} />
                  Profiles I Manage
                </h5>
                <p className="text-muted small mb-3">You have caregiver access to these passports.</p>
                <Row>
                  {managedProfiles.map(profile => (
                    <Col md={6} key={profile._id} className="mb-3">
                      <Link
                        to={profile.passcode ? `/passport/view/${profile.passcode}` : '#'}
                        className="quick-action-link"
                      >
                        <div className="quick-action-card">
                          {profile.profilePhoto ? (
                            <img
                              src={profile.profilePhoto}
                              alt={profile.displayName}
                              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <FontAwesomeIcon icon="id-card" />
                          )}
                          <span>{profile.displayName}</span>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {profile.permissions === 'edit' ? 'Can view & edit' : 'View only'}
                          </small>
                        </div>
                      </Link>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Quick Actions Card */}
          {hasPassport && (
            <Card className="home-card">
              <Card.Body className="p-4">
                <h5>
                  <FontAwesomeIcon icon="bolt" className="me-2" />
                  Quick Actions
                </h5>
                <Row className="mt-3">
                  <Col md={6} className="mb-3">
                    <Link to="/my-passport" className="quick-action-link">
                      <div className="quick-action-card">
                        <FontAwesomeIcon icon="eye" />
                        <span>View My Passport</span>
                      </div>
                    </Link>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Link to="/passport-lookup" className="quick-action-link">
                      <div className="quick-action-card">
                        <FontAwesomeIcon icon="search" />
                        <span>View Someone's Passport</span>
                      </div>
                    </Link>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Link to="/create-passport" className="quick-action-link">
                      <div className="quick-action-card">
                        <FontAwesomeIcon icon="edit" />
                        <span>Edit My Passport</span>
                      </div>
                    </Link>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Link to="/settings/profile" className="quick-action-link">
                      <div className="quick-action-card">
                        <FontAwesomeIcon icon="user-cog" />
                        <span>Account Settings</span>
                      </div>
                    </Link>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* QR Code Generator Modal */}
      {hasPassport && passportCode && (
        <QRCodeGenerator
          show={showQRModal}
          onHide={() => setShowQRModal(false)}
          passcode={passportCode}
          passportName={displayName}
        />
      )}
    </Container>
  );
};

export default Profile;
