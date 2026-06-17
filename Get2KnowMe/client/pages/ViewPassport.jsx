// client/pages/ViewPassport.jsx
import React, { useState, useEffect } from "react";
import { Container, Spinner, Alert, Button } from "react-bootstrap";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import CommunicationPassport from "../components/CommunicationPassport.jsx";
import AuthService from "../utils/auth.js";
import "../styles/ViewPassport.css";

const ViewPassport = () => {
  const { passcode } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [passcode]);

  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [showTrustedContact, setShowTrustedContact] = useState(false);

  // Follow state
  const [followStatus, setFollowStatus] = useState(null); // null | { isSelf, isFollowing, requestSent, isBlocked }
  const [followLoading, setFollowLoading] = useState(false);

  const currentUser = AuthService.loggedIn() ? AuthService.getProfile() : null;

  useEffect(() => {
    if (passcode) {
      fetchPassport(passcode);
    } else {
      setError("No passcode provided");
      setLoading(false);
    }
  }, [passcode]);

  const fetchPassport = async (code) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/passport/public/${code}`);

      if (response.ok) {
        const data = await response.json();
        setPassport(data.passport);
        // Fetch follow status if user is logged in and this isn't their own passport
        if (currentUser && data.passport.ownerId) {
          fetchFollowStatus(data.passport.ownerId);
        }
      } else if (response.status === 404) {
        setError("Communication Passport not found. Please check the passcode and try again.");
      } else {
        setError("Unable to load Communication Passport. Please try again later.");
      }
    } catch (err) {
      console.error("Error fetching passport:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStatus = async (ownerId) => {
    try {
      const token = AuthService.getToken();
      const res = await fetch(`/api/follow/status/${ownerId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setFollowStatus(data);
      }
    } catch (err) {
      console.error("Error fetching follow status:", err);
    }
  };

  const handleFollow = async () => {
    if (!passport?.ownerId) return;
    setFollowLoading(true);
    try {
      const res = await AuthService.authenticatedFetch(`/api/follow/request/${passport.ownerId}`, {
        method: 'POST'
      });
      if (res.ok) {
        setFollowStatus(prev => ({ ...prev, requestSent: true }));
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!passport?.ownerId) return;
    setFollowLoading(true);
    try {
      const res = await AuthService.authenticatedFetch(`/api/follow/unfollow/${passport.ownerId}`, {
        method: 'POST'
      });
      if (res.ok) {
        setFollowStatus(prev => ({ ...prev, isFollowing: false }));
      }
    } catch (err) {
      console.error("Unfollow error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!passport?.ownerId) return;
    setFollowLoading(true);
    try {
      const res = await AuthService.authenticatedFetch(`/api/follow/request/cancel/${passport.ownerId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setFollowStatus(prev => ({ ...prev, requestSent: false }));
      }
    } catch (err) {
      console.error("Cancel request error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const renderFollowButton = () => {
    if (!currentUser || !passport?.ownerId) return null;
    if (!followStatus) return null;
    if (followStatus.isSelf || followStatus.isBlocked) return null;

    if (followStatus.isFollowing) {
      return (
        <Button
          variant="outline-light"
          size="sm"
          onClick={handleUnfollow}
          disabled={followLoading}
          className="passport-follow-btn"
        >
          <FontAwesomeIcon icon="user-check" className="me-1" />
          Following
        </Button>
      );
    }

    if (followStatus.requestSent) {
      return (
        <Button
          variant="outline-light"
          size="sm"
          onClick={handleCancelRequest}
          disabled={followLoading}
          className="passport-follow-btn"
        >
          <FontAwesomeIcon icon="clock" className="me-1" />
          Request Sent
        </Button>
      );
    }

    return (
      <Button
        variant="light"
        size="sm"
        onClick={handleFollow}
        disabled={followLoading}
        className="passport-follow-btn"
      >
        <FontAwesomeIcon icon="user-plus" className="me-1" />
        Follow
      </Button>
    );
  };

  if (loading) {
    return (
      <Container className="view-passport-container d-flex justify-content-center align-items-center">
        <div className="text-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <p className="mt-3 text-muted">Loading Communication Passport...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="view-passport-container">
        <Alert variant="danger" className="text-center mt-4">
          <Alert.Heading>Unable to Load Passport</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={() => navigate("/")} className="btn-secondary">
            Return to Homepage
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!passport) {
    return (
      <Container className="view-passport-container">
        <Alert variant="warning" className="text-center mt-4">
          <Alert.Heading>Passport Not Found</Alert.Heading>
          <p>The requested Communication Passport could not be found.</p>
          <Button variant="outline-warning" onClick={() => navigate("/")} className="btn-secondary">
            Return to Homepage
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="view-passport-container py-4">
      <CommunicationPassport
        passport={passport}
        profilePhoto={passport.profilePhoto || null}
        showQRModal={showQRModal}
        setShowQRModal={setShowQRModal}
        showTrustedContact={showTrustedContact}
        setShowTrustedContact={setShowTrustedContact}
        isOwner={false}
        passcode={passcode}
        viewCount={passport.passportViewCount}
        followButton={renderFollowButton()}
      />
    </Container>
  );
};

export default ViewPassport;
