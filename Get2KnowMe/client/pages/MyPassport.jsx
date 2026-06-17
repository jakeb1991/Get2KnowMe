
import React, { useEffect, useState } from "react";
import { Container, Spinner, Card } from "react-bootstrap";
import AuthService from "../utils/auth.js";
import CommunicationPassport from "../components/CommunicationPassport.jsx";

const MyPassport = () => {
  const [passport, setPassport] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
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
        setProfilePhoto(data.profilePhoto || null);
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
    <div style={{ background: 'var(--bg-color)', minHeight: '100vh', padding: '2rem 0' }}>
      <Container className="py-4">
        <CommunicationPassport
          passport={passport}
          profilePhoto={profilePhoto}
          showQRModal={showQRModal}
          setShowQRModal={setShowQRModal}
          isOwner={true}
          passcode={passport.profilePasscode}
          viewCount={passport.passportViewCount}
        />
      </Container>
    </div>
  );
};

export default MyPassport;
