import React from "react";
import {
  Row,
  Col,
  Card,
  Badge,
  Alert,
  Button,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../styles/SafetyPlan.css";
import "../styles/ViewPassport.css";

const SafetyPlanDisplay = ({
  plan,
  isOwner = false,
  showQRModal,
  setShowQRModal,
}) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Row className="justify-content-center">
      <Col lg={8} xl={6}>
        <Card className="safety-plan-card">
          <Card.Header className="safety-plan-header text-center">
            <FontAwesomeIcon
              icon="shield-alt"
              style={{ fontSize: "3rem", opacity: 0.9 }}
              className="mb-2 d-block mx-auto"
            />
            <h2>Safety &amp; Crisis Plan</h2>
            <Badge bg="danger">Crisis Support Document</Badge>
          </Card.Header>

          <Card.Body className="p-4">
            {/* Warning Signs */}
            {plan.warningSigns && plan.warningSigns.trim() !== "" && (
              <div className="safety-plan-section mb-4">
                <div className="section-header">
                  <FontAwesomeIcon
                    icon="exclamation-triangle"
                    className="section-icon text-warning"
                  />
                  <h4 className="section-title">Warning Signs</h4>
                </div>
                <div className="section-content">
                  <div className="other-info-box">{plan.warningSigns}</div>
                </div>
              </div>
            )}

            {/* Triggers */}
            {plan.triggers && plan.triggers.trim() !== "" && (
              <div className="safety-plan-section mb-4">
                <div className="section-header">
                  <FontAwesomeIcon
                    icon="bolt"
                    className="section-icon text-danger"
                  />
                  <h4 className="section-title">Triggers</h4>
                </div>
                <div className="section-content">
                  <div className="triggers-box">
                    <FontAwesomeIcon
                      icon="exclamation-circle"
                      className="me-2 text-danger"
                    />
                    {plan.triggers}
                  </div>
                </div>
              </div>
            )}

            {/* What to Do */}
            {plan.whatToDo && plan.whatToDo.trim() !== "" && (
              <div className="safety-plan-section mb-4">
                <div className="section-header">
                  <FontAwesomeIcon
                    icon="check-circle"
                    className="section-icon text-success"
                  />
                  <h4 className="section-title">What to Do</h4>
                </div>
                <div className="section-content">
                  <div className="likes-box">
                    <FontAwesomeIcon
                      icon="check-circle"
                      className="me-2 text-success"
                    />
                    {plan.whatToDo}
                  </div>
                </div>
              </div>
            )}

            {/* What Not to Do */}
            {plan.whatNotToDo && plan.whatNotToDo.trim() !== "" && (
              <div className="safety-plan-section mb-4">
                <div className="section-header">
                  <FontAwesomeIcon
                    icon="times-circle"
                    className="section-icon text-danger"
                  />
                  <h4 className="section-title">What Not to Do</h4>
                </div>
                <div className="section-content">
                  <div className="avoid-words-box">{plan.whatNotToDo}</div>
                </div>
              </div>
            )}

            {/* Safe Spaces */}
            {plan.safeSpaces && plan.safeSpaces.trim() !== "" && (
              <div className="safety-plan-section mb-4">
                <div className="section-header">
                  <FontAwesomeIcon
                    icon="heart"
                    className="section-icon text-primary"
                  />
                  <h4 className="section-title">Safe Spaces</h4>
                </div>
                <div className="section-content">
                  <div className="other-info-box">{plan.safeSpaces}</div>
                </div>
              </div>
            )}

            {/* Safe Contacts */}
            {plan.safeContacts && plan.safeContacts.length > 0 && (
              <div className="safety-plan-section mb-4">
                <div className="section-header">
                  <FontAwesomeIcon
                    icon="users"
                    className="section-icon text-primary"
                  />
                  <h4 className="section-title">Safe Contacts</h4>
                </div>
                <div className="section-content">
                  {plan.safeContacts.map((contact, index) => (
                    <div key={index} className="contact-card">
                      <div className="d-flex align-items-start gap-2">
                        <span className="contact-priority mt-1">
                          {index + 1}
                        </span>
                        <div className="flex-grow-1">
                          <div className="mb-1">
                            <strong>{contact.name}</strong>
                            {contact.relationship && (
                              <span className="text-muted ms-2 small">
                                {contact.relationship}
                              </span>
                            )}
                          </div>
                          {contact.phone && (
                            <div className="small">
                              <FontAwesomeIcon
                                icon="phone"
                                className="me-1 text-muted"
                              />
                              <a href={`tel:${contact.phone}`}>
                                {contact.phone}
                              </a>
                            </div>
                          )}
                          {contact.email && (
                            <div className="small">
                              <FontAwesomeIcon
                                icon="envelope"
                                className="me-1 text-muted"
                              />
                              <a href={`mailto:${contact.email}`}>
                                {contact.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* After a Crisis */}
            {plan.afterCrisisNeeds && plan.afterCrisisNeeds.trim() !== "" && (
              <div className="safety-plan-section mb-4">
                <div className="section-header">
                  <FontAwesomeIcon
                    icon="heart"
                    className="section-icon text-success"
                  />
                  <h4 className="section-title">After a Crisis</h4>
                </div>
                <div className="section-content">
                  <div className="likes-box">{plan.afterCrisisNeeds}</div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="passport-footer mt-4 pt-3 border-top">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <small className="text-muted d-block">
                    <FontAwesomeIcon icon="clock" className="me-1" />
                    Last updated: {formatDate(plan.updatedAt)}
                  </small>
                </div>
                <div className="d-flex gap-2 no-print flex-wrap">
                  {isOwner && (
                    <Link
                      to="/create-safety-plan"
                      className="btn btn-outline-danger btn-sm"
                    >
                      <FontAwesomeIcon icon="edit" className="me-1" />
                      Edit Plan
                    </Link>
                  )}
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => window.print()}
                  >
                    <FontAwesomeIcon icon="print" className="me-1" />
                    Print / Save PDF
                  </Button>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        <Alert variant="danger" className="mt-3 text-center">
          <FontAwesomeIcon icon="exclamation-triangle" className="me-1" />
          This document contains sensitive personal information. Only share
          with trusted individuals and professionals involved in this
          person&apos;s care.
        </Alert>
      </Col>
    </Row>
  );
};

export default SafetyPlanDisplay;
