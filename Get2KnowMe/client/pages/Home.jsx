import React from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AuthService from "../utils/auth.js";
import "../styles/Home.css";

const FEATURES = [
  { icon: 'comments',    title: 'Easy Sharing',    desc: 'Generate QR codes to instantly share your passport with anyone.' },
  { icon: 'user-shield', title: 'Privacy Focused',  desc: 'Control exactly what information you share and with whom.' },
  { icon: 'mobile-alt',  title: 'Mobile Friendly',  desc: 'Access your passport anywhere, on any device.' },
  { icon: 'heart',       title: 'Be Understood',    desc: 'Help others understand and support your communication needs.' },
];

const STEPS = [
  { num: '1', title: 'Create Account',    desc: 'Sign up for free and start building your Communication Passport.' },
  { num: '2', title: 'Build Your Passport', desc: 'Fill in your communication preferences, needs, and contact information.' },
  { num: '3', title: 'Share & Connect',   desc: 'Generate a QR code or direct link to share with anyone, anywhere.' },
];

const Home = () => {
  let user = null;
  try {
    user = AuthService.getProfile();
  } catch {
    user = null;
  }

  return (
    <div className="home-page">
      {/* Full-width hero */}
      <section className="hero-section">
        <div className="hero-inner">
          <img src="/get2knowme_logo_png.png" alt="Get2KnowMe" className="hero-logo" />
          <h1 className="hero-tagline">Be understood. On your own terms.</h1>
          <p className="hero-description">
            A Digital Communication Passport that helps others understand how you communicate —
            shared instantly with a QR code.
          </p>
          {user ? (
            <Link to="/profile" className="cta-button large">
              <FontAwesomeIcon icon="user" />
              Go to My Profile
            </Link>
          ) : (
            <div className="hero-ctas">
              <Link to="/register" className="cta-button large">
                <FontAwesomeIcon icon="user-plus" />
                Get Started — it's free
              </Link>
              <Link to="/passport-lookup" className="cta-button ghost">
                <FontAwesomeIcon icon="search" />
                View a Passport
              </Link>
            </div>
          )}
        </div>
      </section>

      <Container className="home-content py-5">
        <Row className="justify-content-center">
          <Col lg={9}>

            {/* What is Get2KnowMe */}
            <Card className="home-card mb-4">
              <Card.Body className="p-5">
                <h2 className="section-heading">What is Get2KnowMe?</h2>
                <p className="section-lead">
                  Get2KnowMe helps people be seen for who they are — not just their diagnosis.
                  It's a simple, secure platform that helps you communicate your needs,
                  preferences, and personality, especially when words are difficult to find.
                </p>
                <p className="mt-3 mb-0">
                  Having to explain yourself repeatedly can be exhausting, especially in
                  high-stress situations. Get2KnowMe gives you a voice — even in times when
                  it may be hard to speak.
                </p>
              </Card.Body>
            </Card>

            {/* What is a Communication Passport */}
            <Card className="home-card mb-4">
              <Card.Body className="p-5">
                <h2 className="section-heading">What is a Communication Passport?</h2>
                <p className="section-lead">
                  A personalised document that tells others how you communicate best — your
                  preferences, needs, and what support is most helpful.
                </p>
                <Row className="mt-4">
                  <Col md={6} className="mb-4 mb-md-0">
                    <h5 className="mb-3">
                      <FontAwesomeIcon icon="lightbulb" className="me-2" style={{ color: 'var(--primary-color)' }} />
                      What's Included
                    </h5>
                    <ul className="feature-list-simple">
                      <li>Important health alerts</li>
                      <li>Communication preferences and style</li>
                      <li>Sensory needs and accommodations</li>
                      <li>Emergency trusted contact</li>
                      <li>Triggers and how to avoid them</li>
                      <li>Helpful strategies for interaction</li>
                      <li>Personal interests and strengths</li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <h5 className="mb-3">
                      <FontAwesomeIcon icon="users" className="me-2" style={{ color: 'var(--primary-color)' }} />
                      Who Can Benefit
                    </h5>
                    <ul className="feature-list-simple">
                      <li>Neurodivergent individuals (autistic, ADHD)</li>
                      <li>Those with speech or language differences</li>
                      <li>People with intellectual or cognitive disabilities</li>
                      <li>Children, teens, and adults</li>
                      <li>Anyone who wants to be better understood</li>
                      <li>Allies, caregivers, and support professionals</li>
                    </ul>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Key Features */}
            <Card className="home-card mb-4">
              <Card.Body className="p-5">
                <h2 className="section-heading">Key Features</h2>
                <Row className="mt-4">
                  {FEATURES.map(({ icon, title, desc }) => (
                    <Col sm={6} lg={3} key={title} className="mb-4">
                      <div className="feature-card">
                        <div className="feature-icon-large">
                          <FontAwesomeIcon icon={icon} />
                        </div>
                        <h5>{title}</h5>
                        <p>{desc}</p>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>

            {/* How It Works */}
            <Card className="home-card mb-5">
              <Card.Body className="p-5">
                <h2 className="section-heading">How It Works</h2>
                <Row className="mt-4">
                  {STEPS.map(({ num, title, desc }) => (
                    <Col md={4} key={num} className="mb-4">
                      <div className="step-card text-center">
                        <div className="step-number">{num}</div>
                        <h5>{title}</h5>
                        <p>{desc}</p>
                      </div>
                    </Col>
                  ))}
                </Row>
                {!user && (
                  <div className="text-center mt-3">
                    <Link to="/register" className="cta-button">
                      <FontAwesomeIcon icon="rocket" />
                      Create Your Passport
                    </Link>
                    <p className="text-muted mt-3 mb-0">
                      Already have an account?{' '}
                      <Link to="/login" className="text-primary fw-medium">Sign in here</Link>
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>

          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Home;
