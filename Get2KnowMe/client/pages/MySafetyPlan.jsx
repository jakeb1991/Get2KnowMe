import React, { useEffect, useState } from "react";
import { Container, Spinner, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import AuthService from "../utils/auth.js";
import SafetyPlanDisplay from "../components/SafetyPlanDisplay.jsx";

const MySafetyPlan = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlan = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = AuthService.getToken();
        const res = await fetch("/api/safety-plan/my-plan", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch safety plan");
        const data = await res.json();
        setPlan(data.plan);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, []);

  if (loading) {
    return (
      <Container className="home-container text-center">
        <Spinner animation="border" />
        <p>Loading your safety plan...</p>
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

  if (!plan) {
    return (
      <Container className="home-container text-center">
        <Card className="home-card p-4">
          <h4>No Safety Plan Found</h4>
          <p>You have not created a Safety &amp; Crisis Plan yet.</p>
          <Link to="/create-safety-plan" className="btn btn-danger">
            Create your Safety Plan
          </Link>
        </Card>
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
        <SafetyPlanDisplay plan={plan} isOwner={true} />
      </Container>
    </div>
  );
};

export default MySafetyPlan;
