import React, { useState, useCallback } from "react";
import {
  Row,
  Col,
  Card,
  Badge,
  Alert,
  Button,
  Modal,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import QRCode from "qrcode";
import "../styles/SafetyPlan.css";
import "../styles/ViewPassport.css";

const SafetyPlanDisplay = ({ plan, isOwner = false }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [qrDataURL, setQrDataURL] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const shareURL = plan?.crisisPasscode
    ? `${window.location.origin}/safety-plan/view/${plan.crisisPasscode}`
    : null;

  const openShareModal = useCallback(async () => {
    setShowShareModal(true);
    if (shareURL && !qrDataURL) {
      try {
        const url = await QRCode.toDataURL(shareURL, {
          width: 280,
          margin: 2,
          color: { dark: "#c0392b", light: "#ffffff" },
        });
        setQrDataURL(url);
      } catch {
        // QR generation failure is non-fatal — link still works
      }
    }
  }, [shareURL, qrDataURL]);

  const handleCopyLink = () => {
    if (!shareURL) return;
    navigator.clipboard.writeText(shareURL).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  const downloadQR = () => {
    if (!qrDataURL) return;
    const a = document.createElement("a");
    a.href = qrDataURL;
    a.download = "safety-plan-qr-code.png";
    a.click();
  };

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
                  {isOwner && shareURL && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={openShareModal}
                    >
                      <FontAwesomeIcon icon="share-alt" className="me-1" />
                      Share
                    </Button>
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

              {/* Prompt to set passcode if owner has none */}
              {isOwner && !shareURL && (
                <div className="mt-2 no-print">
                  <small className="text-muted">
                    <FontAwesomeIcon icon="link" className="me-1" />
                    No sharing passcode set.{" "}
                    <Link to="/create-safety-plan" className="text-danger">
                      Edit your plan
                    </Link>{" "}
                    to add one and enable sharing.
                  </small>
                </div>
              )}
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

      {/* Share Modal */}
      <Modal show={showShareModal} onHide={() => setShowShareModal(false)} centered>
        <Modal.Header closeButton style={{ background: "#c0392b", color: "#fff" }}>
          <Modal.Title>
            <FontAwesomeIcon icon="share-alt" className="me-2" />
            Share Safety Plan
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-4">
          <p className="text-muted mb-3">
            Anyone with this link or QR code can view your Safety Plan.
            Only share with people you trust.
          </p>

          {/* Share link */}
          <div className="mb-3">
            <div
              className="d-flex align-items-center gap-2 p-2 rounded"
              style={{ background: "#f8d7da", border: "1px solid #f5c6cb" }}
            >
              <small className="text-break flex-grow-1 text-start" style={{ wordBreak: "break-all" }}>
                {shareURL}
              </small>
              <Button
                size="sm"
                variant={copySuccess ? "success" : "danger"}
                onClick={handleCopyLink}
                style={{ whiteSpace: "nowrap" }}
              >
                <FontAwesomeIcon icon={copySuccess ? "check" : "copy"} className="me-1" />
                {copySuccess ? "Copied!" : "Copy"}
              </Button>
            </div>
            <small className="text-muted">
              Passcode: <strong>{plan.crisisPasscode}</strong>
            </small>
          </div>

          {/* QR Code */}
          {qrDataURL ? (
            <>
              <img
                src={qrDataURL}
                alt="Safety Plan QR Code"
                style={{ maxWidth: 220, border: "4px solid #c0392b", borderRadius: 8 }}
                className="mb-3"
              />
              <div>
                <Button variant="outline-danger" size="sm" onClick={downloadQR}>
                  <FontAwesomeIcon icon="download" className="me-1" />
                  Download QR Code
                </Button>
              </div>
            </>
          ) : (
            <div className="text-muted small">Generating QR code...</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowShareModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Row>
  );
};

export default SafetyPlanDisplay;
