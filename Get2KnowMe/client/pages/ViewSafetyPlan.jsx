import React, { useState, useEffect } from "react";
import { Container, Spinner, Alert, Button } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import SafetyPlanDisplay from "../components/SafetyPlanDisplay.jsx";

const ViewSafetyPlan = () => {
  const { passcode } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [passcode]);

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (passcode) {
      fetchPlan(passcode);
    } else {
      setError("No passcode provided");
      setLoading(false);
    }
  }, [passcode]);

  const fetchPlan = async (code) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/safety-plan/view/${code}`);

      if (response.ok) {
        const data = await response.json();
        setPlan(data.plan);
      } else if (response.status === 404) {
        setError(
          "Safety Plan not found. Please check the passcode and try again."
        );
      } else {
        setError("Unable to load Safety Plan. Please try again later.");
      }
    } catch (err) {
      console.error("Error fetching safety plan:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="view-passport-container d-flex justify-content-center align-items-center">
        <div className="text-center">
          <Spinner animation="border" variant="danger" size="lg" />
          <p className="mt-3 text-muted">Loading Safety Plan...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="view-passport-container">
        <Alert variant="danger" className="text-center mt-4">
          <Alert.Heading>Unable to Load Safety Plan</Alert.Heading>
          <p>{error}</p>
          <Button
            variant="outline-danger"
            onClick={() => navigate("/")}
            className="btn-secondary"
          >
            Return to Homepage
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!plan) {
    return (
      <Container className="view-passport-container">
        <Alert variant="warning" className="text-center mt-4">
          <Alert.Heading>Safety Plan Not Found</Alert.Heading>
          <p>The requested Safety Plan could not be found.</p>
          <Button
            variant="outline-warning"
            onClick={() => navigate("/")}
            className="btn-secondary"
          >
            Return to Homepage
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <div
      style={{
        background: "var(--bg-color)",
        minHeight: "100vh",
        padding: "2rem 0",
      }}
    >
      <Container className="py-4">
        <SafetyPlanDisplay plan={plan} isOwner={false} />
      </Container>
    </div>
  );
};

export default ViewSafetyPlan;
