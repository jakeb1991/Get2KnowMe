import React, { useState, useEffect, useRef } from "react";
import {
  Form,
  Button,
  Container,
  Row,
  Col,
  Alert,
  Card,
  ProgressBar,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate, Link } from "react-router-dom";
import { parsePhoneNumber } from "libphonenumber-js";
import auth from "../utils/auth.js";
import PhoneNumberInput from "../components/PhoneNumberInput.jsx";
import { validatePhoneNumber } from "../utils/phoneUtils.js";
import "../styles/CreatePassport.css";
import "../styles/PhoneNumberInput.css";

const STEPS = [
  { number: 1, label: "Warning Signs" },
  { number: 2, label: "During a Crisis" },
  { number: 3, label: "Support Network" },
];

const emptyContact = () => ({
  name: "",
  phone: "",
  countryCode: "GB",
  relationship: "",
  email: "",
});

const CreateSafetyPlan = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const alertRef = useRef(null);

  const [formData, setFormData] = useState({
    thingsOfHope: "",
    warningSigns: "",
    triggers: "",
    safetyActions: "",
    whatToDo: "",
    whatNotToDo: "",
    safeSpaces: "",
    safeContacts: [],
    afterCrisisNeeds: "",
    crisisPasscode: "",
  });

  useEffect(() => {
    if (!auth.loggedIn()) {
      navigate("/login");
      return;
    }
    loadExistingPlan();
  }, [navigate]);

  const loadExistingPlan = async () => {
    try {
      const token = auth.getToken();
      const response = await fetch("/api/safety-plan/my-plan", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Spread defaults first so any field missing from the server response
        // (e.g. newly added fields not yet in an older saved plan) stays as ""
        // rather than undefined, which would make those inputs uncontrolled.
        const planData = {
          thingsOfHope: "",
          warningSigns: "",
          triggers: "",
          safetyActions: "",
          whatToDo: "",
          whatNotToDo: "",
          safeSpaces: "",
          safeContacts: [],
          afterCrisisNeeds: "",
          crisisPasscode: "",
          ...data.plan,
          safeContacts: (data.plan.safeContacts || []).map((c) => ({
            ...c,
            countryCode: c.countryCode || "GB",
          })),
        };
        setFormData(planData);
        setIsEditing(true);
      }
    } catch (err) {
      console.error("Error loading existing safety plan:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.safeContacts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, safeContacts: updated };
    });
  };

  const handleContactPhoneChange = (index, phoneValue) => {
    handleContactChange(index, "phone", phoneValue || "");
  };

  const handleContactCountryChange = (index, countryCode) => {
    if (!countryCode && formData.safeContacts[index]?.phone) {
      try {
        const parsed = parsePhoneNumber(formData.safeContacts[index].phone);
        countryCode = parsed?.country || "GB";
      } catch {
        countryCode = "GB";
      }
    }
    if (!countryCode || typeof countryCode !== "string") countryCode = "GB";
    handleContactChange(index, "countryCode", countryCode.toUpperCase());
  };

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      safeContacts: [...prev.safeContacts, emptyContact()],
    }));
  };

  const removeContact = (index) => {
    setFormData((prev) => ({
      ...prev,
      safeContacts: prev.safeContacts.filter((_, i) => i !== index),
    }));
  };

  const validateStep = (stepNumber) => {
    setError("");
    if (stepNumber === 3) {
      const hasNamedContact = formData.safeContacts.some(
        (c) => c.name && c.name.trim() !== ""
      );
      if (!hasNamedContact) {
        setError("Please add at least one safe contact with a name.");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    } else if (alertRef.current) {
      alertRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const prevStep = () => {
    setError("");
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(3)) {
      if (alertRef.current) alertRef.current.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setIsLoading(true);
    try {
      const response = await auth.authenticatedFetch("/api/safety-plan/create", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(
          `Safety Plan ${isEditing ? "updated" : "created"} successfully!`
        );
        setIsEditing(true);
        setTimeout(
          () => alertRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      } else {
        setError(data.message || "Failed to save Safety Plan");
        setTimeout(
          () => alertRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      }
    } catch (err) {
      setError("Server error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const progress = ((step - 1) / STEPS.length) * 100;

  return (
    <Container className="create-passport-container py-5">
      <Row className="justify-content-center">
        <Col lg={8} xl={6}>
          <Card className="passport-card">
            <Card.Body className="p-4">
              <div ref={alertRef}></div>

              <h2 className="passport-title text-center mb-2">
                {isEditing ? "Update" : "Create"} Your Safety &amp; Crisis Plan
              </h2>
              <p className="text-muted text-center mb-4">
                This plan helps people around you support you effectively during
                a crisis.
              </p>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  {STEPS.map((s) => (
                    <small
                      key={s.number}
                      className={`fw-semibold ${
                        step >= s.number ? "text-danger" : "text-muted"
                      }`}
                    >
                      {s.number}. {s.label}
                    </small>
                  ))}
                </div>
                <ProgressBar
                  now={progress + 100 / STEPS.length}
                  style={{ height: "8px" }}
                  variant="danger"
                />
              </div>

              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit}>
                {/* ── STEP 1: Warning Signs ── */}
                {step === 1 && (
                  <>
                    <p className="text-muted small mb-3">
                      All fields are optional — add as much or as little as you
                      like.
                    </p>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Things that give me hope</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="thingsOfHope"
                          value={formData.thingsOfHope}
                          onChange={handleInputChange}
                          placeholder="Things you love, look forward to, or find uplifting — reasons to keep going. e.g. My family, my pet, the feeling after a walk, music..."
                        />
                        <Form.Text className="text-muted">
                          Your personal strengths, reasons for hope, and protective factors.
                        </Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Warning Signs</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="warningSigns"
                          value={formData.warningSigns}
                          onChange={handleInputChange}
                          placeholder="How do people know when you are starting to struggle? e.g. I go quiet, I pace, I stop making eye contact..."
                        />
                        <Form.Text className="text-muted">
                          Early signs that a crisis may be developing.
                        </Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Triggers</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="triggers"
                          value={formData.triggers}
                          onChange={handleInputChange}
                          placeholder="What situations, environments, or events can lead to a crisis for you?..."
                        />
                        <Form.Text className="text-muted">
                          Things that can cause or escalate a crisis.
                        </Form.Text>
                      </Form.Group>
                    </div>
                  </>
                )}

                {/* ── STEP 2: During a Crisis ── */}
                {step === 2 && (
                  <>
                    <p className="text-muted small mb-3">
                      Help others understand how to support you effectively.
                    </p>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>What helpers should DO</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="whatToDo"
                          value={formData.whatToDo}
                          onChange={handleInputChange}
                          placeholder="e.g. Speak calmly and slowly, give me space, sit near me quietly, use my name..."
                        />
                        <Form.Text className="text-muted">
                          Actions that help during a crisis.
                        </Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>What helpers should NOT do</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="whatNotToDo"
                          value={formData.whatNotToDo}
                          onChange={handleInputChange}
                          placeholder="e.g. Do not shout, do not touch me without asking, do not crowd me, do not make sudden loud noises..."
                        />
                        <Form.Text className="text-muted">
                          Things to avoid during a crisis.
                        </Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Safe Spaces &amp; Things</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="safeSpaces"
                          value={formData.safeSpaces}
                          onChange={handleInputChange}
                          placeholder="e.g. A quiet room, my bedroom, outside in the garden, my weighted blanket, my headphones..."
                        />
                        <Form.Text className="text-muted">
                          Places or objects that bring calm and safety.
                        </Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Things I can do to keep myself safe</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="safetyActions"
                          value={formData.safetyActions}
                          onChange={handleInputChange}
                          placeholder="Steps to make your environment safer. e.g. Give my car keys to a trusted person, ask someone to stay with me, go somewhere with other people, remove items I could use to harm myself..."
                        />
                        <Form.Text className="text-muted">
                          Practical actions to reduce risk and keep yourself safe during a crisis.
                        </Form.Text>
                      </Form.Group>
                    </div>
                  </>
                )}

                {/* ── STEP 3: Support Network ── */}
                {step === 3 && (
                  <>
                    <p className="text-muted small mb-3">
                      Fields marked <span className="text-danger">*</span> are
                      required.
                    </p>

                    <div className="form-section mb-4">
                      <h5 className="mb-1">
                        Safe Contacts{" "}
                        <span className="text-danger">*</span>
                      </h5>
                      <p className="small text-muted mb-3">
                        People who can be contacted during a crisis. At least
                        one contact with a name is required.
                      </p>

                      {formData.safeContacts.map((contact, index) => (
                        <Card
                          key={index}
                          className="mb-3 border"
                          style={{ borderColor: "#f5c6cb" }}
                        >
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <strong className="text-danger">
                                Contact {index + 1}
                              </strong>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => removeContact(index)}
                              >
                                <FontAwesomeIcon icon="times" className="me-1" />
                                Remove
                              </Button>
                            </div>

                            <Row>
                              <Col md={6}>
                                <Form.Group className="mb-2">
                                  <Form.Label className="small">Name</Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={contact.name}
                                    onChange={(e) =>
                                      handleContactChange(
                                        index,
                                        "name",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Full name"
                                    size="sm"
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group className="mb-2">
                                  <Form.Label className="small">
                                    Relationship
                                  </Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={contact.relationship}
                                    onChange={(e) =>
                                      handleContactChange(
                                        index,
                                        "relationship",
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g. Parent, Carer, Friend"
                                    size="sm"
                                  />
                                </Form.Group>
                              </Col>
                            </Row>

                            <PhoneNumberInput
                              value={contact.phone}
                              onChange={(val) =>
                                handleContactPhoneChange(index, val)
                              }
                              label="Phone"
                              placeholder="Enter phone number"
                              country={contact.countryCode}
                              onCountryChange={(code) =>
                                handleContactCountryChange(index, code)
                              }
                            />

                            <Form.Group className="mb-0">
                              <Form.Label className="small">
                                Email{" "}
                                <span className="text-muted">(optional)</span>
                              </Form.Label>
                              <Form.Control
                                type="email"
                                value={contact.email}
                                onChange={(e) =>
                                  handleContactChange(
                                    index,
                                    "email",
                                    e.target.value
                                  )
                                }
                                placeholder="Email address"
                                size="sm"
                              />
                            </Form.Group>
                          </Card.Body>
                        </Card>
                      ))}

                      <Button
                        type="button"
                        variant="outline-danger"
                        size="sm"
                        onClick={addContact}
                        className="mb-4"
                      >
                        <FontAwesomeIcon icon="plus" className="me-1" />
                        Add Contact
                      </Button>
                    </div>

                    <div className="form-section mb-4">
                      <Form.Group>
                        <Form.Label>After a Crisis</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="afterCrisisNeeds"
                          value={formData.afterCrisisNeeds}
                          onChange={handleInputChange}
                          placeholder="What do you need after a crisis has passed? e.g. Time alone, a familiar routine, no questions, a favourite meal..."
                        />
                        <Form.Text className="text-muted">
                          What helps you recover after a difficult episode.
                        </Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-4">
                      <h5 className="mb-1">
                        Sharing Passcode{" "}
                        <span className="text-muted small fw-normal">
                          (optional)
                        </span>
                      </h5>
                      <Form.Group>
                        <Form.Control
                          type="text"
                          name="crisisPasscode"
                          value={formData.crisisPasscode}
                          onChange={handleInputChange}
                          placeholder="e.g. MyPlan123"
                          className="text-uppercase"
                        />
                        <Form.Text className="text-muted">
                          Leave blank to keep this plan private. Set a passcode
                          to share it.
                        </Form.Text>
                      </Form.Group>
                    </div>
                  </>
                )}

                {/* Navigation buttons */}
                <div className="d-flex justify-content-between align-items-center mt-4 flex-wrap gap-2">
                  <div className="d-flex gap-2">
                    {step > 1 && (
                      <Button
                        variant="outline-secondary"
                        onClick={prevStep}
                      >
                        ← Back
                      </Button>
                    )}
                  </div>

                  {step < STEPS.length ? (
                    <Button
                      className="passport-submit-btn"
                      style={{ background: "#dc3545", borderColor: "#dc3545" }}
                      onClick={nextStep}
                    >
                      Next →
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="passport-submit-btn"
                      style={{ background: "#dc3545", borderColor: "#dc3545" }}
                      disabled={isLoading}
                    >
                      {isLoading
                        ? isEditing
                          ? "Updating..."
                          : "Creating..."
                        : isEditing
                        ? "Update Safety Plan"
                        : "Create Safety Plan"}
                    </Button>
                  )}
                </div>
              </Form>

              {/* Post-save actions */}
              {isEditing && success && (
                <div className="d-flex gap-2 justify-content-center flex-wrap mt-3">
                  <Link to="/my-safety-plan" className="btn btn-danger">
                    View My Safety Plan
                  </Link>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CreateSafetyPlan;
