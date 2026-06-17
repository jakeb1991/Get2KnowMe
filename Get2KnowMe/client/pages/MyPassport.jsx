
import React, { useEffect, useState } from "react";
import { Container, Spinner, Card, Button, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AuthService from "../utils/auth.js";
import CommunicationPassport from "../components/CommunicationPassport.jsx";
import '../styles/Home.css';

const MyPassport = () => {
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPassport = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = AuthService.getToken();
        const res = await fetch("/api/passport/my-passport", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch passport");
        const data = await res.json();
        setPassport(data.passport);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPassport();
  }, []);


  if (loading) {
    return (
      <Container className="home-container text-center">
        <Spinner animation="border" />
        <p>Loading your passport...</p>
      </Container>
    );
  }
  if (error) {
    return (
      <Container className="home-container text-center">
        <Card className="home-card p-4">
          <h4>Error</h4>
          <p>{error}</p>
        </Card>
      </Container>
    );
  }
  if (!passport) {
    return (
      <Container className="home-container text-center">
        <Card className="home-card p-4">
          <h4>No Passport Found</h4>
          <p>You have not created a Communication Passport yet.</p>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="home-container py-4">
      <div className="d-flex justify-content-end mb-3 gap-2">
        {!passport.profilePhoto && (
          <Alert variant="info" className="mb-0 py-2 px-3 d-flex align-items-center gap-2" style={{ fontSize: '0.875rem' }}>
            <FontAwesomeIcon icon="camera" />
            <span>Add a photo to your passport — <Link to="/create-passport">Edit Passport</Link></span>
          </Alert>
        )}
        <Link to="/create-passport" className="btn btn-outline-primary btn-sm" style={{ borderRadius: '20px', whiteSpace: 'nowrap' }}>
          <FontAwesomeIcon icon="edit" className="me-1" />
          Edit Passport
        </Link>
      </div>
      <CommunicationPassport
        passport={passport}
        showQRModal={showQRModal}
        setShowQRModal={setShowQRModal}
        isOwner={true}
        passcode={passport.profilePasscode}
        viewCount={passport.passportViewCount}
      />
    </Container>
  );
};

export default MyPassport;
